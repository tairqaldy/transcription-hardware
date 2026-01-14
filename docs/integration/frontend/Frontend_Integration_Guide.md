# Frontend Integration Guide
## Building the User Interface for ESP32 Transcription Device

**Target Audience:** Frontend Developers  
**Version:** 1.0  
**Last Updated:** 16.12.2025

*Any Questions? Submit issue request or ask a teamate!*

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Supabase Client Setup](#supabase-client-setup)
5. [Authentication](#authentication)
6. [Data Fetching](#data-fetching)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [Common UI Patterns](#common-ui-patterns)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Overview

This guide helps frontend developers integrate with the Supabase backend to build the user interface for the ESP32 transcription device application. You'll learn how to:

- Set up Supabase client in your frontend framework
- Implement user authentication
- Fetch and display notes, devices, and summaries
- Subscribe to real-time updates
- Build common UI components

---

## Prerequisites

- Basic knowledge of JavaScript/TypeScript
- Familiarity with React, Vue, or your chosen frontend framework
- Supabase project URL and anon key (from your backend team)
- Node.js and npm/yarn installed

---

## Getting Started

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### 2. Get Your Credentials

From your Supabase project dashboard:
- **Project URL**: `https://[project-id].supabase.co`
- **Anon Key**: Public key for client-side operations

**⚠️ Important**: Never commit these keys to version control. Use environment variables.

---

## Supabase Client Setup

### React Example

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Vue Example

```typescript
// composables/useSupabase.ts
import { createClient } from '@supabase/supabase-js'

export const useSupabase = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  return createClient(supabaseUrl, supabaseAnonKey)
}
```

### Environment Variables

Create `.env.local` (or `.env`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Authentication

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'John Doe',
    }
  }
})
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
})
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut()
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

### Listen to Auth Changes

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  console.log('Session:', session)
  
  if (event === 'SIGNED_IN') {
    // Redirect to dashboard
  } else if (event === 'SIGNED_OUT') {
    // Redirect to login
  }
})
```

---

## Data Fetching

### Fetch User's Notes

```typescript
// Get notes for current user
const { data: notes, error } = await supabase
  .from('notes')
  .select('*, devices(device_id, device_name)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(50)

if (error) {
  console.error('Error fetching notes:', error)
  return
}

// notes is an array of note objects
```

### Fetch Assigned Devices

```typescript
// Get devices assigned to current user
const { data: devices, error } = await supabase
  .from('device_assignments')
  .select('devices(*)')
  .eq('user_id', user.id)
  .eq('is_active', true)

if (error) {
  console.error('Error fetching devices:', error)
  return
}

// Extract devices from assignments
const userDevices = devices.map(assignment => assignment.devices)
```

### Fetch Device Summary

```typescript
// Get device summary with statistics
const { data: summary, error } = await supabase
  .from('device_summary')
  .select('*')
  .eq('device_id', deviceUuid)
  .single()

if (error) {
  console.error('Error fetching device summary:', error)
  return
}

// summary contains: total_notes, last_note_at, battery_level, etc.
```

### Fetch Summaries

```typescript
// Get AI-generated summaries
const { data: summaries, error } = await supabase
  .from('summaries')
  .select('*, notes(text, created_at)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error fetching summaries:', error)
  return
}
```

### Search Notes

```typescript
// Full-text search in notes
const { data: notes, error } = await supabase
  .from('notes')
  .select('*')
  .textSearch('text', 'search term')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// Or use ilike for simple pattern matching
const { data: notes, error } = await supabase
  .from('notes')
  .select('*')
  .ilike('text', '%search term%')
  .eq('user_id', user.id)
```

### Filter Notes by Date Range

```typescript
const startDate = '2024-01-01'
const endDate = '2024-01-31'

const { data: notes, error } = await supabase
  .from('notes')
  .select('*')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

### Filter Notes by Device

