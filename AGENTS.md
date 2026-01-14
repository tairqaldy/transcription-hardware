# AGENTS.md - AI Agent Navigation Guide

## ESP32 Transcription Device - FeedPulse AI

This file helps AI agents understand the project structure, conventions, and workflows to effectively navigate and contribute to this repository.

---

## 📋 Project Overview

**Project Name**: FeedPulse AI (ESP32 Transcription Device)
**Purpose**: Real-time audio transcription system using ESP32 hardware devices
**Tech Stack**: React + TypeScript (Frontend), Supabase/PostgreSQL + TS routing (Backend), Google Gemini API (AI), ESP32 (Hardware)

### Key Components

- **Frontend**: React + TypeScript + Vite application (`application/frontend/`)
- **Backend**: Supabase PostgreSQL database (`application/backend/`)
- **AI Model**: Python transcription service (`application/ai_model/`)
- **Hardware**: ESP32 device firmware (`drafts/`)

---

## 🗂️ Repository Structure

```
project-5-feedpulse-ai/
├── application/
│   ├── frontend/              # React + TypeScript + Vite app
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Page components
│   │   │   └── lib/          # Utilities (supabase.ts)
│   │   ├── package.json      # npm dependencies
│   │   └── vite.config.ts    # Vite configuration
│   ├── backend/               # Database schema and SQL
│   │   └── database_schema.sql
│   └── ai_model/              # Python transcription service
│       ├── ai_transcript.py
│       └── README.md
├── docs/                      # Comprehensive documentation
│   ├── Documentation Index.md
│   ├── db/                    # Database documentation
│   └── integration/          # Integration guides
│       ├── frontend/         # Frontend integration guide
│       ├── ai/               # AI integration guide
│       └── hardware/         # Hardware integration guide
├── drafts/                    # ESP32 firmware sketches
└── AGENTS.md                  # This file
```

---

## 🚀 Quick Start for AI Agents

### 1. Understanding the Project

**Read these files first** (in order):

1. `README.md` - Basic project info
2. `docs/Documentation Index.md` - Complete documentation overview
3. `docs/db/Database_Design_Documentation.md` - Database schema and relationships
4. `docs/integration/frontend/Frontend_Integration_Guide.md` - Frontend patterns
5. `docs/integration/ai/AI_Integration_Guide.md` - AI/transcription workflow

### 2. Key Workflows to Understand

#### Audio Transcription Flow (Confirmed)

```
ESP32 Device
  ↓ Records audio
  ↓ Converts to MP3/WAV
  ↓ Uploads to Supabase Storage (bucket: "audio")
  ↓ Gets public URL
  ↓ Creates note in database (text: NULL, is_processed: FALSE)
  ↓
Background Job (Automatic)
  ↓ Fetches notes where is_processed = FALSE
  ↓ Downloads audio from audio_file_url
  ↓ Transcribes using Gemini API
  ↓ Updates note (text: transcribed, is_processed: TRUE)
```

#### Summarization Flow (User-Triggered)

```
User clicks "Summarize" button in UI
  ↓ Frontend calls /api/summarize endpoint
  ↓ Backend verifies user owns notes
  ↓ Generates summary using Gemini API
  ↓ Saves to summaries table
  ↓ Returns summary_id to frontend
```

**⚠️ Important**: Summarization is **NOT automatic** - it only happens when user clicks the button.

---

## 🛠️ Development Environment

### Frontend Setup

**Location**: `application/frontend/`

**Package Manager**: `npm` (not pnpm, not yarn)

**Key Commands**:

```bash
cd application/frontend
npm install                    # Install dependencies
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run ESLint
```

**Environment Variables** (create `.env.local`):

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Key Dependencies**:

- `@supabase/supabase-js` - Supabase client (⚠️ NOT `supabase` package)
- `react` + `react-dom` - React framework
- `react-router-dom` - Routing
- `framer-motion` - Animations
- `lucide-react` - Icons
- `tailwindcss` - Styling

**Tech Stack**:

- **Build Tool**: Vite (not Create React App)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Linting**: ESLint

### Backend Setup

**Location**: `application/backend/`

**Database**: Supabase (PostgreSQL)

**Key Files**:

- `database_schema.sql` - Complete database schema
- Run in Supabase SQL Editor to set up tables

**Storage Setup**:

- Create bucket named `audio` in Supabase Storage
- Set as public bucket
- Configure policies for service role and public read

### AI Model Setup

**Location**: `application/ai_model/`

**Language**: Python 3.8+

**Key Dependencies**:

```bash
pip install google-generativeai supabase python-dotenv requests pydub
```

**Environment Variables**:

```env
GOOGLE_AI_API_KEY=your-google-ai-api-key
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**API**: Google Gemini API (via Google AI Studio)

- Get API key: https://makersuite.google.com/app/apikey
- Models: `gemini-1.5-pro` (recommended) or `gemini-1.5-flash` (faster/cheaper)

---

## 📚 Key Conventions & Rules

### 1. Package Management

- **Frontend**: Use `npm` (not pnpm, not yarn)
- **AI Model**: Use `pip` for Python packages
- **Always** run `npm install` after modifying `package.json`

### 2. Environment Variables

- **Never commit** `.env` files or API keys
- Frontend uses `VITE_` prefix for env vars
- Check `.gitignore` for ignored files

### 3. Database Conventions

- Use UUIDs for primary keys
- Always use `TIMESTAMPTZ` for timestamps
- Enable Row Level Security (RLS) on all tables
- Use JSONB for flexible metadata fields

### 4. Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **File Structure**: Feature-based organization

### 5. Import Conventions

- **Supabase**: `import { createClient } from "@supabase/supabase-js"` (⚠️ correct package name)
- **React**: Use named imports from 'react'
- **Components**: Import from `@/components` or relative paths

### 6. Error Handling

- Always check `error` from Supabase queries
- Handle RLS permission errors gracefully
- Log errors to `device_events` table for hardware issues

---

## 🔍 Common Tasks & Patterns

### Adding a New Frontend Component

1. Create component in `application/frontend/src/components/`
2. Use TypeScript interfaces for props
3. Import Supabase client from `@/lib/supabase`
4. Handle loading and error states
5. Add to appropriate page in `src/pages/`

**Example**:

```typescript
// src/components/NewComponent.tsx
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface Props {
  userId: string
}

