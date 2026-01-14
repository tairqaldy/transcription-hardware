# AI Integration Guide
## Implementing Transcription and Summarization

**Target Audience:** AI Engineers, ML Engineers, Data Scientists  
**Version:** 1.0  
**Last Updated:** 16.12.2025

*Any Questions? Submit issue request or ask a teamate!*

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Transcription Implementation](#transcription-implementation)
4. [Summarization Implementation](#summarization-implementation)
5. [Database Integration](#database-integration)
6. [Model Selection](#model-selection)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

This guide helps AI engineers implement transcription and summarization features for the ESP32 transcription device. You'll learn how to:

- Integrate speech-to-text transcription services
- Implement AI-powered summarization
- Store results in the Supabase database
- Optimize for performance and cost
- Handle errors and edge cases

---

## Architecture Overview

### Confirmed Data Flow

```
ESP32 Device
    ↓
Audio Recording (I2S microphone)
    ↓
Convert to MP3/WAV format
    ↓
Upload Audio → Supabase Storage (audio bucket)
    ↓
Get Public URL from Storage
    ↓
Insert Note → Database (notes table)
    - audio_file_url: URL from Supabase Storage
    - text: NULL (not transcribed yet)
    - is_processed: FALSE
    ↓
Background Job / API Endpoint
    ↓
Download Audio from audio_file_url
    ↓
Transcribe with Gemini API
    ↓
Update Note → Database
    - text: Transcribed text
    - is_processed: TRUE
    - transcription_model: "gemini-1.5-pro"
    ↓
[User clicks "Summarize" button in UI]
    ↓
Summarization Service (Gemini API)
    ↓
Generate Summary → Database (summaries table)
```

### Key Components

1. **Audio Storage**: Supabase Storage bucket for audio files
2. **Transcription Service**: Converts audio to text using Gemini API (automatic background processing)
3. **Summarization Service**: Generates summaries from notes using Gemini models (on-demand, user-triggered)
4. **Background Jobs**: Process transcriptions automatically when new audio is uploaded

### Google AI Studio Setup

Before starting, you'll need:

1. **Google AI Studio Account**: Sign up at [makersuite.google.com](https://makersuite.google.com)
2. **API Key**: Create an API key in Google AI Studio
3. **Python Environment**: Python 3.8+ with `google-generativeai` package

**Environment Setup**:
```bash
# Install required packages
pip install google-generativeai supabase python-dotenv pydub

# Set environment variable
export GOOGLE_AI_API_KEY="your-api-key-here"
```

### Gemini Audio Requirements

**Supported Formats**:
- MP3, WAV, M4A, OGG, FLAC, WEBM

**File Size Limits**:
- Gemini 1.5 Pro: Up to 2 hours of audio per request
- Gemini 1.5 Flash: Up to 1 hour of audio per request
- Maximum file size: ~2GB (check current limits in Google AI Studio)

**Recommended Settings**:
- Sample rate: 16kHz or higher
- Bitrate: 128kbps or higher for MP3
- Format: MP3 or WAV for best compatibility

---

## Getting Started with Google AI Studio

### Step 1: Create API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (you'll only see it once, so save it securely)

### Step 2: Install Dependencies

```bash
pip install google-generativeai supabase python-dotenv
```

### Step 3: Configure Environment

Create a `.env` file:
```env
GOOGLE_AI_API_KEY=your-api-key-here
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 4: Test Connection

```python
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))

# List available models
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"Model: {model.name}")
```

---

## Transcription Implementation

### Using Google Gemini API (Recommended)

We use Google Gemini API through Google AI Studio for speech-to-text transcription. Gemini provides high-quality transcription with support for multiple languages and formats.

#### Setup

1. **Get API Key from Google AI Studio**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key for use in your application

2. **Install Required Package**:
   ```bash
   pip install google-generativeai
   ```

#### Implementation

```python
import google.generativeai as genai
from supabase import create_client, Client
import os
from pathlib import Path

# Initialize clients
genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))
supabase: Client = create_client(
    "https://[project-id].supabase.co",
    "your-service-role-key"
)

