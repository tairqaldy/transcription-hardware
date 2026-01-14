-- ============================================================================
-- ESP32 Transcription Device - Database Schema
-- Project 5 - Supabase PostgreSQL
-- ============================================================================
-- Execute this script in Supabase SQL Editor to create all tables, indexes,
-- functions, triggers, and views.
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Devices Table
CREATE TABLE IF NOT EXISTS devices (
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
    CONSTRAINT valid_mac CHECK (mac_address IS NULL OR mac_address ~ '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    full_name VARCHAR(255),
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'supabase',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB
);

-- 3. Device Assignments Table
CREATE TABLE IF NOT EXISTS device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB
);

-- 4. Notes Table (Transcriptions)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    audio_duration_seconds INTEGER,
    audio_file_url TEXT,
    transcription_model VARCHAR(100),
    is_processed BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_at TIMESTAMPTZ
);

-- 5. Summaries Table
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    summary_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    summary_model VARCHAR(100),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    note_count INTEGER,
    key_points TEXT[],
    sentiment VARCHAR(20),
    topics TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    interest_type VARCHAR(50),
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
    invited_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Device Events Table
CREATE TABLE IF NOT EXISTS device_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_code VARCHAR(100),
    message TEXT,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'error', 'warning', 'info', 'debug')),
    metadata JSONB,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Analytics Cache Table
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Device Assignments indexes
CREATE INDEX IF NOT EXISTS idx_device_assignments_user ON device_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_device ON device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_active ON device_assignments(is_active);
-- Partial unique index: only one active assignment per user-device pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_assignments_unique_active 
    ON device_assignments(user_id, device_id) 
    WHERE is_active = TRUE;

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_device ON notes(device_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_recorded ON notes(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_language ON notes(language);
CREATE INDEX IF NOT EXISTS idx_notes_processed ON notes(is_processed);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_text_search ON notes USING GIN(to_tsvector('english', text));

-- Devices battery level index
CREATE INDEX IF NOT EXISTS idx_devices_battery ON devices(battery_level);

-- Summaries indexes
CREATE INDEX IF NOT EXISTS idx_summaries_note ON summaries(note_id);
CREATE INDEX IF NOT EXISTS idx_summaries_device ON summaries(device_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_type ON summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_summaries_period ON summaries(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_summaries_created ON summaries(created_at DESC);

-- Waitlist indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at);

-- Device Events indexes
CREATE INDEX IF NOT EXISTS idx_device_events_device ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_type ON device_events(event_type);
CREATE INDEX IF NOT EXISTS idx_device_events_severity ON device_events(severity);
CREATE INDEX IF NOT EXISTS idx_device_events_created ON device_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_resolved ON device_events(resolved_at) WHERE resolved_at IS NULL;

-- Analytics Cache indexes
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_type ON analytics_cache(cache_type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update device last_seen_at
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE devices
    SET last_seen_at = NOW()
    WHERE id = NEW.device_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get or create device by device_id string
CREATE OR REPLACE FUNCTION get_or_create_device(device_id_text VARCHAR(100))
RETURNS UUID AS $$
DECLARE
    device_uuid UUID;
BEGIN
    -- Try to find existing device
    SELECT id INTO device_uuid
    FROM devices
    WHERE device_id = device_id_text;
    
    -- If not found, create it
    IF device_uuid IS NULL THEN
        INSERT INTO devices (device_id, device_name, status, last_seen_at)
        VALUES (device_id_text, device_id_text, 'active', NOW())
        RETURNING id INTO device_uuid;
    END IF;
    
    RETURN device_uuid;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at triggers
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at 
    BEFORE UPDATE ON devices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_summaries_updated_at ON summaries;
CREATE TRIGGER update_summaries_updated_at 
    BEFORE UPDATE ON summaries
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_waitlist_updated_at ON waitlist;
CREATE TRIGGER update_waitlist_updated_at 
    BEFORE UPDATE ON waitlist
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update device last_seen_at triggers
DROP TRIGGER IF EXISTS update_device_last_seen_on_note ON notes;
CREATE TRIGGER update_device_last_seen_on_note
    AFTER INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_seen();

-- Function to update device battery level from note metadata
CREATE OR REPLACE FUNCTION update_device_battery_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update battery_level if provided in metadata
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

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Daily Statistics View
CREATE OR REPLACE VIEW daily_statistics AS
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

-- Device Summary View
CREATE OR REPLACE VIEW device_summary AS
SELECT
    d.id,
    d.device_id,
    d.device_name,
    d.status,
    d.last_seen_at,
    COUNT(DISTINCT n.id) as total_notes,
    MAX(n.created_at) as last_note_at,
    d.battery_level
FROM devices d
LEFT JOIN notes n ON d.id = n.device_id
GROUP BY d.id, d.device_id, d.device_name, d.status, d.last_seen_at;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SAMPLE RLS POLICIES (Customize based on your requirements)
-- ============================================================================

-- Allow service role to do everything (for ESP32 inserts)
-- Note: ESP32 should use service role key, not anon key

-- Allow authenticated users to view their own notes
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
CREATE POLICY "Users can view their own notes"
ON notes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to insert notes (for ESP32)
DROP POLICY IF EXISTS "Service role can insert notes" ON notes;
CREATE POLICY "Service role can insert notes"
ON notes FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow users to view assigned devices
DROP POLICY IF EXISTS "Users can view assigned devices" ON devices;
CREATE POLICY "Users can view assigned devices"
ON devices FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM device_assignments
        WHERE device_assignments.device_id = devices.id
        AND device_assignments.user_id = auth.uid()
        AND device_assignments.is_active = TRUE
    )
    OR auth.jwt() ->> 'role' = 'admin'
);

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Insert a sample device (optional)
-- INSERT INTO devices (device_id, device_name, status) 
-- VALUES ('esp32-test', 'ESP32 Test Device', 'active')
-- ON CONFLICT (device_id) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review and customize RLS policies';
    RAISE NOTICE '2. Set up Supabase API keys';
    RAISE NOTICE '3. Test ESP32 connection';
    RAISE NOTICE '4. Configure authentication';
END $$;

