# Database Design Documentation
## ESP32 Transcription Device - Project 5

**Version:** 1.0  
**Last Updated:** 16.12.2025
**Database System:** PostgreSQL (Supabase)  
**Target Audience:** Database Administrators, Backend Developers, System Architects

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Database Architecture](#database-architecture)
4. [Table Schemas](#table-schemas)
5. [Data Relationships](#data-relationships)
6. [Indexes and Performance](#indexes-and-performance)
7. [Data Flow and Integration](#data-flow-and-integration)
8. [Implementation Guide](#implementation-guide)
9. [API Integration](#api-integration)
10. [Performance Optimization](#performance-optimization)
11. [Security and Access Control](#security-and-access-control)
12. [Maintenance and Monitoring](#maintenance-and-monitoring)

---

## Introduction

### Purpose

This document provides a comprehensive guide to the database design for the ESP32 Transcription Device system. The database serves as the central data store for audio transcriptions, device management, user accounts, AI-generated summaries, and system analytics.

### Scope

This documentation covers:
- Complete database schema with all tables, fields, and relationships
- Data flow from ESP32 devices through the system
- Integration patterns for frontend, hardware, and AI components
- Security policies and access control
- Performance optimization strategies
- Maintenance procedures

### Document Conventions

- **Code blocks** contain SQL statements or configuration examples
- **Bold text** highlights important concepts or key fields
- **Italic text** provides additional context or notes
- Tables summarize information for quick reference

---

## System Overview

### What This System Does

The ESP32 Transcription Device system enables users to:
1. **Record audio** using ESP32 hardware devices
2. **Transcribe speech** to text using AI services
3. **Store and organize** transcriptions as searchable notes
4. **Generate summaries** from multiple notes using AI
5. **Visualize and analyze** data through a web interface
6. **Manage devices** and user access

### Key Requirements

The database must support:

| Requirement | Description |
|------------|-------------|
| **Device Management** | Track ESP32 devices, their status, battery levels, and connectivity |
| **Transcription Storage** | Store transcribed text with metadata (language, confidence, timestamps) |
| **User Management** | Handle user accounts, authentication, and device assignments |
| **AI Integration** | Support AI-generated summaries with key points, sentiment, and topics |
| **Real-time Updates** | Enable live data synchronization for dashboards |
| **Analytics** | Provide aggregated statistics and reporting capabilities |
| **Scalability** | Handle growing numbers of devices and notes efficiently |

### Technology Stack

- **Database**: PostgreSQL (via Supabase)
- **API**: RESTful API (Supabase PostgREST)
- **Real-time**: WebSocket subscriptions (Supabase Realtime)
- **Authentication**: Supabase Auth (with Row Level Security)

---

## Database Architecture

### Design Philosophy

This database follows a **normalized relational design** optimized for:

1. **Data Integrity**: Foreign keys and constraints ensure referential integrity
2. **Query Performance**: Strategic indexes support fast lookups and aggregations
3. **Scalability**: Design accommodates growth in devices and data volume
4. **Flexibility**: JSONB fields allow extensibility without schema changes
5. **Security**: Row Level Security (RLS) enforces data access policies

### Core Principles

#### 1. Normalization (3NF)

**What it means**: Data is organized to eliminate redundancy and prevent inconsistencies.

**Why it matters**: 
- Reduces storage requirements
- Prevents data anomalies (e.g., updating device info in one place updates it everywhere)
- Ensures data consistency across the system

**Example**: Device information is stored once in the `devices` table, and notes reference it via `device_id` rather than duplicating device details.

#### 2. Time-Series Optimization

**What it means**: Tables storing time-based data (like notes) are optimized for temporal queries.

**Why it matters**:
- Fast retrieval of recent notes
- Efficient date range queries
- Optimized aggregations by time periods

**Implementation**: Indexes on `created_at` and `recorded_at` with descending order for recent-first queries.

#### 3. Scalability

**What it means**: The design can handle increasing data volumes without performance degradation.

**Why it matters**:
- System can grow from 10 devices to 10,000+ devices
- Handles millions of notes efficiently
- Maintains performance as data accumulates

**Implementation**: 
- Proper indexing strategy
- Partitioning capability for very large tables
- Efficient query patterns

#### 4. Data Integrity

**What it means**: Rules and constraints ensure data quality and consistency.

**Why it matters**:
- Prevents invalid data from entering the system
- Maintains referential integrity (e.g., can't delete a device that has notes)
- Validates data at the database level

**Implementation**: 
- Foreign key constraints
- Check constraints (e.g., battery_level between 0-100)
- NOT NULL constraints on required fields

#### 5. Audit Trail

**What it means**: The system tracks when records are created and modified.

**Why it matters**:
- Debugging and troubleshooting
- Compliance and auditing
- Understanding data history

**Implementation**: `created_at` and `updated_at` timestamps on all tables, with automatic updates via triggers.

---

## Table Schemas

This section describes each table in detail, explaining its purpose, structure, and usage patterns.

---

### 1. `devices` - Device Registry

**Purpose**: Central registry for all ESP32 devices in the system. Tracks device information, status, and connectivity.

**When to use**: 
- Register a new ESP32 device
- Check device status and battery level
- Monitor device connectivity (via `last_seen_at`)
- Update device information

**Schema**:

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50) DEFAULT 'esp32',
    firmware_version VARCHAR(50),
    hardware_version VARCHAR(50),
    mac_address VARCHAR(17) UNIQUE,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')),
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT valid_mac CHECK (mac_address ~ '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')
);
```

**Field Descriptions**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | UUID | Yes | Primary key, auto-generated | `550e8400-e29b-41d4-a716-446655440000` |
| `device_id` | VARCHAR(100) | Yes | Unique string identifier from ESP32 | `"esp32-device-001"` |
| `device_name` | VARCHAR(255) | No | Human-readable name for display | `"Office Device"` |
| `device_type` | VARCHAR(50) | No | Type of device (default: 'esp32') | `"esp32"` |
| `firmware_version` | VARCHAR(50) | No | Current firmware version | `"1.2.3"` |
| `hardware_version` | VARCHAR(50) | No | Hardware revision | `"v2.0"` |
| `mac_address` | VARCHAR(17) | No | MAC address for identification | `"AA:BB:CC:DD:EE:FF"` |
| `location` | VARCHAR(255) | No | Physical location description | `"Conference Room A"` |
| `status` | VARCHAR(20) | No | Operational status | `"active"`, `"offline"`, `"maintenance"` |
| `battery_level` | INTEGER | No | Battery percentage (0-100) | `85` |
| `last_seen_at` | TIMESTAMPTZ | No | Last communication timestamp | `2024-01-15T10:30:00Z` |
| `created_at` | TIMESTAMPTZ | Auto | Record creation timestamp | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto | Last update timestamp | Auto-updated |
| `metadata` | JSONB | No | Flexible storage for additional info | `{"custom_field": "value"}` |

**Key Constraints**:
- `device_id` must be unique across all devices
- `status` can only be: 'active', 'inactive', 'maintenance', or 'offline'
- `battery_level` must be between 0 and 100
- `mac_address` must match MAC address format (if provided)

**Indexes**:
- `idx_devices_device_id`: Fast lookup by device_id string
- `idx_devices_status`: Filter devices by status
- `idx_devices_last_seen`: Sort by connectivity (most recent first)

**Common Queries**:

```sql
-- Get all active devices
SELECT * FROM devices WHERE status = 'active';

-- Check device connectivity (offline if not seen in 5 minutes)
SELECT device_id, 
       CASE 
         WHEN last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'online'
         ELSE 'offline'
       END as connectivity
FROM devices;

-- Update battery level
UPDATE devices SET battery_level = 85 WHERE device_id = 'esp32-test';
```

---

### 2. `users`

User accounts for accessing the system.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    full_name VARCHAR(255),
    password_hash VARCHAR(255), -- If using custom auth
    auth_provider VARCHAR(50) DEFAULT 'supabase', -- 'supabase', 'google', etc.
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

**Fields:**
- `id`: Primary key (UUID)
- `email`: User email (unique)
- `username`: Optional username
- `full_name`: Display name
- `password_hash`: For custom authentication (if not using Supabase Auth)
- `auth_provider`: Authentication provider
- `role`: User role/permissions
- `is_active`: Account status
- `preferences`: User settings in JSON format

---

### 3. `device_assignments`

Links users to devices (many-to-many relationship).

```sql
CREATE TABLE device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB -- e.g., {"can_edit": true, "can_delete": false}
);

-- Partial unique index: only one active assignment per user-device pair
CREATE UNIQUE INDEX idx_device_assignments_unique_active 
    ON device_assignments(user_id, device_id) 
    WHERE is_active = TRUE;

CREATE INDEX idx_device_assignments_user ON device_assignments(user_id);
CREATE INDEX idx_device_assignments_device ON device_assignments(device_id);
CREATE INDEX idx_device_assignments_active ON device_assignments(is_active);
```

**Fields:**
- `id`: Primary key
- `user_id`: Reference to users table
- `device_id`: Reference to devices table
- `assigned_at`: Assignment timestamp
- `unassigned_at`: When assignment ended
- `is_active`: Current assignment status
- `permissions`: JSON object with permission flags

---

### 4. `notes` (Transcriptions)

Main table for storing transcribed text from ESP32 devices.

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(5,2), -- 0.00 to 1.00
    audio_duration_seconds INTEGER,
    audio_file_url TEXT, -- URL to stored audio file
    transcription_model VARCHAR(100), -- e.g., 'whisper-base', 'whisper-large'
    is_processed BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- Array of tags
    metadata JSONB, -- Additional data: temperature, humidity, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_at TIMESTAMPTZ -- When audio was actually recorded
);

CREATE INDEX idx_notes_device ON notes(device_id);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
CREATE INDEX idx_notes_recorded ON notes(recorded_at DESC);
CREATE INDEX idx_notes_language ON notes(language);
CREATE INDEX idx_notes_processed ON notes(is_processed);
CREATE INDEX idx_notes_archived ON notes(is_archived);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_text_search ON notes USING GIN(to_tsvector('english', text));
```

**Fields:**
- `id`: Primary key
- `device_id`: Which device created this note
- `user_id`: Optional user who owns/created this
- `text`: Transcribed text content
- `language`: Language code (ISO 639-1)
- `confidence_score`: Transcription confidence (0-1)
- `audio_duration_seconds`: Length of audio
- `audio_file_url`: Storage location for audio file
- `transcription_model`: Model used for transcription
- `is_processed`: Whether summary/analysis has been generated
- `is_archived`: Archive status
- `tags`: Array of tags for categorization
- `metadata`: JSON for sensor data, location, etc.
- `recorded_at`: Actual recording timestamp (may differ from created_at)

---

### 5. `summaries`

AI-generated summaries of notes or time periods.

```sql
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    summary_type VARCHAR(50) NOT NULL, -- 'note', 'daily', 'weekly', 'custom'
    title VARCHAR(255),
    content TEXT NOT NULL,
    summary_model VARCHAR(100), -- e.g., 'gpt-4', 'claude-3'
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    note_count INTEGER, -- Number of notes summarized
    key_points TEXT[], -- Array of key points
    sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
    topics TEXT[], -- Detected topics
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_note ON summaries(note_id);
CREATE INDEX idx_summaries_device ON summaries(device_id);
CREATE INDEX idx_summaries_user ON summaries(user_id);
CREATE INDEX idx_summaries_type ON summaries(summary_type);
CREATE INDEX idx_summaries_period ON summaries(period_start, period_end);
CREATE INDEX idx_summaries_created ON summaries(created_at DESC);
```

**Fields:**
- `id`: Primary key
- `note_id`: If summarizing a single note
- `device_id`: Device context
- `user_id`: Owner/creator
- `summary_type`: Type of summary
- `title`: Summary title
- `content`: Summary text
- `summary_model`: AI model used
- `period_start/end`: Time range for period summaries
- `note_count`: Number of notes included
- `key_points`: Extracted key points
- `sentiment`: Overall sentiment
- `topics`: Detected topics

---

### 6. `waitlist`

User waitlist for device access or features.

```sql
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    interest_type VARCHAR(50), -- 'device', 'beta', 'feature'
    priority INTEGER DEFAULT 0, -- Higher = more priority
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
    invited_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ, -- When they became a user
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_priority ON waitlist(priority DESC);
CREATE INDEX idx_waitlist_created ON waitlist(created_at);
```

**Fields:**
- `id`: Primary key
- `email`: Waitlist email
- `full_name`: Name
- `phone`: Contact phone
- `interest_type`: What they're interested in
- `priority`: Priority level
- `status`: Current status
- `invited_at`: When invitation was sent
- `converted_at`: When they joined
- `notes`: Admin notes
- `metadata`: Additional data

---

### 7. `device_events`

Log of device events (errors, status changes, etc.).

```sql
CREATE TABLE device_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'status_change'
    event_code VARCHAR(100),
    message TEXT,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'error', 'warning', 'info', 'debug')),
    metadata JSONB,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_events_device ON device_events(device_id);
CREATE INDEX idx_device_events_type ON device_events(event_type);
CREATE INDEX idx_device_events_severity ON device_events(severity);
CREATE INDEX idx_device_events_created ON device_events(created_at DESC);
CREATE INDEX idx_device_events_resolved ON device_events(resolved_at) WHERE resolved_at IS NULL;
```

**Fields:**
- `id`: Primary key
- `device_id`: Source device
- `event_type`: Type of event
- `event_code`: Machine-readable code
- `message`: Human-readable message
- `severity`: Event severity
- `metadata`: Additional event data
- `resolved_at`: When issue was resolved
- `resolved_by`: User who resolved it

---

### 8. `analytics_cache`

Pre-computed analytics for dashboard performance.

```sql
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- 'daily_stats', 'device_summary', etc.
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX idx_analytics_cache_type ON analytics_cache(cache_type);
```

**Fields:**
- `id`: Primary key
- `cache_key`: Unique cache identifier
- `cache_type`: Type of cached data
- `data`: Cached JSON data
- `expires_at`: Cache expiration time
- `created_at`: When cache was created

---

## Relationships

```
users
  ├── device_assignments (many-to-many with devices)
  ├── notes (one-to-many)
  └── summaries (one-to-many)

devices
  ├── device_assignments (many-to-many with users)
  ├── notes (one-to-many)
  ├── summaries (one-to-many)
  └── device_events (one-to-many)

notes
  └── summaries (one-to-many, optional)

waitlist
  └── (converts to users)
```

---

## Indexes

### Performance Indexes
- **Time-series queries**: Indexes on `recorded_at`, `created_at` with DESC ordering
- **Device lookups**: Indexes on `device_id` in all related tables
- **User queries**: Indexes on `user_id` for user-specific data
- **Full-text search**: GIN index on `notes.text` for search
- **Array searches**: GIN indexes on tags and topics arrays
- **Composite indexes**: Multi-column indexes for common query patterns

### Maintenance
- Monitor index usage with `pg_stat_user_indexes`
- Rebuild indexes periodically if needed
- Consider partitioning for very large tables (notes)

---

## Data Flow and Integration

### Confirmed System Workflow

The system follows this **confirmed workflow**:

```
1. ESP32 Device Records Audio
   ↓
2. ESP32 Uploads Audio → Supabase Storage (bucket: "audio")
   - Gets public URL: https://[project-id].supabase.co/storage/v1/object/public/audio/[filename]
   ↓
3. ESP32 Creates Note → Database (notes table)
   - audio_file_url: URL from Supabase Storage
   - text: NULL (not transcribed yet)
   - is_processed: FALSE
   - metadata: { "battery_level": 85 }
   ↓
4. Background Job / API Endpoint (Automatic)
   - Fetches notes where is_processed = FALSE AND audio_file_url IS NOT NULL
   - Downloads audio from audio_file_url
   - Transcribes using Gemini API
   - Updates note:
     * text: Transcribed text
     * is_processed: TRUE
     * transcription_model: "gemini-1.5-pro"
   ↓
5. User Views Notes in Frontend
   - Sees transcribed text
   - Can play audio from audio_file_url
   ↓
6. User Clicks "Summarize" Button (On-Demand)
   - Frontend calls /api/summarize endpoint
   - Backend verifies user owns selected notes
   - Backend generates summary using Gemini API
   - Backend saves summary → Database (summaries table)
   - Frontend displays summary
```

### Key Points

- **Audio Storage**: Audio files are stored in Supabase Storage, not in the database
- **Transcription**: Automatic background processing (not real-time)
- **Summarization**: **ONLY** when user clicks button (not automatic)
- **Battery Updates**: Automatically updated via database trigger when note metadata includes `battery_level`

---

## Data Flow (Legacy - For Reference)

### ESP32 → Database Flow

```
ESP32 Device
    ↓
1. Audio Recording / Sensor Reading
    ↓
2. Local Processing (optional)
    ↓
3. HTTP POST to Supabase API
    ↓
4. Database Insert (notes)
    ↓
5. Trigger/Function (optional processing)
    ↓
6. Summary Generation (background job)
    ↓
7. Analytics Update (scheduled)
```

### Example ESP32 Insert (Note with Audio URL)

**Confirmed Workflow**: ESP32 uploads audio to Supabase Storage first, then creates note with audio URL.

```json
POST /rest/v1/notes
{
  "device_id": "uuid-of-device",
  "audio_file_url": "https://[project-id].supabase.co/storage/v1/object/public/audio/audio_1234567890.wav",
  "text": null,  // Will be filled by transcription service
  "language": "en",
  "confidence_score": null,  // Will be filled by transcription service
  "audio_duration_seconds": 30,
  "is_processed": false,  // Transcription not done yet
  "recorded_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "battery_level": 85
  }
}
```

**After Transcription** (automatic background job):

```json
PATCH /rest/v1/notes?id=eq.[note-id]
{
  "text": "This is the transcribed text from the audio recording...",
  "confidence_score": 0.95,
  "is_processed": true,
  "transcription_model": "gemini-1.5-pro"
}
```

**Note:** The `battery_level` in metadata will automatically update the device's `battery_level` field via database trigger.

---

## Implementation Guide

### Step 1: Create Tables

Execute the SQL schema in Supabase SQL Editor:

```sql
-- Run all CREATE TABLE statements in order
-- Ensure foreign key dependencies are created first
```

### Step 2: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Example RLS Policy for notes (users can only see their own notes)
CREATE POLICY "Users can view their own notes"
ON notes FOR SELECT
USING (auth.uid() = user_id);

-- Example RLS Policy for devices (users can see assigned devices)
CREATE POLICY "Users can view assigned devices"
ON devices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM device_assignments
    WHERE device_assignments.device_id = devices.id
    AND device_assignments.user_id = auth.uid()
    AND device_assignments.is_active = TRUE
  )
);
```

### Step 3: Create Functions and Triggers

#### Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Update device `last_seen_at`

```sql
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE devices
    SET last_seen_at = NOW()
    WHERE id = NEW.device_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_last_seen_on_note
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_seen();
```

#### Update device battery level from note metadata

```sql
CREATE OR REPLACE FUNCTION update_device_battery_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update battery_level if provided in note metadata
    IF NEW.metadata IS NOT NULL AND NEW.metadata ? 'battery_level' THEN
        UPDATE devices
        SET battery_level = (NEW.metadata->>'battery_level')::INTEGER
        WHERE id = NEW.device_id
        AND ((NEW.metadata->>'battery_level')::INTEGER >= 0 AND (NEW.metadata->>'battery_level')::INTEGER <= 100);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_battery_from_note
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_device_battery_level();
```

**Note:** Battery level can be included in the note's `metadata` JSON field when inserting a note, and it will automatically update the device's `battery_level` field.

```

#### Auto-create device if not exists

```sql
CREATE OR REPLACE FUNCTION ensure_device_exists()
RETURNS TRIGGER AS $$
DECLARE
    device_uuid UUID;
BEGIN
    -- Try to find device by device_id string
    SELECT id INTO device_uuid
    FROM devices
    WHERE device_id = NEW.device_id::TEXT;
    
    -- If device doesn't exist, create it
    IF device_uuid IS NULL THEN
        INSERT INTO devices (device_id, device_name, status, last_seen_at)
        VALUES (NEW.device_id::TEXT, NEW.device_id::TEXT, 'active', NOW())
        RETURNING id INTO device_uuid;
    END IF;
    
    -- Update NEW.device_id to UUID
    NEW.device_id = device_uuid;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: This requires modifying the notes table to accept device_id as TEXT initially
-- Or handle device lookup in application layer
```

### Step 4: Create Views for Common Queries

#### Daily Statistics View

```sql
CREATE VIEW daily_statistics AS
SELECT
    DATE(recorded_at) as date,
    device_id,
    COUNT(*) as note_count,
    AVG(confidence_score) as avg_confidence,
    SUM(audio_duration_seconds) as total_duration_seconds,
    COUNT(DISTINCT language) as languages_count
FROM notes
WHERE recorded_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(recorded_at), device_id;
```

#### Device Summary View

```sql
CREATE VIEW device_summary AS
SELECT
    d.id,
    d.device_id,
    d.device_name,
    d.status,
    d.last_seen_at,
    COUNT(DISTINCT n.id) as total_notes,
    MAX(n.created_at) as last_note_at
FROM devices d
LEFT JOIN notes n ON d.id = n.device_id
GROUP BY d.id, d.device_id, d.device_name, d.status, d.last_seen_at;
```

---

## API Integration

### Supabase REST API Endpoints

#### Insert Note (ESP32)

```http
POST https://[project].supabase.co/rest/v1/notes
Content-Type: application/json
apikey: [your-anon-key]
Authorization: Bearer [your-anon-key]

{
  "device_id": "esp32-test",
  "text": "Transcribed text here",
  "language": "en",
  "confidence_score": 0.95,
  "audio_duration_seconds": 10,
  "recorded_at": "2024-01-15T10:30:00Z"
}
```

#### Update Device Battery Level (ESP32)

```http
PATCH https://[project].supabase.co/rest/v1/devices?device_id=eq.esp32-test
Content-Type: application/json
apikey: [your-anon-key]
Authorization: Bearer [your-anon-key]

{
  "battery_level": 85
}
```

**Note:** Battery level can also be included in the note metadata and updated via trigger.

#### Query Notes with Filters

```http
GET https://[project].supabase.co/rest/v1/notes?device_id=eq.[device-uuid]&created_at=gte.2024-01-01&order=created_at.desc
apikey: [your-anon-key]
Authorization: Bearer [your-jwt-token]
```

### Supabase Realtime Subscriptions

```javascript
// Subscribe to new notes
const subscription = supabase
  .channel('notes')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'notes' },
    (payload) => {
      console.log('New note:', payload.new);
    }
  )
  .subscribe();
```

---

## Performance Considerations

### 1. Partitioning for Large Tables

For high-volume time-series data, consider partitioning:

```sql
-- Partition notes by month (if needed for very large datasets)
-- CREATE TABLE notes (
--     -- columns
-- ) PARTITION BY RANGE (created_at);
```

### 2. Archiving Old Data

```sql
-- Archive notes older than 1 year
UPDATE notes
SET is_archived = TRUE
WHERE created_at < NOW() - INTERVAL '1 year'
AND is_archived = FALSE;
```

### 3. Materialized Views for Analytics

```sql
CREATE MATERIALIZED VIEW device_analytics_monthly AS
SELECT
    device_id,
    DATE_TRUNC('month', recorded_at) as month,
    COUNT(*) as note_count,
    AVG(confidence_score) as avg_confidence
FROM notes
GROUP BY device_id, DATE_TRUNC('month', recorded_at);

-- Refresh periodically
REFRESH MATERIALIZED VIEW device_analytics_monthly;
```

### 4. Connection Pooling

- Use Supabase connection pooling
- Limit concurrent connections from ESP32 devices
- Implement retry logic with exponential backoff

---

## Security

### 1. Row Level Security (RLS)

Implement RLS policies to ensure:
- Users can only access their assigned devices
- Users can only view their own notes (unless shared)
- Admins have full access
- ESP32 devices can only insert data (not read)

### 2. API Keys

- Use separate API keys for ESP32 devices (service role key)
- Use anon key for public read operations
- Rotate keys regularly

### 3. Data Validation

```sql
-- Add check constraints
ALTER TABLE notes ADD CONSTRAINT valid_confidence 
    CHECK (confidence_score >= 0 AND confidence_score <= 1);

```

### 4. Rate Limiting

Implement rate limiting at application level:
- Max requests per device per minute
- Max data size per request
- Monitor for suspicious activity

---

## Maintenance Tasks

### Daily
- Monitor device connectivity (check `last_seen_at`)
- Review error logs in `device_events`
- Check database performance metrics

### Weekly
- Generate weekly summaries
- Archive old data
- Update analytics cache
- Review and clean up waitlist

### Monthly
- Analyze database growth
- Optimize indexes
- Review and update RLS policies
- Backup verification

---

## Example Queries

### Get Recent Notes for Device

```sql
SELECT 
    n.id,
    n.text,
    n.language,
    n.confidence_score,
    n.created_at,
    d.device_name
FROM notes n
JOIN devices d ON n.device_id = d.id
WHERE d.device_id = 'esp32-test'
ORDER BY n.created_at DESC
LIMIT 50;
```

### Get Daily Statistics

```sql
SELECT
    DATE(recorded_at) as date,
    COUNT(*) as notes_count,
    AVG(confidence_score) as avg_confidence,
    SUM(audio_duration_seconds) as total_duration
FROM notes
WHERE recorded_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(recorded_at)
ORDER BY date DESC;
```

### Get Device Health Status

```sql
SELECT
    d.device_id,
    d.device_name,
    d.status,
    d.last_seen_at,
    CASE 
        WHEN d.last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN d.last_seen_at > NOW() - INTERVAL '1 hour' THEN 'recent'
        ELSE 'offline'
    END as connectivity_status,
    COUNT(n.id) as notes_last_24h
FROM devices d
LEFT JOIN notes n ON d.id = n.device_id 
    AND n.created_at > NOW() - INTERVAL '24 hours'
GROUP BY d.id, d.device_id, d.device_name, d.status, d.last_seen_at;
```

### Search Notes by Text

```sql
SELECT 
    n.id,
    n.text,
    n.created_at,
    d.device_name
FROM notes n
JOIN devices d ON n.device_id = d.id
WHERE to_tsvector('english', n.text) @@ to_tsquery('english', 'search & term')
ORDER BY n.created_at DESC;
```

---

## Migration Scripts

### Initial Setup

```sql
-- 1. Create all tables
-- 2. Create indexes
-- 3. Create functions
-- 4. Create triggers
-- 5. Enable RLS
-- 6. Create policies
-- 7. Create views
```

### Adding New Fields

```sql
-- Example: Add battery_level to devices
ALTER TABLE devices 
ADD COLUMN battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100);

CREATE INDEX idx_devices_battery ON devices(battery_level);
```

---

## Troubleshooting

### Common Issues

1. **Device not found**: Ensure device exists in `devices` table before inserting notes
2. **Permission denied**: Check RLS policies and user assignments
3. **Slow queries**: Review indexes and query plans
4. **Connection timeouts**: Check connection pooling and network

### Monitoring Queries

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

---

## Appendix

### Data Types Reference

- **UUID**: Unique identifiers (recommended for primary keys)
- **TIMESTAMPTZ**: Timestamp with timezone (always use for dates)
- **TEXT**: Variable-length text (for notes, descriptions)
- **VARCHAR(n)**: Fixed/variable length strings
- **DECIMAL(p,s)**: Precise numeric values
- **INTEGER**: Whole numbers
- **BOOLEAN**: True/false values
- **JSONB**: Binary JSON (efficient for flexible data)
- **TEXT[]**: Array of text values

### Best Practices

1. Always use `TIMESTAMPTZ` for timestamps
2. Use UUIDs for primary keys (better for distributed systems)
3. Index foreign keys
4. Use JSONB for flexible metadata
5. Implement soft deletes (is_archived, is_active flags)
6. Add constraints for data validation
7. Use transactions for multi-table operations
8. Monitor query performance regularly

---

## Support and Updates

For questions or updates to this documentation, please contact the development team.

**Document Version History:**
- v1.0 (16.12.2025): Initial database design

---

*End of Database Design Documentation*

