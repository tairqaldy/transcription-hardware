# Database Quick Reference Guide
## ESP32 Transcription Device - Project 5

Quick reference for developers working with the database.

---

## Table Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `devices` | ESP32 device registry | `device_id`, `status`, `battery_level`, `last_seen_at` |
| `users` | User accounts | `email`, `role`, `is_active` |
| `device_assignments` | User-device relationships | `user_id`, `device_id`, `is_active` |
| `notes` | Transcribed text/audio | `text`, `device_id`, `language`, `confidence_score` |
| `summaries` | AI-generated summaries | `content`, `summary_type`, `note_id` |
| `waitlist` | User waitlist | `email`, `status`, `priority` |
| `device_events` | Device logs/errors | `event_type`, `severity`, `message` |
| `analytics_cache` | Pre-computed analytics | `cache_key`, `data`, `expires_at` |

---

## Common Operations

### ESP32 → Database

#### Insert Note
```http
POST /rest/v1/notes
{
  "device_id": "esp32-test",
  "text": "Hello world",
  "language": "en",
  "confidence_score": 0.95,
  "recorded_at": "2024-01-15T10:30:00Z"
}
```

#### Update Battery Level (via Note Metadata)
```http
POST /rest/v1/notes
{
  "device_id": "esp32-test",
  "text": "Hello world",
  "language": "en",
  "metadata": {
    "battery_level": 85
  }
}
```

**Note:** Battery level in note metadata will automatically update the device's `battery_level` field via trigger.

#### Update Battery Level (Direct)
```http
PATCH /rest/v1/devices?device_id=eq.esp32-test
{
  "battery_level": 85
}
```

**Note:** `device_id` in POST should be the string identifier. The database will look up or create the device automatically.

---

### Frontend → Database

#### Get User's Notes
```http
GET /rest/v1/notes?user_id=eq.[user-uuid]&order=created_at.desc&limit=50
```

#### Get Device Summary
```http
GET /rest/v1/device_summary?device_id=eq.[device-uuid]
```

#### Search Notes
```http
GET /rest/v1/notes?text=ilike.*search_term*&order=created_at.desc
```

---

## Key Relationships

```
User → Device Assignments → Devices
Device → Notes (one-to-many)
Device → Sensor Readings (one-to-many)
Note → Summaries (one-to-many, optional)
Device → Device Events (one-to-many)
```

---

## Field Types Quick Reference

| Field Type | Example | Use Case |
|------------|---------|----------|
| `UUID` | `550e8400-e29b-41d4-a716-446655440000` | Primary keys, foreign keys |
| `TIMESTAMPTZ` | `2024-01-15T10:30:00Z` | All timestamps |
| `TEXT` | `"Long text content..."` | Notes, descriptions |
| `VARCHAR(n)` | `"esp32-test"` | Short strings, IDs |
| `DECIMAL(10,4)` | `22.5000` | Sensor values, scores |
| `INTEGER` | `85` | Counts, durations |
| `BOOLEAN` | `true` | Flags (is_active, is_processed) |
| `JSONB` | `{"temp": 22.5, "humidity": 45}` | Flexible metadata |
| `TEXT[]` | `["tag1", "tag2"]` | Arrays (tags, topics) |

---

## Common Queries

### Get Recent Notes
```sql
SELECT * FROM notes 
WHERE device_id = '[device-uuid]' 
ORDER BY created_at DESC 
LIMIT 50;
```

### Get Device Health
```sql
SELECT 
    device_id,
    status,
    last_seen_at,
    CASE 
        WHEN last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'online'
        ELSE 'offline'
    END as connectivity
FROM devices;
```