export function NewComponent({ userId }: Props) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchData()
  }, [userId])
  
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', userId)
  
    if (error) {
      console.error('Error:', error)
      return
    }
  
    setData(data)
    setLoading(false)
  }
  
  if (loading) return <div>Loading...</div>
  return <div>{/* Component JSX */}</div>
}
```

### Querying Database

**Pattern**: Always use Supabase client, never raw SQL from frontend

```typescript
// ✅ Good: Using Supabase client
const { data, error } = await supabase
  .from('notes')
  .select('*, devices(device_name)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50)

// ❌ Bad: Raw SQL (don't do this)
```

### Real-time Subscriptions

**Pattern**: Subscribe to changes, cleanup on unmount

```typescript
useEffect(() => {
  const channel = supabase
    .channel('notes-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Handle new note
      setNotes(prev => [payload.new, ...prev])
    })
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

### Processing Transcription

**Pattern**: Background job fetches pending notes, transcribes, updates database

```python
# Fetch notes needing transcription
response = supabase.table("notes").select("*").eq("is_processed", False).not_.is_("audio_file_url", "null").execute()

for note in response.data:
    # Download audio
    audio_path = download_audio(note["audio_file_url"])
  
    # Transcribe with Gemini
    transcription = transcribe_audio(audio_path)
  
    # Update note
    supabase.table("notes").update({
        "text": transcription["text"],
        "is_processed": True
    }).eq("id", note["id"]).execute()
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution**:

- Check `package.json` has `"@supabase/supabase-js"` (not `"supabase"`)
- Run `npm install` in `application/frontend/`

### Issue: "Permission denied" errors

**Solution**:

- Check Row Level Security (RLS) policies in Supabase
- Verify user is authenticated: `await supabase.auth.getUser()`
- Ensure user owns the resource (check `user_id` matches)

### Issue: "Audio file not found" in transcription

**Solution**:

- Verify `audio` bucket exists in Supabase Storage
- Check `audio_file_url` is valid public URL
- Ensure storage policies allow public read

### Issue: "Rate limit exceeded" with Gemini API

**Solution**:

- Implement retry logic with exponential backoff
- Use `gemini-1.5-flash` for faster/cheaper option
- Check API quota in Google AI Studio

### Issue: TypeScript errors in Vite

**Solution**:

- Check `tsconfig.json` and `tsconfig.app.json` configuration
- Ensure imports use correct paths
- Run `npm run lint` to see detailed errors

---

## 📖 Documentation References

### Essential Reading

- **Database**: `docs/db/Database_Design_Documentation.md`
- **Frontend**: `docs/integration/frontend/Frontend_Integration_Guide.md`
- **AI**: `docs/integration/ai/AI_Integration_Guide.md`
- **Hardware**: `docs/integration/hardware/Hardware_Integration_Guide.md`

### Quick References

- **Database Schema**: `application/backend/database_schema.sql`
- **Supabase Client**: `application/frontend/src/lib/supabase.ts`
- **AI Model**: `application/ai_model/ai_transcript.py`

---

## ✅ Checklist for AI Agents

Before making changes, ensure:

- [ ] Read relevant documentation in `docs/`
- [ ] Understand the data flow (ESP32 → Storage → Database → Transcription)
- [ ] Check existing code patterns in similar files
- [ ] Verify package names are correct (`@supabase/supabase-js`, not `supabase`)
- [ ] Test locally before suggesting changes
- [ ] Consider RLS policies when querying database
- [ ] Handle loading and error states in UI components
- [ ] Clean up subscriptions and event listeners
- [ ] Use TypeScript types for all data structures
- [ ] Follow existing naming conventions

---

## 🎯 Key Principles

1. **Data Flow**: ESP32 → Supabase Storage → Database → Background Transcription → Frontend Display
2. **Summarization**: User-triggered only, never automatic
3. **Security**: Always verify user ownership before database operations
4. **Error Handling**: Graceful degradation, informative error messages
5. **Performance**: Use pagination, limit queries, optimize subscriptions
6. **Type Safety**: Use TypeScript types, avoid `any` types

---

## 🔗 External Resources

- **Supabase Docs**: https://supabase.com/docs
- **Google AI Studio**: https://makersuite.google.com
- **Gemini API Docs**: https://ai.google.dev/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vite.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs

---

## 📝 Notes for AI Agents

- **Always** check the database schema before querying
- **Never** hardcode API keys or secrets
- **Always** verify user authentication before database operations
- **Remember** summarization is user-triggered, not automatic
- **Use** Supabase client methods, not raw SQL
- **Check** RLS policies when debugging permission errors
- **Follow** existing code patterns and conventions
- **Test** changes locally before suggesting them

---

**Last Updated**: 2025-01-XX
**Project Version**: 1.0
**Maintained by**: Development Team

---

*This file is designed to help AI agents navigate the repository effectively. Update it as the project evolves.*
