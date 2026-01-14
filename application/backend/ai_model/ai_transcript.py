import sounddevice as sd
import scipy.io.wavfile as wav
import numpy as np
import threading
import io
import os
from dotenv import load_dotenv
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

DEFAULT_KEY_PATH = os.path.join(os.path.dirname(__file__), "google_key.json")
credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if credentials_path and not os.path.exists(credentials_path):
    print(f"Credentials file not found at {credentials_path}; falling back to {DEFAULT_KEY_PATH}")
    credentials_path = None
if not credentials_path and os.path.exists(DEFAULT_KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = DEFAULT_KEY_PATH
    credentials_path = DEFAULT_KEY_PATH

if credentials_path:
    print(f"?o. Key found: {credentials_path}")
else:
    print("??O ERROR: Google credentials not found.")

project_env = os.getenv("GOOGLE_PROJECT_ID") or os.getenv("PROJECT_ID")
PROJECT_ID = project_env.strip() if project_env else "project-93f4a126-e6c4-4f37-aab"

region_env = os.getenv("GOOGLE_REGION") or os.getenv("REGION")
REGION = region_env.strip() if region_env else "us-central1"

rate_env = os.getenv("AUDIO_SAMPLE_RATE") or os.getenv("SAMPLING_RATE") or os.getenv("RATE")
RATE = int(rate_env.strip()) if rate_env else 16000

languages_env = os.getenv("TRANSCRIPTION_LANGUAGES")
LANGUAGES = (
    [lang.strip() for lang in languages_env.split(",") if lang.strip()]
    if languages_env
    else ["en-US", "nl-NL", "de-DE"]
)
recording_event = threading.Event()
audio_data = [] # Stores audio samples

def audio_callback(indata, frames, time, status):
    """Continuous audio capture to prevent cuts."""
    if recording_event.is_set():
        audio_data.append(indata.copy())

def transcribe_audio():
    if not audio_data:
        print("⚠️ No audio recorded")
        return

    print("📝 Transcribing with V2 (Chirp)...")
    
    # Merge all captured data smoothly
    full_audio = np.concatenate(audio_data, axis=0)
    
    # Convert to bytes in memory
    byte_io = io.BytesIO()
    wav.write(byte_io, RATE, full_audio)
    audio_bytes = byte_io.getvalue()

    try:
        # Client automatically looks for GOOGLE_APPLICATION_CREDENTIALS from .env
        client = SpeechClient()
        parent = f"projects/{PROJECT_ID}/locations/{REGION}"

        config = cloud_speech.RecognitionConfig(
            auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
            language_codes=LANGUAGES,
            model="long", 
            features=cloud_speech.RecognitionFeatures(enable_automatic_punctuation=True),
        )

        request = cloud_speech.RecognizeRequest(
            recognizer=f"projects/{PROJECT_ID}/locations/global/recognizers/_",
            config=config,
            content=audio_bytes,
        )

        response = client.recognize(request=request)
        
        print("\n" + "="*30)
        print("📝 FINAL TRANSCRIPT:")
        for result in response.results:
            print(f"[{result.language_code}]: {result.alternatives[0].transcript}")
        print("="*30 + "\n")
    except Exception as e:
        print(f"❌ API Error: {e}")

def keyboard_listener():
    # Use InputStream for zero-latency continuous recording
    with sd.InputStream(samplerate=RATE, channels=1, dtype='int16', callback=audio_callback):
        print("Press ENTER to start / stop recording")
        while True:
            input()
            if not recording_event.is_set():
                print("🔴 Recording... ")
                audio_data.clear()
                recording_event.set()
            else:
                recording_event.clear()
                print("⏹️ Stopped")
                transcribe_audio()

if __name__ == "__main__":
    keyboard_listener()