def transcribe_audio(audio_file_path: str, language: str = "en") -> dict:
    """
    Transcribe audio file using Google Gemini API.
    
    Args:
        audio_file_path: Path to audio file
        language: Language code (ISO 639-1)
    
    Returns:
        Dictionary with transcription and metadata
    """
    # Load the audio file
    audio_file = Path(audio_file_path)
    
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
    
    # Get file extension to determine MIME type
    mime_type = get_mime_type(audio_file.suffix)
    
    # Prepare audio file part for Gemini
    # Gemini API expects file parts in a specific format
    import mimetypes
    
    audio_part = {
        "mime_type": mime_type,
        "data": audio_file.read_bytes()
    }
    
    # Use Gemini model for transcription
    # Note: Use gemini-1.5-pro for best quality, or gemini-1.5-flash for faster/cheaper
    model = genai.GenerativeModel("gemini-1.5-pro")
    
    # Create prompt for transcription
    prompt = f"""Transcribe the following audio file accurately.
Language: {language}
Requirements:
- Provide only the transcribed text
- Maintain proper punctuation and capitalization
- Preserve speaker changes if multiple speakers
- Do not add commentary, explanations, or timestamps
- If audio is unclear or inaudible, indicate with [inaudible]"""
    
    # Generate transcription
    # Gemini accepts multimodal input: text prompt + audio file
    response = model.generate_content(
        [prompt, audio_part],
        generation_config={
            "temperature": 0.1,  # Low temperature for accurate transcription
            "max_output_tokens": 4096,
        }
    )
    
    transcribed_text = response.text.strip()
    
    # Calculate duration (you may need to use a library like pydub)
    duration = get_audio_duration(audio_file_path)
    
    return {
        "text": transcribed_text,
        "language": language,
        "confidence": 0.95,  # Gemini doesn't provide explicit confidence scores
        "duration": duration,
        "segments": []  # Can be enhanced with timestamp extraction
    }

def get_mime_type(file_extension: str) -> str:
    """
    Get MIME type from file extension.
    Gemini supports: MP3, WAV, M4A, OGG, FLAC, WEBM
    """
    mime_types = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".webm": "audio/webm"
    }
    return mime_types.get(file_extension.lower(), "audio/mpeg")

def get_audio_duration(audio_file_path: str) -> float:
    """
    Get audio duration in seconds.
    """
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(audio_file_path)
        return len(audio) / 1000.0  # Convert milliseconds to seconds
    except ImportError:
        # Fallback: estimate based on file size (rough approximation)
        file_size = os.path.getsize(audio_file_path)
        # Rough estimate: 1MB ≈ 1 minute for compressed audio
        return (file_size / 1024 / 1024) * 60
    except Exception:
        return 0.0
```

### Alternative: Using Gemini with Base64 Encoding

If you need to send audio data directly without file paths:

```python
import base64
import google.generativeai as genai

def transcribe_audio_base64(audio_base64: str, mime_type: str = "audio/mpeg", language: str = "en") -> dict:
    """
    Transcribe audio from base64 encoded string using Gemini API.
    
    Args:
        audio_base64: Base64 encoded audio data
        mime_type: MIME type of the audio (e.g., "audio/mpeg", "audio/wav")
        language: Language code (ISO 639-1)
    
    Returns:
        Dictionary with transcription and metadata
    """
    # Decode base64 audio
    audio_bytes = base64.b64decode(audio_base64)
    
    # Prepare audio data
    audio_data = {
        "mime_type": mime_type,
        "data": audio_bytes
    }
    
    # Initialize model
    model = genai.GenerativeModel("gemini-1.5-pro")
    
    # Create transcription prompt
    prompt = f"""Transcribe the following audio recording accurately.
    Language: {language}
    Requirements:
    - Provide only the transcribed text
    - Maintain proper punctuation and capitalization
    - Preserve speaker changes if multiple speakers
    - Do not add commentary, explanations, or timestamps
    - If audio is unclear, indicate with [inaudible]"""
    
    # Generate transcription
    response = model.generate_content(
        [prompt, audio_data],
        generation_config={
            "temperature": 0.1,
            "max_output_tokens": 4096,
        }
    )
    
    transcribed_text = response.text.strip()
    
    return {
        "text": transcribed_text,
        "language": language,
        "confidence": 0.95,
        "duration": 0,  # Calculate if needed
        "segments": []
    }