### Daily Statistics
```sql
SELECT * FROM daily_statistics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

### Device Summary
```sql
SELECT * FROM device_summary 
WHERE device_id = '[device-uuid]';
```

---

## API Endpoints Reference

### Notes
- `GET /rest/v1/notes` - List notes
- `POST /rest/v1/notes` - Create note
- `GET /rest/v1/notes?id=eq.[uuid]` - Get single note
- `PATCH /rest/v1/notes?id=eq.[uuid]` - Update note
- `DELETE /rest/v1/notes?id=eq.[uuid]` - Delete note

### Devices
- `GET /rest/v1/devices` - List devices
- `POST /rest/v1/devices` - Create device
- `GET /rest/v1/device_summary` - Get device summaries

### Device Updates
- `PATCH /rest/v1/devices?device_id=eq.[device-id]` - Update device (e.g., battery_level)

---

## Filtering & Sorting

### Supabase PostgREST Filters

| Operator | Syntax | Example |
|----------|--------|---------|
| Equals | `eq.` | `?status=eq.active` |
| Not equals | `neq.` | `?status=neq.inactive` |
| Greater than | `gt.` | `?created_at=gt.2024-01-01` |
| Less than | `lt.` | `?created_at=lt.2024-01-01` |
| Greater or equal | `gte.` | `?confidence_score=gte.0.9` |
| Less or equal | `lte.` | `?confidence_score=lte.0.5` |
| Like | `like.*term*` | `?text=like.*hello*` |
| Case-insensitive like | `ilike.*term*` | `?text=ilike.*HELLO*` |
| In array | `in.(val1,val2)` | `?status=in.(active,inactive)` |
| Is null | `is.null` | `?resolved_at=is.null` |
| Is not null | `not.is.null` | `?resolved_at=not.is.null` |

### Sorting
- `?order=created_at.desc` - Descending
- `?order=created_at.asc` - Ascending
- `?order=created_at.desc,confidence_score.asc` - Multiple columns

### Pagination
- `?limit=50` - Limit results
- `?offset=100` - Skip first N results

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `23503` Foreign key violation | Referenced record doesn't exist | Ensure device exists before inserting note |
| `23505` Unique violation | Duplicate unique value | Check for existing record |
| `23514` Check violation | Value fails constraint | Verify data meets constraints |
| `42501` Permission denied | RLS policy blocks access | Check user permissions and RLS policies |

---

## Performance Tips

1. **Use indexes**: Queries on `device_id`, `user_id`, `created_at` are indexed
2. **Limit results**: Always use `limit` for large datasets
3. **Filter early**: Apply filters before sorting
4. **Use views**: Use `daily_statistics` and `device_summary` views
5. **Cache analytics**: Use `analytics_cache` table for dashboard data

---

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] ESP32 uses service role key (not anon key)
- [ ] Frontend uses JWT tokens for authentication
- [ ] Users can only access assigned devices
- [ ] API keys rotated regularly
- [ ] Rate limiting implemented

---

## Troubleshooting

### Device not found
```sql
-- Check if device exists
SELECT * FROM devices WHERE device_id = 'esp32-test';

-- Create device if missing
INSERT INTO devices (device_id, device_name, status)
VALUES ('esp32-test', 'ESP32 Test', 'active')
ON CONFLICT (device_id) DO NOTHING;
```

### Permission denied
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notes';

-- Check user assignments
SELECT * FROM device_assignments WHERE user_id = '[user-uuid]';
```

### Slow queries
```sql
-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM notes WHERE device_id = '[uuid]';
```

---

## Useful Functions

### Get or Create Device
```sql
SELECT get_or_create_device('esp32-test');
```

### Update Device Last Seen
```sql
UPDATE devices 
SET last_seen_at = NOW() 
WHERE device_id = 'esp32-test';
```

### Archive Old Notes
```sql
UPDATE notes 
SET is_archived = TRUE 
WHERE created_at < NOW() - INTERVAL '1 year'
AND is_archived = FALSE;
```

---

## Monitoring Queries

### Table Sizes
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
```

### Recent Activity
```sql
SELECT 
    'notes' as table_name,
    COUNT(*) as count_24h
FROM notes
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Device Status
```sql
SELECT 
    status,
    COUNT(*) as count,
    MAX(last_seen_at) as most_recent
FROM devices
GROUP BY status;
```

---

## Next Steps

1. Review full documentation: `Database_Design_Documentation.md`
2. Execute schema: `database_schema.sql`
3. Configure RLS policies for your use case
4. Set up ESP32 connection with service role key
5. Test with sample data
6. Implement frontend queries

---

*Last updated: 16.12.2025*

