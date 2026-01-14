import io
import json
import os
import threading
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional

import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wav
from dotenv import load_dotenv
import google.generativeai as genai
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

DEFAULT_KEY_PATH = os.path.join(os.path.dirname(__file__), "google_key.json")
credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if credentials_path and not os.path.exists(credentials_path):
    print(f"Credentials file not found at {credentials_path}; falling back to {DEFAULT_KEY_PATH}", flush=True)
    credentials_path = None
if not credentials_path and os.path.exists(DEFAULT_KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = DEFAULT_KEY_PATH

project_env = os.getenv("GOOGLE_PROJECT_ID") or os.getenv("PROJECT_ID")
PROJECT_ID = project_env.strip() if project_env else "project-93f4a126-e6c4-4f37-aab"

region_env = os.getenv("GOOGLE_REGION") or os.getenv("REGION")
REGION = region_env.strip() if region_env else "us-central1"

rate_env = os.getenv("AUDIO_SAMPLE_RATE") or os.getenv("SAMPLING_RATE") or os.getenv("RATE")
RATE = int(rate_env.strip()) if rate_env else 16000
LANGUAGES = [
    lang.strip()
    for lang in os.getenv("TRANSCRIPTION_LANGUAGES", "en-US,nl-NL,de-DE").split(",")
    if lang.strip()
]
MODEL = os.getenv("TRANSCRIPTION_MODEL", "long")
TRANSCRIPTION_CHUNK_SECONDS = int(os.getenv("TRANSCRIPTION_CHUNK_SECONDS", "55"))

SUMMARY_API_KEY = os.getenv("GOOGLE_SUMMARY_KEY") or os.getenv("GOOGLE_AI_API_KEY")
SUMMARY_MODEL = os.getenv("SUMMARY_MODEL", "models/gemini-2.5-flash")
SUMMARY_FALLBACK_MODEL = os.getenv("SUMMARY_FALLBACK_MODEL", "models/gemini-2.5-flash")
SUMMARY_TEMPERATURE = float(os.getenv("SUMMARY_TEMPERATURE", "0.3"))
SUMMARY_MAX_OUTPUT_TOKENS = int(os.getenv("SUMMARY_MAX_OUTPUT_TOKENS", "1200"))
SUMMARY_CHUNK_CHARS = int(os.getenv("SUMMARY_CHUNK_CHARS", "12000"))
TITLE_MODEL = os.getenv("TITLE_MODEL", SUMMARY_MODEL)
TITLE_FALLBACK_MODEL = os.getenv("TITLE_FALLBACK_MODEL", SUMMARY_MODEL)
TITLE_TEMPERATURE = float(os.getenv("TITLE_TEMPERATURE", "0.4"))
TITLE_MAX_OUTPUT_TOKENS = int(os.getenv("TITLE_MAX_OUTPUT_TOKENS", "24"))

if SUMMARY_API_KEY:
    genai.configure(api_key=SUMMARY_API_KEY)

recording_event = threading.Event()
audio_lock = threading.Lock()
audio_chunks: list[np.ndarray] = []
audio_stream: Optional[sd.InputStream] = None


def audio_callback(indata, frames, time_info, status):
    if status:
        print(f"Audio status: {status}", flush=True)
    if recording_event.is_set():
        with audio_lock:
            audio_chunks.append(indata.copy())


def ensure_stream() -> None:
    global audio_stream
    if audio_stream is None:
        audio_stream = sd.InputStream(
            samplerate=RATE,
            channels=1,
            dtype="int16",
            callback=audio_callback,
        )
        audio_stream.start()


def send_cors_headers(handler: BaseHTTPRequestHandler) -> None:
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")


def build_response(handler: BaseHTTPRequestHandler, status: int, payload: Dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    send_cors_headers(handler)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


speech_client = SpeechClient()


def _recognize_chunk(samples: np.ndarray) -> Dict[str, Any]:
    if samples.size == 0:
        return {"text": "", "language": None}

    byte_io = io.BytesIO()
    wav.write(byte_io, RATE, samples)
    audio_bytes = byte_io.getvalue()

    config = cloud_speech.RecognitionConfig(
        auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
        language_codes=LANGUAGES,
        model=MODEL,
        features=cloud_speech.RecognitionFeatures(enable_automatic_punctuation=True),
    )

    request = cloud_speech.RecognizeRequest(
        recognizer=f"projects/{PROJECT_ID}/locations/global/recognizers/_",
        config=config,
        content=audio_bytes,
    )

    response = speech_client.recognize(request=request)

    transcript_parts = []
    language = None
    for result in response.results:
        if result.alternatives:
            transcript_parts.append(result.alternatives[0].transcript)
            if language is None:
                language = result.language_code

    return {"text": " ".join(transcript_parts).strip(), "language": language}


def transcribe_audio(samples: np.ndarray) -> Dict[str, Any]:
    if samples.size == 0:
        return {"text": "", "language": None}

    chunk_seconds = max(1, TRANSCRIPTION_CHUNK_SECONDS)
    chunk_size = int(RATE * chunk_seconds)
    if samples.shape[0] <= chunk_size:
        return _recognize_chunk(samples)

    transcript_parts = []
    language = None
    for start in range(0, samples.shape[0], chunk_size):
        chunk = samples[start : start + chunk_size]
        result = _recognize_chunk(chunk)
        if result.get("text"):
            transcript_parts.append(result["text"])
        if language is None and result.get("language"):
            language = result["language"]

    return {"text": " ".join(transcript_parts).strip(), "language": language}


def _extract_text(response) -> tuple[str, Optional[int]]:
    summary_text = ""
    finish_reason = None

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        finish_reason = getattr(candidate, "finish_reason", None)
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) if content else None
        if not parts:
            continue
        text_parts = []
        for part in parts:
            text_value = getattr(part, "text", None)
            if text_value:
                text_parts.append(text_value)
        if text_parts:
            summary_text = " ".join(text_parts).strip()
            break

    return summary_text, finish_reason


def _fallback_summary_text(transcript: str, max_chars: int = 1200) -> str:
    collapsed = " ".join(transcript.split())
    if len(collapsed) <= max_chars:
        return collapsed

    snippet = collapsed[:max_chars]
    last_stop = max(snippet.rfind(". "), snippet.rfind("! "), snippet.rfind("? "))
    if last_stop > 120:
        return snippet[: last_stop + 1].strip()
    return snippet.rstrip() + "..."


def _split_transcript(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]

    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        if not sentence:
            continue
        sentence_len = len(sentence)

        if sentence_len > max_chars:
            if current:
                chunks.append(" ".join(current).strip())
                current = []
                current_len = 0
            for i in range(0, sentence_len, max_chars):
                chunks.append(sentence[i : i + max_chars].strip())
            continue

        if current_len + sentence_len + 1 > max_chars and current:
            chunks.append(" ".join(current).strip())
            current = [sentence]
            current_len = sentence_len
        else:
            current.append(sentence)
            current_len += sentence_len + 1

    if current:
        chunks.append(" ".join(current).strip())

    return [chunk for chunk in chunks if chunk]


def _generate_text_with_model(
    prompt: str,
    model_name: str,
    temperature: float,
    max_output_tokens: int,
) -> tuple[str, Optional[int]]:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        },
    )
    return _extract_text(response)