```

### Enhanced Transcription with Timestamps (Optional)

For more detailed transcription with timestamps, you can use a two-step approach:

```python
def transcribe_audio_with_timestamps(audio_file_path: str, language: str = "en") -> dict:
    """
    Transcribe audio with timestamp information using Gemini.
    """
    # First, get basic transcription
    basic_result = transcribe_audio(audio_file_path, language)
    
    # Optionally, use Google Speech-to-Text API for timestamps
    # or process with additional Gemini prompts for segmentation
    from google.cloud import speech_v1 as speech
    
    client = speech.SpeechClient()
    
    with open(audio_file_path, "rb") as audio_file:
        content = audio_file.read()
    
    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code=language,
        enable_word_time_offsets=True,
        enable_automatic_punctuation=True,
    )
    
    response = client.recognize(config=config, audio=audio)
    
    segments = []
    if response.results:
        for result in response.results:
            for alternative in result.alternatives:
                for word_info in alternative.words:
                    segments.append({
                        "word": word_info.word,
                        "start_time": word_info.start_time.total_seconds(),
                        "end_time": word_info.end_time.total_seconds()
                    })
    
    return {
        "text": basic_result["text"],
        "language": language,
        "confidence": 0.95,
        "duration": basic_result["duration"],
        "segments": segments
    }
```

### Processing Audio from Database

**Workflow**: ESP32 uploads audio to Supabase Storage and creates a note with `audio_file_url`. This function processes pending notes that need transcription.

```python
import requests
from pathlib import Path
import tempfile
import logging

logger = logging.getLogger(__name__)

def download_audio(audio_url: str, save_path: str) -> str:
    """
    Download audio file from Supabase Storage URL.
    """
    response = requests.get(audio_url)
    response.raise_for_status()
    
    with open(save_path, "wb") as f:
        f.write(response.content)
    
    return save_path

def process_pending_notes():
    """
    Fetch notes with audio files that need transcription using Gemini API.
    
    This should run as a background job (cron, queue worker, etc.)
    """
    # Fetch notes where transcription is missing
    response = supabase.table("notes").select("*").eq("is_processed", False).not_.is_("audio_file_url", "null").limit(10).execute()
    
    if not response.data:
        logger.info("No pending notes to transcribe")
        return
    
    for note in response.data:
        audio_url = note.get("audio_file_url")
        if not audio_url:
            logger.warning(f"Note {note['id']} has no audio_file_url")
            continue
        
        try:
            # Download audio file from Supabase Storage
            temp_path = os.path.join(tempfile.gettempdir(), f"audio_{note['id']}.mp3")
            audio_path = download_audio(audio_url, temp_path)
            
            # Transcribe using Gemini API
            transcription = transcribe_audio(audio_path, note.get("language", "en"))
            
            # Update note in database with transcription
            supabase.table("notes").update({
                "text": transcription["text"],
                "confidence_score": transcription["confidence"],
                "audio_duration_seconds": int(transcription["duration"]),
                "transcription_model": "gemini-1.5-pro",
                "is_processed": True
            }).eq("id", note["id"]).execute()
            
            logger.info(f"Successfully transcribed note {note['id']}")
            
            # Clean up downloaded file
            os.remove(audio_path)
            
        except Exception as e:
            logger.error(f"Failed to process note {note['id']}: {e}", exc_info=True)
            # Optionally mark as failed or retry later
            continue
```

---

## Summarization Implementation

### Option 1: Google Gemini (Recommended)

```python
import google.generativeai as genai
import os

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))