```typescript
const { data: notes, error } = await supabase
  .from('notes')
  .select('*')
  .eq('device_id', deviceUuid)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

---

## Real-time Subscriptions

### Subscribe to New Notes

```typescript
const channel = supabase
  .channel('notes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      console.log('New note received:', payload.new)
      // Update your UI with the new note
      setNotes(prev => [payload.new, ...prev])
    }
  )
  .subscribe()

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel)
}
```

### Subscribe to Device Updates

```typescript
const channel = supabase
  .channel('devices')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'devices',
      filter: `id=eq.${deviceUuid}`
    },
    (payload) => {
      console.log('Device updated:', payload.new)
      // Update device status, battery level, etc.
      if (payload.new.battery_level !== undefined) {
        updateBatteryLevel(payload.new.battery_level)
      }
    }
  )
  .subscribe()
```

### Subscribe to Multiple Events

```typescript
const channel = supabase
  .channel('user-updates')
  .on(
    'postgres_changes',
    {
      event: '*', // All events
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        // Handle new note
      } else if (payload.eventType === 'UPDATE') {
        // Handle note update
      } else if (payload.eventType === 'DELETE') {
        // Handle note deletion
      }
    }
  )
  .subscribe()
```

---

## Common UI Patterns

### Notes List Component

```typescript
// React example
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function NotesList({ userId }: { userId: string }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchNotes()
    subscribeToNotes()
  }, [userId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*, devices(device_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotes = () => {
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotes(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {notes.map(note => (
        <div key={note.id}>
          <h3>{note.devices?.device_name}</h3>
          <p>{note.text}</p>
          <span>{new Date(note.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
```

### Device Status Component

```typescript
export function DeviceStatus({ deviceId }: { deviceId: string }) {
  const [device, setDevice] = useState(null)
  const [batteryLevel, setBatteryLevel] = useState(null)

  useEffect(() => {
    fetchDevice()
    subscribeToDevice()
  }, [deviceId])

  const fetchDevice = async () => {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (data) {
      setDevice(data)
      setBatteryLevel(data.battery_level)
    }
  }

  const subscribeToDevice = () => {
    const channel = supabase
      .channel('device-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `id=eq.${deviceId}`
        },
        (payload) => {
          if (payload.new.battery_level !== undefined) {
            setBatteryLevel(payload.new.battery_level)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const getStatusColor = () => {
    if (!device) return 'gray'
    const lastSeen = new Date(device.last_seen_at)
    const minutesAgo = (Date.now() - lastSeen.getTime()) / 1000 / 60
    
    if (minutesAgo < 5) return 'green' // Online
    if (minutesAgo < 60) return 'yellow' // Recent
    return 'red' // Offline
  }

  return (
    <div>
      <div>Status: {device?.status}</div>
      <div>Battery: {batteryLevel}%</div>
      <div style={{ color: getStatusColor() }}>
        Last seen: {device?.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Never'}
      </div>
    </div>
  )
}
```

### Daily Statistics Chart

```typescript
export function DailyStatistics({ deviceId }: { deviceId: string }) {
  const [stats, setStats] = useState([])

  useEffect(() => {
    fetchStatistics()
  }, [deviceId])

  const fetchStatistics = async () => {
    const { data } = await supabase
      .from('daily_statistics')
      .select('*')
      .eq('device_id', deviceId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (data) {
      setStats(data)
    }
  }

  return (
    <div>
      <h3>Last 7 Days</h3>
      {stats.map(stat => (
        <div key={stat.date}>
          <div>Date: {stat.date}</div>
          <div>Notes: {stat.note_count}</div>
          <div>Avg Confidence: {(stat.avg_confidence * 100).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  )
}
```

---

## Error Handling

### Standard Error Handling Pattern

```typescript
async function fetchData() {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')

    if (error) {
      // Handle Supabase error
      if (error.code === 'PGRST116') {
        // No rows returned
        return []
      } else if (error.code === '42501') {
        // Permission denied (RLS)
        throw new Error('You do not have permission to access this data')
      } else {
        throw error
      }
    }

    return data
  } catch (error) {
    // Handle network or other errors
    console.error('Fetch error:', error)
    throw error
  }
}
```

### Error Boundary (React)

```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## Best Practices

### 1. Use TypeScript Types

```typescript
// types/database.ts
export interface Note {
  id: string
  device_id: string
  user_id: string
  text: string
  language: string
  confidence_score: number
  audio_duration_seconds: number | null
  is_processed: boolean
  is_archived: boolean
  tags: string[] | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
  recorded_at: string | null
}

export interface Device {
  id: string
  device_id: string
  device_name: string | null
  device_type: string
  status: 'active' | 'inactive' | 'maintenance' | 'offline'
  battery_level: number | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}
```

### 2. Create Custom Hooks

```typescript
// hooks/useNotes.ts
export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotes()
    const unsubscribe = subscribeToNotes()
    return unsubscribe
  }, [userId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*, devices(device_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotes = () => {
    const channel = supabase
      .channel('notes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotes(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return { notes, loading, error, refetch: fetchNotes }
}
```

### 3. Implement Pagination

```typescript
async function fetchNotesPaginated(page: number, pageSize: number = 20) {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  return { data, error, totalCount: count }
}
```

### 4. Optimize Queries

```typescript
// ✅ Good: Select only needed fields
const { data } = await supabase
  .from('notes')
  .select('id, text, created_at') // Only what you need

// ❌ Bad: Select all fields
const { data } = await supabase
  .from('notes')
  .select('*') // Fetches everything
```

### 5. Handle Loading States

```typescript
const [loading, setLoading] = useState(true)
const [data, setData] = useState(null)

useEffect(() => {
  async function load() {
    setLoading(true)
    const result = await fetchData()
    setData(result)
    setLoading(false)
  }
  load()
}, [])

if (loading) return <LoadingSpinner />
if (!data) return <EmptyState />
return <DataDisplay data={data} />
```

---

## Common API Patterns

### Update Note

```typescript
const { data, error } = await supabase
  .from('notes')
  .update({ 
    tags: ['important', 'meeting'],
    is_archived: false 
  })
  .eq('id', noteId)
  .eq('user_id', userId) // Security: ensure user owns the note
```

### Delete Note

```typescript
const { error } = await supabase
  .from('notes')
  .delete()
  .eq('id', noteId)
  .eq('user_id', userId)
```

### Archive Note

```typescript
const { error } = await supabase
  .from('notes')
  .update({ is_archived: true })
  .eq('id', noteId)
  .eq('user_id', userId)
```

### Generate Summary (User-Triggered)

**Important**: Summarization is **NOT automatic**. It only happens when the user clicks a "Summarize" button in the UI.

```typescript
// Call your backend API endpoint for summarization
async function generateSummary(noteIds: string[], summaryType: 'custom' | 'daily' | 'weekly' = 'custom') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Call your backend API (FastAPI, Express, etc.)
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: JSON.stringify({
      note_ids: noteIds,
      summary_type: summaryType,
      user_id: user.id
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to generate summary')
  }
  
  const result = await response.json()
  return result.summary_id
}
```

### React Component Example: Summarization Button

```typescript
import { useState } from 'react'
import { generateSummary } from './api'

interface SummarizeButtonProps {
  noteIds: string[]
  summaryType?: 'custom' | 'daily' | 'weekly'
}

function SummarizeButton({ noteIds, summaryType = 'custom' }: SummarizeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryId, setSummaryId] = useState<string | null>(null)
  
  const handleSummarize = async () => {
    if (noteIds.length === 0) {
      setError('Please select at least one note')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const id = await generateSummary(noteIds, summaryType)
      setSummaryId(id)
      
      // Optionally redirect to summary or show success message
      alert('Summary generated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <button 
        onClick={handleSummarize}
        disabled={loading || noteIds.length === 0}
        className="summarize-button"
      >
        {loading ? 'Generating Summary...' : 'Summarize Notes'}
      </button>
      
      {error && <p className="error">{error}</p>}
      {summaryId && <p className="success">Summary ID: {summaryId}</p>}
    </div>
  )
}

// Usage
function NotesList() {
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  
  return (
    <div>
      {/* Your notes list with checkboxes */}
      <SummarizeButton 
        noteIds={selectedNotes}
        summaryType="custom"
      />
    </div>
  )
}
```

---

## Testing

### Mock Supabase Client

```typescript
// __mocks__/supabase.ts
export const supabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }))
}
```

---

## Next Steps

1. Set up your frontend project with Supabase client
2. Implement authentication flow
3. Build your first data-fetching component
4. Add real-time subscriptions
5. Create reusable hooks and components
6. Test your implementation

---

## Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

*Last updated: 16.12.2025*
