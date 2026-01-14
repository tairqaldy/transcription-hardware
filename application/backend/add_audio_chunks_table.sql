-- ============================================================================
-- Audio Chunks Table - For ESP32 Binary Audio Storage
-- Project 5 - Supabase PostgreSQL
-- ============================================================================
-- This script adds a new table to store binary audio chunks from ESP32 devices.
-- Each recording session creates multiple chunks (sent every 15 seconds).
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUDIO CHUNKS TABLE
-- ============================================================================

-- Table to store binary audio chunks from ESP32 recording sessions
CREATE TABLE IF NOT EXISTS audio_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    
    -- Session identifier: All chunks from the same recording session share this ID
    -- Generated when recording starts (button press), used for all chunks until recording stops
    session_id UUID NOT NULL,
    
    -- Chunk sequence number within the session (1, 2, 3, ...)
    -- Helps reconstruct the audio in the correct order
    chunk_sequence INTEGER NOT NULL CHECK (chunk_sequence > 0),
    
    -- Binary audio data (raw PCM audio bytes)
    audio_data BYTEA NOT NULL,
    
    -- Size of audio data in bytes
    data_size_bytes INTEGER NOT NULL CHECK (data_size_bytes > 0),
    
    -- Duration of this chunk in seconds (typically ~15 seconds)
    duration_seconds DECIMAL(5,2),
    
    -- Sample rate (e.g., 16000 Hz)
    sample_rate INTEGER DEFAULT 16000,
    
    -- Bits per sample (e.g., 16)
    bits_per_sample INTEGER DEFAULT 16,
    
    -- Number of audio channels (1 = mono, 2 = stereo)
    channels INTEGER DEFAULT 1,
    
    -- Timestamp when this chunk was recorded on the device
    recorded_at TIMESTAMPTZ,
    
    -- Timestamp when this chunk was received/inserted into database
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata (JSONB for flexible storage of additional info)
    metadata JSONB,
    
    -- Ensure unique combination of session_id and chunk_sequence
    -- Prevents duplicate chunks in the same session
    CONSTRAINT unique_session_chunk UNIQUE (session_id, chunk_sequence)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast lookup by device
CREATE INDEX IF NOT EXISTS idx_audio_chunks_device ON audio_chunks(device_id);

-- Index for fast lookup by session (to retrieve all chunks of a session)
CREATE INDEX IF NOT EXISTS idx_audio_chunks_session ON audio_chunks(session_id);

-- Index for ordering chunks within a session
CREATE INDEX IF NOT EXISTS idx_audio_chunks_session_sequence ON audio_chunks(session_id, chunk_sequence);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audio_chunks_recorded_at ON audio_chunks(recorded_at DESC);

-- Index for created_at queries
CREATE INDEX IF NOT EXISTS idx_audio_chunks_created_at ON audio_chunks(created_at DESC);

-- Composite index for device + session queries
CREATE INDEX IF NOT EXISTS idx_audio_chunks_device_session ON audio_chunks(device_id, session_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get total duration of a recording session
CREATE OR REPLACE FUNCTION get_session_duration(session_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_duration DECIMAL;
BEGIN
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO total_duration
    FROM audio_chunks
    WHERE session_id = session_uuid;
    
    RETURN total_duration;
END;
$$ LANGUAGE plpgsql;

-- Function to get total size of a recording session
CREATE OR REPLACE FUNCTION get_session_size(session_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT;
BEGIN
    SELECT COALESCE(SUM(data_size_bytes), 0)
    INTO total_size
    FROM audio_chunks
    WHERE session_id = session_uuid;
    
    RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- Function to get chunk count for a session
CREATE OR REPLACE FUNCTION get_session_chunk_count(session_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    chunk_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO chunk_count
    FROM audio_chunks
    WHERE session_id = session_uuid;
    
    RETURN chunk_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View to see recording sessions summary
CREATE OR REPLACE VIEW recording_sessions AS
SELECT
    session_id,
    device_id,
    MIN(recorded_at) as session_start_time,
    MAX(recorded_at) as session_end_time,
    COUNT(*) as total_chunks,
    SUM(duration_seconds) as total_duration_seconds,
    SUM(data_size_bytes) as total_size_bytes,
    AVG(duration_seconds) as avg_chunk_duration_seconds,
    MIN(chunk_sequence) as first_chunk_sequence,
    MAX(chunk_sequence) as last_chunk_sequence
FROM audio_chunks
GROUP BY session_id, device_id
ORDER BY session_start_time DESC;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update device last_seen_at when audio chunk is inserted
DROP TRIGGER IF EXISTS update_device_last_seen_on_audio_chunk ON audio_chunks;
CREATE TRIGGER update_device_last_seen_on_audio_chunk
    AFTER INSERT ON audio_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_seen();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on audio_chunks table
ALTER TABLE audio_chunks ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert audio chunks (for ESP32)
DROP POLICY IF EXISTS "Service role can insert audio chunks" ON audio_chunks;
CREATE POLICY "Service role can insert audio chunks"
ON audio_chunks FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to view audio chunks from their assigned devices
DROP POLICY IF EXISTS "Users can view audio chunks from assigned devices" ON audio_chunks;
CREATE POLICY "Users can view audio chunks from assigned devices"
ON audio_chunks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM device_assignments
        WHERE device_assignments.device_id = audio_chunks.device_id
        AND device_assignments.user_id = auth.uid()
        AND device_assignments.is_active = TRUE
    )
    OR auth.jwt() ->> 'role' = 'admin'
);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Audio chunks table created successfully!';
    RAISE NOTICE 'Table: audio_chunks';
    RAISE NOTICE 'Key features:';
    RAISE NOTICE '  - session_id: Groups chunks from the same recording session';
    RAISE NOTICE '  - chunk_sequence: Orders chunks within a session';
    RAISE NOTICE '  - audio_data: BYTEA column for binary audio storage';
    RAISE NOTICE '  - Indexes: Optimized for session and device queries';
    RAISE NOTICE '  - Views: recording_sessions view for session summaries';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update ESP32 code to generate session_id on button press';
    RAISE NOTICE '2. Send chunks every 15 seconds with session_id and chunk_sequence';
    RAISE NOTICE '3. Test insertion with sample audio data';
END $$;
