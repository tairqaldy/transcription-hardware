-- ============================================================================
-- TEMP: Disable RLS for ESP32 development
-- WARNING: This removes database protections. Use only in dev/testing.
-- ============================================================================

-- Disable RLS so the ESP32 can insert without policies
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE audio_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments DISABLE ROW LEVEL SECURITY;

-- Optional: allow all roles to insert/read (if RLS is re-enabled later)
-- These policies are permissive for quick testing.
DROP POLICY IF EXISTS "dev_allow_all_devices" ON devices;
CREATE POLICY "dev_allow_all_devices"
ON devices
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_all_notes" ON notes;
CREATE POLICY "dev_allow_all_notes"
ON notes
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_all_audio_chunks" ON audio_chunks;
CREATE POLICY "dev_allow_all_audio_chunks"
ON audio_chunks
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_all_device_assignments" ON device_assignments;
CREATE POLICY "dev_allow_all_device_assignments"
ON device_assignments
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled for ESP32 dev testing.';
    RAISE NOTICE 'WARNING: Database is now open. Re-enable RLS for production.';
END $$;









-- TEMP: Disable RLS for ESP32 development
-- WARNING: This removes database protections. Use only in dev/testing.

ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE audio_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_allow_all_devices" ON devices;
CREATE POLICY "dev_allow_all_devices"
ON devices FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_all_notes" ON notes;
CREATE POLICY "dev_allow_all_notes"
ON notes FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_all_audio_chunks" ON audio_chunks;
CREATE POLICY "dev_allow_all_audio_chunks"
ON audio_chunks FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_all_device_assignments" ON device_assignments;
CREATE POLICY "dev_allow_all_device_assignments"
ON device_assignments FOR ALL TO PUBLIC USING (true) WITH CHECK (true);