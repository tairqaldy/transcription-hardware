import sounddevice as sd
import scipy.io.wavfile as wav
import numpy as np
import threading
import io
import os
from dotenv import load_dotenv
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech

KEY_PATH = r"C:\Users\Francisco\Desktop\Work\Project 5\transcription-hardware\application\ai_model\google_key.json"

if os.path.exists(KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KEY_PATH
    print(f"✅ Key found: {KEY_PATH}")
else:
    print(f"❌ ERROR: Key not found at {KEY_PATH}")

# Load .env variables
load_dotenv()

# Configuration from your project
PROJECT_ID = "project-93f4a126-e6c4-4f37-aab"
REGION = "us-central1"
RATE = 16000 
LANGUAGES = ["en-US", "nl-NL", "de-DE"]

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