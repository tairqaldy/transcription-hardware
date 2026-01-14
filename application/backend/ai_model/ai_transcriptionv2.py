import io
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional

import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wav
from dotenv import load_dotenv
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


def transcribe_audio(samples: np.ndarray) -> Dict[str, Any]:
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

            result["duration_seconds"] = duration_seconds
            build_response(self, 200, result)
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