def summarize_transcript(transcript: str) -> str:
    if not SUMMARY_API_KEY:
        raise ValueError("Missing GOOGLE_SUMMARY_KEY for summarization.")

    text = transcript.strip()
    if not text:
        return ""

    chunks = _split_transcript(text, max(1000, SUMMARY_CHUNK_CHARS))
    chunk_summaries = []
    finish_reason = None

    if len(chunks) > 1:
        for idx, chunk in enumerate(chunks, start=1):
            chunk_prompt = (
                "Write a short FeedPulse-style paragraph (3-5 sentences) that captures this section clearly. "
                "Use natural narrative sentences like the examples: context, discussion points, decisions, "
                "responsibilities, challenges, and any numbers or dates. Preserve specific tools, components, "
                "or features mentioned. Do not add labels, headings, bullets, or commentary.\\n\\n"
                f"Section {idx}:\\n{chunk}"
            )
            chunk_text, finish_reason = _generate_text_with_model(
                chunk_prompt,
                SUMMARY_MODEL,
                SUMMARY_TEMPERATURE,
                SUMMARY_MAX_OUTPUT_TOKENS,
            )
            if not chunk_text and SUMMARY_FALLBACK_MODEL and SUMMARY_FALLBACK_MODEL != SUMMARY_MODEL:
                chunk_text, finish_reason = _generate_text_with_model(
                    chunk_prompt,
                    SUMMARY_FALLBACK_MODEL,
                    SUMMARY_TEMPERATURE,
                    SUMMARY_MAX_OUTPUT_TOKENS,
                )
            if not chunk_text:
                chunk_text = _fallback_summary_text(chunk, max_chars=400)
            chunk_summaries.append(chunk_text)

        combined = " ".join(chunk_summaries).strip()
        prompt = (
            "Write a FeedPulse reflection in 2-4 paragraphs, similar in tone and structure to the examples. "
            "Use natural, complete sentences and a cohesive narrative.\\n"
            "Paragraph 1: brief intro about the meeting/session (context, purpose, overall tone).\\n"
            "Paragraph 2: detailed discussion with concrete points, decisions, responsibilities, constraints, and "
            "specific tools/components/features mentioned. Include any numbers, dates, or targets when present.\\n"
            "Paragraph 3 (and optional 4): wrap up with key takeaways, challenges, and clear next steps.\\n"
            "Do not add labels, headings, bullets, or commentary. Avoid listing attendees unless essential.\\n\\n"
            f"Notes:\\n{combined}"
        )
    else:
        prompt = (
            "Write a FeedPulse reflection in 2-4 paragraphs, similar in tone and structure to the examples. "
            "Use natural, complete sentences and a cohesive narrative.\\n"
            "Paragraph 1: brief intro about the meeting/session (context, purpose, overall tone).\\n"
            "Paragraph 2: detailed discussion with concrete points, decisions, responsibilities, constraints, and "
            "specific tools/components/features mentioned. Include any numbers, dates, or targets when present.\\n"
            "Paragraph 3 (and optional 4): wrap up with key takeaways, challenges, and clear next steps.\\n"
            "Do not add labels, headings, bullets, or commentary. Avoid listing attendees unless essential.\\n\\n"
            f"Transcript:\\n{text}"
        )

    summary_text, finish_reason = _generate_text_with_model(
        prompt,
        SUMMARY_MODEL,
        SUMMARY_TEMPERATURE,
        SUMMARY_MAX_OUTPUT_TOKENS,
    )

    if not summary_text and SUMMARY_FALLBACK_MODEL and SUMMARY_FALLBACK_MODEL != SUMMARY_MODEL:
        summary_text, finish_reason = _generate_text_with_model(
            prompt,
            SUMMARY_FALLBACK_MODEL,
            SUMMARY_TEMPERATURE,
            SUMMARY_MAX_OUTPUT_TOKENS,
        )

    if not summary_text:
        reason = f"finish_reason={finish_reason}" if finish_reason is not None else "finish_reason=unknown"
        print(f"Summary returned no text ({reason}); using fallback summary.", flush=True)
        return _fallback_summary_text(text)

    return summary_text


