# 🎙️ Advanced AI Voice Transcriptor (Google Chirp V2)

This module is the core audio-to-text engine for **Project 5**. It transforms real-time vocal input into highly accurate, punctuated text using Google's state-of-the-art Universal Speech Model.

---

## 🌟 Project Concept: The "Invisible Bridge"
The philosophy behind this project is to create a seamless, zero-latency bridge between human thought and digital text. Unlike traditional recorders that save files to a hard drive and upload them later, this application uses **In-Memory Streaming Logic**.

It keeps the microphone "warm" and ready in the background, but only captures data when you command it. By leveraging the **Google Chirp (V2)** model, the system doesn't just recognize words—it understands context, detects multiple languages automatically, and applies professional punctuation in real-time.



---

## 📖 Technical Code Breakdown

### 1. The "Traffic Light" (Threading Logic)
The program uses a threading system to ensure the user interface (keyboard) and the audio capture (hardware) never block each other.
* **`recording_event = threading.Event()`**: Acts as a global signal. When you press Enter, the light turns **Green** (`set()`). When you press it again, it turns **Red** (`clear()`).
* **`audio_data = []`**: Our temporary "storage vault" that holds audio samples only when the light is green.

### 2. The "Background Worker" (The Callback)
```python
def audio_callback(indata, frames, time, status):
    if recording_event.is_set():
        audio_data.append(indata.copy())

# 🎙️ Advanced AI Voice Transcriptor (Google Chirp V2)

This module is the core audio-intelligence engine for **Project 5**. It transforms real-time vocal input into highly accurate, punctuated text using Google's state-of-the-art **Universal Speech Model (USM/Chirp)**.

---

## 🏗️ System Architecture & Data Pipeline

The application operates on a **Non-Blocking Multi-Threaded** architecture to ensure that the hardware capture never interrupts the user interface.



### 1. The Signal Controller (Threading Logic)
We use a `threading.Event()` as a thread-safe "Traffic Light":
* **Green Light (`set()`)**: The UI signals the audio thread to start appending samples to the vault.
* **Red Light (`clear()`)**: The UI stops the capture and triggers the transcription pipeline.

### 2. High-Priority Audio Callback
The `sounddevice.InputStream` runs on a high-priority system thread. The callback avoids any heavy processing (like writing to disk) to prevent **buffer underflow**, which causes "clicks" or "audio drops". It simply clones the raw hardware input into a memory buffer.

### 3. In-Memory WAV Reconstruction
Instead of saving a file, we use `io.BytesIO()` to mimic a file system:
* **NumPy**: Concatenates thousands of small audio chunks into one contiguous array.
* **SciPy**: Writes the WAV headers directly into the byte stream.
* **Binary Stream**: The data is sent directly to Google Cloud via a single POST request.

---

## 📖 Technical Breakdown: Google V2 Integration

The script utilizes the **Speech V2 (Chirp)** client, specifically optimized for hardware-to-cloud efficiency:

| Feature | Implementation | Benefit |
| :--- | :--- | :--- |
| **Model** | `model="long"` | Optimized for spontaneous speech and varying sentence lengths. |
| **Recognizer** | `recognizers/_` | Uses the global recognizer for lower regional latency. |
| **Auto-Decoding** | `AutoDetectDecodingConfig` | Automatically handles sample rate and bit-depth metadata. |
| **Language Codes** | `en-US`, `nl-NL`, `de-DE` | Simultaneous multi-language support. |

---

## 🚀 Installation & Setup

### 1. Install Dependencies
Ensure you have the **PortAudio** library installed on your system, then run:
```bash
pip install -r requirements.txt