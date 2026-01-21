import io
import os

from flask import Flask, flash, redirect, render_template, request, url_for
from dotenv import load_dotenv
from supabase import create_client
import google.generativeai as genai
from google.cloud import speech

load_dotenv(override=True)

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_GOOGLE_KEY = os.path.join(APP_ROOT, "keys", "google_key.json")
configured_google_key = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if configured_google_key and not os.path.isfile(configured_google_key):
    configured_google_key = None

if not configured_google_key and os.path.isfile(DEFAULT_GOOGLE_KEY):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = DEFAULT_GOOGLE_KEY

BUCKET = os.getenv("SUPABASE_BUCKET", "audio")
SPEECH_FORCE_LONG_RUNNING = os.getenv("SPEECH_FORCE_LONG_RUNNING", "true").lower() not in (
    "0",
    "false",
    "no",
)


def get_supabase_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Missing SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
        )
    return create_client(url, key)


def get_gemini_model():
    api_key = os.getenv("GOOGLE_SUMMARY_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GOOGLE_SUMMARY_KEY (or GEMINI_API_KEY / GOOGLE_AI_API_KEY).")
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    return genai.GenerativeModel(model_name)


def summarize_transcript(text):
    model = get_gemini_model()
    prompt = (
        "Write a concise FeedPulse-style summary paragraph (1-3 sentences, max 3). "
        "Keep it brief and narrative: context, key points, decisions, responsibilities, "
        "challenges, and any numbers or dates. Preserve specific tools, components, or "
        "features mentioned. No labels, headings, bullets, or extra commentary.\n\n"
    )
    response = model.generate_content(prompt + text)
    summary = getattr(response, "text", "") or ""
    summary = summary.strip()
    if not summary:
        return "(No summary generated.)"
    suffix = "Summary done by Noting."
    if not summary.endswith(suffix):
        summary = f"{summary}\n\n{suffix}"
    return summary


def build_public_url(file_name):
    base_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    if not base_url:
        return None
    return f"{base_url.rstrip('/')}/storage/v1/object/public/{BUCKET}/{file_name}"


def list_audio_files(supabase_client):
    raw_files = supabase_client.storage.from_(BUCKET).list()
    formatted = []
    for item in raw_files:
        name = item.get("name")
        if not name:
            continue
        formatted.append(
            {
                "name": name,
                "size": item.get("metadata", {}).get("size"),
                "updated_at": item.get("updated_at") or item.get("created_at"),
                "public_url": build_public_url(name),
            }
        )
    return formatted


def detect_config(file_name, audio_bytes):
    ext = os.path.splitext(file_name)[1].lower()
    config_kwargs = {
        "language_code": os.getenv("TRANSCRIBE_LANGUAGE", "en-US"),
        "enable_automatic_punctuation": True,
    }

    encoding_map = {
        ".wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
        ".flac": speech.RecognitionConfig.AudioEncoding.FLAC,
        ".mp3": speech.RecognitionConfig.AudioEncoding.MP3,
        ".ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
        ".opus": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
        ".mulaw": speech.RecognitionConfig.AudioEncoding.MULAW,
    }

    if ext in encoding_map:
        config_kwargs["encoding"] = encoding_map[ext]

    if ext == ".wav":
        try:
            import wave

            with wave.open(io.BytesIO(audio_bytes), "rb") as wave_file:
                config_kwargs["sample_rate_hertz"] = wave_file.getframerate()
        except Exception:
            pass

    return speech.RecognitionConfig(**config_kwargs)


def build_transcript(response):
    transcript = " ".join(
        result.alternatives[0].transcript for result in response.results
    ).strip()
    return transcript or "(No speech detected.)"


def transcribe_audio(file_name, audio_bytes):
    speech_client = speech.SpeechClient()
    config = detect_config(file_name, audio_bytes)
    audio = speech.RecognitionAudio(content=audio_bytes)

    if not SPEECH_FORCE_LONG_RUNNING:
        response = speech_client.recognize(config=config, audio=audio)
        return build_transcript(response)

    timeout_seconds = int(os.getenv("SPEECH_LONG_RUNNING_TIMEOUT", "600"))
    operation = speech_client.long_running_recognize(config=config, audio=audio)
    response = operation.result(timeout=timeout_seconds)
    return build_transcript(response)


app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-me")


@app.get("/")
def index():
    supabase_client = get_supabase_client()
    files = list_audio_files(supabase_client)
    return render_template("index.html", files=files)


@app.post("/transcribe")
def transcribe():
    file_name = request.form.get("file_name")
    if not file_name:
        flash("Missing file name.", "error")
        return redirect(url_for("index"))

    supabase_client = get_supabase_client()

    try:
        audio_bytes = supabase_client.storage.from_(BUCKET).download(file_name)
    except Exception as exc:
        flash(f"Failed to download {file_name}: {exc}", "error")
        return redirect(url_for("index"))

    try:
        transcript = transcribe_audio(file_name, audio_bytes)
    except Exception as exc:
        flash(f"Transcription failed: {exc}", "error")
        return redirect(url_for("index"))

    files = list_audio_files(supabase_client)
    return render_template(
        "index.html",
        files=files,
        transcript=transcript,
        transcript_file=file_name,
    )


@app.post("/summarize")
def summarize():
    transcript = request.form.get("transcript")
    file_name = request.form.get("file_name")
    if not transcript:
        flash("Missing transcript text.", "error")
        return redirect(url_for("index"))

    try:
        summary = summarize_transcript(transcript)
    except Exception as exc:
        flash(f"Summarization failed: {exc}", "error")
        return redirect(url_for("index"))

    supabase_client = get_supabase_client()
    files = list_audio_files(supabase_client)
    return render_template(
        "index.html",
        files=files,
        transcript=transcript,
        transcript_file=file_name,
        summary=summary,
    )


if __name__ == "__main__":
    app.run(debug=True)