def _fallback_title_text(transcript: str, max_words: int = 12) -> str:
    if not transcript:
        return "New Recording"

    first_sentence = re.split(r"(?<=[.!?])\s+", transcript.strip(), maxsplit=1)[0]
    words = first_sentence.split()
    if not words:
        return "New Recording"
    return " ".join(words[:max_words])


def generate_title(transcript: str) -> str:
    text = transcript.strip()
    if not text:
        return "New Recording"

    if not SUMMARY_API_KEY:
        return _fallback_title_text(text)

    prompt = (
        "Write one short sentence (8-12 words) that summarizes the transcript. "
        "Use sentence case, avoid names unless essential, and no quotes, labels, or trailing punctuation.\n\n"
        f"Transcript:\n{text}"
    )

    title_text, finish_reason = _generate_text_with_model(
        prompt,
        TITLE_MODEL,
        TITLE_TEMPERATURE,
        TITLE_MAX_OUTPUT_TOKENS,
    )

    if not title_text and TITLE_FALLBACK_MODEL and TITLE_FALLBACK_MODEL != TITLE_MODEL:
        fallback_prompt = (
            "Create a short neutral title (6-10 words) for this meeting transcript. "
            "Do not include names. Return only the title text with no quotes or trailing punctuation.\n\n"
            f"Transcript:\n{text}"
        )
        title_text, finish_reason = _generate_text_with_model(
            fallback_prompt,
            TITLE_FALLBACK_MODEL,
            TITLE_TEMPERATURE,
            TITLE_MAX_OUTPUT_TOKENS,
        )

    if not title_text:
        reason = f"finish_reason={finish_reason}" if finish_reason is not None else "finish_reason=unknown"
        print(f"Title returned no text ({reason}); using fallback title.", flush=True)
        return _fallback_title_text(text)

    cleaned = " ".join(title_text.split()).strip().strip("\"'").rstrip(".!?")
    return cleaned or _fallback_title_text(text)


