# Backend API Setup Guide

## Problem: "Failed to fetch" Error

If you're seeing "Failed to fetch" errors when trying to record or summarize, it means the frontend cannot connect to the backend AI API server.

## Root Cause

The frontend requires a backend Python API server that provides the following endpoints:
- `POST /record/start` - Start audio recording
- `POST /record/stop` - Stop recording and get transcription
- `POST /summarize` - Generate summary from transcript
- `POST /title` - Generate title from transcript

The backend server is located at: `application/backend/ai_model/ai_transcriptionv2.py`

## Solution: Set Environment Variable in Vercel

### Step 1: Deploy Your Backend API Server

You need to deploy the Python backend server somewhere accessible (e.g., Railway, Render, PythonAnywhere, or a VPS).

**Backend Server Requirements:**
- The Python server in `application/backend/ai_model/ai_transcriptionv2.py`
- Must be accessible via HTTPS (for production)
- Must have CORS enabled for your Vercel domain

**Example deployment platforms:**
- [Railway](https://railway.app/)
- [Render](https://render.com/)
- [PythonAnywhere](https://www.pythonanywhere.com/)
- Your own VPS/server

### Step 2: Set VITE_AI_API_URL in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add Environment Variable**
4. Set:
   - **Name**: `VITE_AI_API_URL`
   - **Value**: Your deployed backend API URL (e.g., `https://your-api.railway.app` or `https://your-api.onrender.com`)
   - **Environment**: Select "Production", "Preview", and "Development" (or as needed)

5. Click **Save**

### Step 3: Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **Redeploy** (or push a new commit)

**Important:** Environment variables are only available after redeployment!

## Verification

After redeploying, check the browser console. You should see:
- No "VITE_AI_API_URL is not configured" errors
- API calls going to your backend URL (not `http://localhost:8000`)

## Local Development

For local development, create a `.env.local` file in `application/frontend/`:

```env
VITE_AI_API_URL=http://localhost:8000
```

Then start your backend server locally (usually `python application/backend/ai_model/ai_transcriptionv2.py` or similar).

## Troubleshooting

### Still getting "Failed to fetch"?

1. **Check the environment variable:**
   - Verify `VITE_AI_API_URL` is set in Vercel
   - Ensure you've redeployed after adding it
   - Check the value is correct (no trailing slash, correct protocol)

2. **Check backend server:**
   - Verify the backend is running and accessible
   - Test the endpoints manually (e.g., `curl https://your-api.railway.app/record/start`)
   - Check CORS settings allow requests from your Vercel domain

3. **Check browser console:**
   - Look for the actual error message (we've improved error messages)
   - Check Network tab to see the actual request URL and response

4. **CORS Issues:**
   - The backend must allow requests from `https://your-vercel-app.vercel.app`
   - Add your Vercel domain to CORS allowed origins in the backend

### Recording doesn't work in browser?

The current recording implementation (`/record/start` and `/record/stop`) is designed for a local Python server with microphone access. For browser-based recording, you'll need a different approach:

- Use the browser's MediaRecorder API
- Send audio chunks directly to the transcription API
- Or use the ESP32 device workflow (upload audio to Supabase Storage)

## Current Status

- ✅ **Summarization**: Should work once `VITE_AI_API_URL` is set and backend is deployed
- ⚠️ **Recording**: Current implementation requires local backend with microphone access

## Next Steps

1. Deploy the backend API server to a cloud platform
2. Set `VITE_AI_API_URL` in Vercel environment variables
3. Redeploy the frontend
4. Test summarization functionality
5. Consider implementing browser-based recording if needed