def generate_summary(note_ids: list[str], summary_type: str = "daily") -> dict:
    """
    Generate summary from multiple notes using GPT-4.
    
    Args:
        note_ids: List of note IDs to summarize
        summary_type: Type of summary (daily, weekly, custom)
    
    Returns:
        Dictionary with summary content and metadata
    """
    # Fetch notes
    notes = []
    for note_id in note_ids:
        response = supabase.table("notes").select("*").eq("id", note_id).single().execute()
        if response.data:
            notes.append(response.data)
    
    if not notes:
        return None
    
    # Prepare prompt
    notes_text = "\n\n".join([f"[{note['created_at']}] {note['text']}" for note in notes])
    
    prompt = f"""Summarize the following transcription notes. 
Provide key points, main topics, and important information.

Notes:
{notes_text}

Provide a concise summary with:
1. Key points (3-5 bullet points)
2. Main topics discussed
3. Important dates/times mentioned
4. Overall sentiment

Summary:"""
    
    # Initialize Gemini model
    model = genai.GenerativeModel("gemini-1.5-pro")
    
    # Generate summary
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.7,
            "max_output_tokens": 500,
        }
    )
    
    summary_text = response.text.strip()
    
    # Extract key points (simple extraction)
    key_points = extract_key_points(summary_text)
    
    # Detect sentiment
    sentiment = detect_sentiment(summary_text)
    
    # Detect topics
    topics = detect_topics(notes_text)
    
    return {
        "content": summary_text,
        "key_points": key_points,
        "sentiment": sentiment,
        "topics": topics,
        "note_count": len(notes)
    }

def extract_key_points(text: str) -> list[str]:
    """
    Extract key points from summary text.
    """
    lines = text.split("\n")
    key_points = []
    
    for line in lines:
        line = line.strip()
        if line.startswith("-") or line.startswith("•") or line.startswith("*"):
            key_points.append(line.lstrip("-•* ").strip())
        elif line and len(line) < 100:  # Short lines might be key points
            key_points.append(line)
    
    return key_points[:5]  # Limit to 5 key points