def list_summary_models() -> list[str]:
    if not SUMMARY_API_KEY:
        raise ValueError("Missing GOOGLE_SUMMARY_KEY for summarization.")

    models = []
    for model in genai.list_models():
        if "generateContent" in getattr(model, "supported_generation_methods", []):
            models.append(model.name)
    return models


class TranscriptionHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        send_cors_headers(self)
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            build_response(
                self,
                200,
                {"ok": True, "recording": recording_event.is_set()},
            )
            return
        if self.path == "/summary/models":
            try:
                models = list_summary_models()
            except Exception as exc:
                build_response(self, 500, {"error": str(exc)})
                return
            build_response(self, 200, {"models": models})
            return
        build_response(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path == "/record/start":
            ensure_stream()
            with audio_lock:
                audio_chunks.clear()
            recording_event.set()
            build_response(self, 200, {"status": "recording"})
            return

        if self.path == "/record/stop":
            recording_event.clear()
            with audio_lock:
                chunks = list(audio_chunks)
                audio_chunks.clear()

            if not chunks:
                build_response(self, 400, {"error": "No audio recorded"})
                return

            samples = np.concatenate(chunks, axis=0)
            duration_seconds = float(len(samples) / RATE)

            try:
                result = transcribe_audio(samples)
            except Exception as exc:
                build_response(self, 500, {"error": str(exc)})
                return

            try:
                result["title"] = generate_title(result.get("text", ""))
            except Exception as exc:
                result["title"] = "New Recording"
                print(f"Title generation failed: {exc}", flush=True)

            result["duration_seconds"] = duration_seconds
            build_response(self, 200, result)
            return

        if self.path == "/summarize":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                build_response(self, 400, {"error": "Invalid JSON payload"})
                return

            transcript = payload.get("transcript", "")
            if not isinstance(transcript, str):
                build_response(self, 400, {"error": "Transcript must be a string"})
                return

            try:
                summary = summarize_transcript(transcript)
            except Exception as exc:
                build_response(self, 500, {"error": str(exc)})
                return

            build_response(self, 200, {"summary": summary})
            return

        if self.path == "/title":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                build_response(self, 400, {"error": "Invalid JSON payload"})
                return

            transcript = payload.get("transcript", "")
            if not isinstance(transcript, str):
                build_response(self, 400, {"error": "Transcript must be a string"})
                return

            try:
                title = generate_title(transcript)
            except Exception as exc:
                build_response(self, 500, {"error": str(exc)})
                return

            build_response(self, 200, {"title": title})
            return

        build_response(self, 404, {"error": "Not found"})

    def log_message(self, format: str, *args: Any) -> None:
        return


def run_server() -> None:
    host = os.getenv("AI_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("AI_SERVER_PORT", "8000"))
    ensure_stream()
    server = ThreadingHTTPServer((host, port), TranscriptionHandler)
    print(f"AI transcription server listening on http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        if audio_stream is not None:
            audio_stream.stop()
            audio_stream.close()


if __name__ == "__main__":
    run_server()
