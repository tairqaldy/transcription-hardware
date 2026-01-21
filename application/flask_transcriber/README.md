# Flask Supabase Transcriber

Simple Flask app that lists audio from the Supabase `audio` storage bucket and runs Google Speech-to-Text on demand.

## Setup

```bash
cd application/flask_transcriber
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copy the env file and fill in your values:

```bash
copy .env.example .env
```

Required values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `GOOGLE_APPLICATION_CREDENTIALS` (path to your Google Cloud key JSON)
- `GOOGLE_SUMMARY_KEY` (for the summarize button)

## Run

```bash
python app.py
```

Open `http://localhost:5000` and click **Transcribe** next to any audio file.
Use **Summarize** to generate a short summary with Gemini.

## Notes

- Audio transcription defaults to async (`long_running_recognize`) to handle longer files.
- Supported formats depend on Google Speech-to-Text. WAV/FLAC/MP3/OGG are handled here.
- The app assumes the `audio` bucket is public for the **View** link; transcription uses the Supabase key.
