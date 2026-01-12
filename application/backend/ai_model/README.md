# 🎙️ Advanced AI Voice Transcriptor (Google Chirp V2)

This module is the core audio-intelligence engine for **Project 5**. It transforms real-time vocal input into highly accurate, punctuated text using Google's state-of-the-art **Universal Speech Model (USM/Chirp)**.

---

## 🏗️ System Architecture & Data Pipeline

The application operates on a **Non-Blocking Multi-Threaded** architecture to ensure that the hardware capture never interrupts the user interface.



### 1. The Signal Controller (Threading Logic)
We use a `threading.Event()` as a thread-safe "Traffic Light":
* **Green Light (`set()`)**: The UI signals the audio thread to start appending samples to the buffer.
* **Red Light (`clear()`)**: The UI stops the capture and triggers the transcription pipeline.

### 2. High-Priority Audio Callback
The `sounddevice.InputStream` runs on a high-priority system thread. The callback avoids heavy processing to prevent **buffer underflow**. It clones raw hardware input into a memory buffer.

### 3. In-Memory WAV Reconstruction
Instead of saving a file, we use `io.BytesIO()` to mimic a file system:
* **NumPy**: Concatenates chunks into one contiguous array.
* **SciPy**: Writes WAV headers directly into the byte stream.
* **Binary Stream**: Data is sent to Google Cloud without touching the hard drive.

---

## 🚀 Installation & Setup

### 1. Prerequisites
Ensure you have **Python 3.10+** installed. You will also need the **PortAudio** library (required by `sounddevice`):
* **Windows**: Bundled automatically with the wheel.
* **macOS**: `brew install portaudio`
* **Linux**: `sudo apt-get install libportaudio2`

### 2. Install Dependencies
Run the following command to install all required Python libraries:
```bash
pip install google-cloud-speech sounddevice scipy numpy python-dotenv