```

### Option 2: Gemini Flash (Faster, Cost-Effective)

```python
def generate_summary_gemini_flash(note_ids: list[str]) -> dict:
    """
    Generate summary using Gemini 1.5 Flash (faster and cheaper).
    """
    notes = fetch_notes(note_ids)
    notes_text = "\n\n".join([f"[{note['created_at']}] {note['text']}" for note in notes])
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""Summarize these transcription notes:\n\n{notes_text}\n\nProvide key points, topics, and sentiment."""
    
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.7,
            "max_output_tokens": 500,
        }
    )
    
    summary_text = response.text.strip()
    
    return {
        "content": summary_text,
        "key_points": extract_key_points(summary_text),
        "sentiment": detect_sentiment(summary_text),
        "topics": detect_topics(notes_text),
        "note_count": len(notes)
    }
```

### Option 3: Claude (Anthropic)

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

def generate_summary_claude(note_ids: list[str]) -> dict:
    """
    Generate summary using Claude.
    """
    # Fetch and prepare notes (same as above)
    notes = fetch_notes(note_ids)
    notes_text = "\n\n".join([f"[{note['created_at']}] {note['text']}" for note in notes])
    
    message = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=500,
        messages=[
            {
                "role": "user",
                "content": f"Summarize these transcription notes:\n\n{notes_text}\n\nProvide key points, topics, and sentiment."
            }
        ]
    )
    
    summary_text = message.content[0].text
    
    return {
        "content": summary_text,
        "key_points": extract_key_points(summary_text),
        "sentiment": detect_sentiment(summary_text),
        "topics": detect_topics(notes_text),
        "note_count": len(notes)
    }
```

### Option 4: Local LLM (Llama, Mistral, etc.)

```python
from transformers import pipeline

# Load model (do this once)
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device=0 if torch.cuda.is_available() else -1
)

def generate_summary_local(note_ids: list[str]) -> dict:
    """
    Generate summary using local LLM.
    """
    notes = fetch_notes(note_ids)
    notes_text = "\n\n".join([note['text'] for note in notes])
    
    # Summarize
    summary = summarizer(
        notes_text,
        max_length=200,
        min_length=50,
        do_sample=False
    )
    
    return {
        "content": summary[0]["summary_text"],
        "key_points": [],
        "sentiment": detect_sentiment(summary[0]["summary_text"]),
        "topics": detect_topics(notes_text),
        "note_count": len(notes)
    }
```

---

## Database Integration

### On-Demand Summarization (User-Triggered)

**Important**: Summarization is **NOT automatic**. It only happens when the user clicks a "Summarize" button in the UI. The frontend calls this API endpoint.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

class SummarizeRequest(BaseModel):
    note_ids: List[str]  # List of note IDs to summarize
    summary_type: str = "custom"  # "custom", "daily", "weekly"
    user_id: str  # User requesting the summary

@app.post("/api/summarize")
async def create_summary(request: SummarizeRequest):
    """
    API endpoint for user-triggered summarization.
    Called from frontend when user clicks "Summarize" button.
    """
    # Verify user owns these notes
    notes = []
    for note_id in request.note_ids:
        note_response = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", request.user_id).single().execute()
        if note_response.data:
            notes.append(note_response.data)
        else:
            raise HTTPException(status_code=404, f"Note {note_id} not found or access denied")
    
    if not notes:
        raise HTTPException(status_code=400, "No valid notes to summarize")
    
    # Generate summary using Gemini
    summary = generate_summary(request.note_ids, summary_type=request.summary_type)
    
    if not summary:
        raise HTTPException(status_code=500, "Failed to generate summary")
    
    # Save to database
    summary_record = {
        "user_id": request.user_id,
        "summary_type": request.summary_type,
        "title": f"Summary - {len(notes)} notes",
        "content": summary["content"],
        "summary_model": "gemini-1.5-pro",
        "note_count": summary["note_count"],
        "key_points": summary["key_points"],
        "sentiment": summary["sentiment"],
        "topics": summary["topics"]
    }
    
    # Add period if it's a time-based summary
    if request.summary_type in ["daily", "weekly"]:
        from datetime import datetime, timedelta
        if request.summary_type == "daily":
            period_start = datetime.now().replace(hour=0, minute=0, second=0)
            period_end = datetime.now().replace(hour=23, minute=59, second=59)
        else:  # weekly
            period_start = datetime.now() - timedelta(days=7)
            period_end = datetime.now()
        
        summary_record["period_start"] = period_start.isoformat() + "Z"
        summary_record["period_end"] = period_end.isoformat() + "Z"
    
    response = supabase.table("summaries").insert(summary_record).execute()
    
    return {
        "summary_id": response.data[0]["id"] if response.data else None,
        "message": "Summary created successfully"
    }
```

### Store Summary in Database

```python
def save_summary(
    note_id: str = None,
    device_id: str = None,
    user_id: str = None,
    summary_data: dict = None
):
    """
    Save generated summary to database.
    """
    summary_record = {
        "summary_type": summary_data.get("summary_type", "note"),
        "title": summary_data.get("title", "Summary"),
        "content": summary_data["content"],
        "summary_model": summary_data.get("model", "gemini-1.5-pro"),
        "note_count": summary_data.get("note_count", 1),
        "key_points": summary_data.get("key_points", []),
        "sentiment": summary_data.get("sentiment", "neutral"),
        "topics": summary_data.get("topics", [])
    }
    
    if note_id:
        summary_record["note_id"] = note_id
    if device_id:
        summary_record["device_id"] = device_id
    if user_id:
        summary_record["user_id"] = user_id
    
    if "period_start" in summary_data:
        summary_record["period_start"] = summary_data["period_start"]
    if "period_end" in summary_data:
        summary_record["period_end"] = summary_data["period_end"]
    
    response = supabase.table("summaries").insert(summary_record).execute()
    return response.data[0] if response.data else None
```

---

## Model Selection

### Transcription Models Comparison

| Model | Accuracy | Speed | Cost | Use Case |
|-------|----------|-------|------|----------|
| **Gemini 1.5 Pro** | Very High | Fast | Medium | **Recommended: Production, multiple languages, multimodal** |
| Gemini 1.5 Flash | High | Very Fast | Low | Real-time, cost-effective |
| Google STT | Very High | Fast | Medium | Legacy option, word-level timestamps |
| Local Whisper | High | Medium | Free | Privacy-sensitive, offline |

### Summarization Models Comparison

| Model | Quality | Speed | Cost | Use Case |
|-------|---------|-------|------|----------|
| **Gemini 1.5 Pro** | Excellent | Fast | Medium | **Recommended: Long context, multimodal, cost-effective** |
| GPT-4 | Excellent | Medium | High | Best quality summaries |
| GPT-3.5 Turbo | Good | Fast | Low | Cost-effective, good quality |
| Claude 3 | Excellent | Medium | High | Long context, nuanced |
| Local LLM | Good | Slow | Free | Privacy, offline processing |

---

## Performance Optimization

### Batch Processing

```python
def process_notes_batch(notes: list[dict], batch_size: int = 10):
    """
    Process notes in batches for efficiency.
    """
    for i in range(0, len(notes), batch_size):
        batch = notes[i:i + batch_size]
        
        # Process batch
        transcriptions = []
        for note in batch:
            transcription = transcribe_audio(note["audio_file_path"])
            transcriptions.append({
                "note_id": note["id"],
                "transcription": transcription
            })
        
        # Update database in batch
        for item in transcriptions:
            supabase.table("notes").update({
                "text": item["transcription"]["text"],
                "confidence_score": item["transcription"]["confidence"],
                "is_processed": True
            }).eq("id", item["note_id"]).execute()
```

### Caching

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def transcribe_audio_cached(audio_hash: str, audio_file_path: str) -> dict:
    """
    Cache transcriptions to avoid re-processing same audio.
    """
    return transcribe_audio(audio_file_path)
```

### Async Processing

```python
import asyncio
import aiohttp

async def transcribe_audio_async(audio_file_path: str) -> dict:
    """
    Async transcription for better performance.
    """
    # Implementation using async HTTP client
    pass

async def process_multiple_notes(notes: list[dict]):
    """
    Process multiple notes concurrently.
    """
    tasks = [transcribe_audio_async(note["audio_file_path"]) for note in notes]
    results = await asyncio.gather(*tasks)
    return results
```

---

## Error Handling

### Retry Logic

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import google.generativeai as genai
import time

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((genai.types.StopCandidateException, Exception))
)
def transcribe_with_retry(audio_file_path: str) -> dict:
    """
    Transcribe with automatic retry on failure.
    Handles Gemini-specific errors like rate limits and content blocking.
    """
    try:
        return transcribe_audio(audio_file_path)
    except genai.types.BlockedPromptException as e:
        # Content blocked - don't retry
        print(f"Content blocked by safety filters: {e}")
        raise
    except Exception as e:
        # Check for rate limit errors
        if "429" in str(e) or "quota" in str(e).lower():
            print(f"Rate limit hit, waiting before retry: {e}")
            time.sleep(60)  # Wait 1 minute for rate limit
        print(f"Transcription failed: {e}")
        raise
```

### Error Logging

```python
import logging
import google.generativeai as genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def transcribe_with_logging(audio_file_path: str) -> dict:
    """
    Transcribe with error logging and Gemini-specific error handling.
    """
    try:
        result = transcribe_audio(audio_file_path)
        logger.info(f"Successfully transcribed: {audio_file_path}")
        return result
    except genai.types.BlockedPromptException as e:
        logger.error(f"Content blocked by safety filters: {e}")
        # Handle blocked content
        return {
            "text": "",
            "language": "en",
            "confidence": 0.0,
            "duration": 0,
            "segments": [],
            "error": "Content blocked by safety filters"
        }
    except genai.types.StopCandidateException as e:
        logger.warning(f"Generation stopped: {e}")
        # Retry with different parameters
        return transcribe_audio(audio_file_path)
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        
        # Log to database
        supabase.table("device_events").insert({
            "device_id": device_id,
            "event_type": "error",
            "event_code": "TRANSCRIPTION_FAILED",
            "message": str(e),
            "severity": "error"
        }).execute()
        
        raise
```

---

## Best Practices

### 1. Cost Management

```python
def estimate_cost(audio_duration_seconds: float, model: str = "gemini-1.5-pro") -> float:
    """
    Estimate transcription cost using Gemini API.
    
    Note: Gemini pricing is based on input/output tokens, not audio duration.
    This is a rough estimate based on typical audio-to-text conversion.
    
    Check current pricing at: https://ai.google.dev/pricing
    """
    # Rough estimate: 1 minute of audio ≈ 1000 tokens input
    # Gemini 1.5 Pro pricing (as of 2024): 
    # - Input: ~$1.25 per 1M tokens
    # - Output: ~$5.00 per 1M tokens
    tokens_per_minute = 1000
    minutes = audio_duration_seconds / 60
    estimated_input_tokens = minutes * tokens_per_minute
    estimated_output_tokens = estimated_input_tokens * 0.1  # Rough estimate for output
    
    input_cost_per_1m = 1.25
    output_cost_per_1m = 5.00
    
    input_cost = (estimated_input_tokens / 1_000_000) * input_cost_per_1m
    output_cost = (estimated_output_tokens / 1_000_000) * output_cost_per_1m
    
    return input_cost + output_cost

def check_rate_limit():
    """
    Check Gemini API rate limits.
    
    Free tier limits (check current limits):
    - Requests per minute: 15
    - Requests per day: 1500
    - Tokens per minute: Varies by model
    
    Paid tier has higher limits.
    """
    # Implement rate limit checking
    # Use exponential backoff if rate limited
    pass
```

### 2. Quality Assurance

```python
def validate_transcription(transcription: dict) -> bool:
    """
    Validate transcription quality.
    """
    if not transcription.get("text") or len(transcription["text"]) < 10:
        return False
    
    if transcription.get("confidence", 0) < 0.5:
        return False
    
    return True
```

### 3. Language Detection

```python
def detect_language(audio_file_path: str) -> str:
    """
    Auto-detect language before transcription.
    """
    # Use language detection model or API
    # For now, return default
    return "en"
```

---

## Supabase Setup Requirements

### 1. Storage Bucket for Audio Files

**Required**: Create a storage bucket named `audio` in Supabase:

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name**: `audio`
   - **Public bucket**: ✅ **Enable** (for public URLs)
   - **File size limit**: 50MB (or your preferred limit)
   - **Allowed MIME types**: `audio/*`

4. Set up Storage Policies (run in SQL Editor):

```sql
-- Allow service role to upload files
CREATE POLICY "Service role can upload audio"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'audio');

-- Allow service role to read files
CREATE POLICY "Service role can read audio"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'audio');

-- Allow public to read audio files (for frontend playback)
CREATE POLICY "Public can read audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio');
```

### 2. Background Job for Transcription

**Required**: Set up a background job (cron, queue worker, or scheduled function) to:
- Fetch notes where `is_processed = FALSE` and `audio_file_url IS NOT NULL`
- Download audio from `audio_file_url`
- Transcribe using Gemini API
- Update note with transcribed text

**Options**:
- **Supabase Edge Functions** (recommended): Scheduled function that runs every few minutes
- **External Service**: Python script with cron, or queue-based system (Celery, Bull, etc.)
- **Serverless**: AWS Lambda, Google Cloud Functions, Vercel Cron Jobs

### 3. API Endpoint for Summarization

**Required**: Create a POST endpoint `/api/summarize` that:
- Accepts: `{ note_ids: string[], summary_type: string, user_id: string }`
- Verifies user owns the notes
- Calls `generate_summary()` function
- Saves result to `summaries` table
- Returns summary ID

**Implementation**: FastAPI, Express.js, or your preferred backend framework

---

## Next Steps

1. **Set up Supabase Storage**: Create `audio` bucket and policies (see above)
2. **Get Google AI API Key**: Sign up at [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Install Dependencies**: `pip install google-generativeai supabase python-dotenv requests`
4. **Set Environment Variables**: Add `GOOGLE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
5. **Set up Background Job**: Create scheduled job to process transcriptions (see above)
6. **Create Summarization API**: Implement `/api/summarize` endpoint
7. **Test Transcription**: Run a test transcription with sample audio
8. **Test Summarization**: Test the API endpoint from frontend
9. **Monitor Usage**: Track API usage and costs in Google AI Studio
10. **Deploy to Production**: Deploy your AI processing pipeline

---

## Resources

- [Google AI Studio](https://makersuite.google.com/app/apikey) - Get your API key
- [Gemini API Documentation](https://ai.google.dev/docs) - Official Gemini API docs
- [Gemini Python SDK](https://github.com/google/generative-ai-python) - Python client library
- [Google AI Studio Guide](https://ai.google.dev/gemini-api/docs) - Getting started guide
- [Gemini Model Capabilities](https://ai.google.dev/gemini-api/docs/models/gemini) - Model specifications

---

*Last updated: 16.12.2025*


