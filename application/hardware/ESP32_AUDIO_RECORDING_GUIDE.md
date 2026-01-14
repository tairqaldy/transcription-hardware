# ESP32 Audio Recording Guide - Step by Step

This guide explains how to implement audio recording on ESP32 that sends audio chunks to Supabase every 15 seconds during a recording session.

## ?? Table of Contents
1. [Overview](#overview)
2. [How Recording Sessions Work](#how-recording-sessions-work)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Code Structure](#code-structure)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## ?? Overview

**What we're building:**
- ESP32 records audio continuously when button is pressed
- Every 15 seconds, it sends a chunk of audio data to Supabase
- All chunks from one button press share the same `session_id`
- When button is pressed again, recording stops and a new session can start

**Key Concepts:**
- **Session ID**: A unique identifier generated when recording starts. All chunks from that recording share this ID.
- **Chunk Sequence**: A number (1, 2, 3...) that shows the order of chunks within a session.
- **15-Second Chunks**: Audio is split into ~15 second pieces and sent to database.

---

## ?? How Recording Sessions Work

### Visual Flow:

```
[Button Press] ? Generate Session ID ? Start Recording
                    ?
        [Every 15 seconds]
                    ?
    Send Chunk #1 (session_id, chunk_sequence=1)
    Send Chunk #2 (session_id, chunk_sequence=2)
    Send Chunk #3 (session_id, chunk_sequence=3)
                    ?
    [Button Press Again] ? Stop Recording
```

### Example Timeline:

```
Time 0s:   Button pressed ? session_id = "abc-123" generated
Time 0-15s: Recording chunk 1
Time 15s:  Send chunk 1 to DB (session_id="abc-123", sequence=1)
Time 15-30s: Recording chunk 2
Time 30s:  Send chunk 2 to DB (session_id="abc-123", sequence=2)
Time 30-45s: Recording chunk 3
Time 45s:  Send chunk 3 to DB (session_id="abc-123", sequence=3)
Time 60s:  Button pressed again ? Stop recording
```

**Important:** All chunks 1, 2, and 3 have the same `session_id` ("abc-123") because they came from the same recording session!

---

## ??? Step-by-Step Implementation

### Step 1: Add Required Variables

Add these global variables at the top of your `.ino` file:

```cpp
// Recording session variables
String currentSessionId = "";      // Empty = not recording
int chunkSequence = 0;            // Counter for chunks in current session
unsigned long lastChunkTime = 0;  // When we last sent a chunk
const unsigned long CHUNK_INTERVAL = 15000; // 15 seconds in milliseconds
bool isRecording = false;         // Recording state
```

### Step 2: Generate Session ID Function

Create a function to generate a unique session ID when recording starts:

```cpp
String generateSessionId() {
  // Generate unique ID using ESP32's MAC address + timestamp
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  unsigned long timestamp = millis();
  
  // Format: MAC-TIMESTAMP
  return mac + "-" + String(timestamp);
}
```

**Why this works:** MAC address is unique per ESP32, timestamp makes it unique per session.

### Step 3: Start Recording Function

When button is pressed and recording starts:

```cpp
void startRecording() {
  if (!isRecording) {
    // Generate new session ID
    currentSessionId = generateSessionId();
    chunkSequence = 0;  // Reset chunk counter
    lastChunkTime = millis();  // Reset timer
    isRecording = true;
    
    Serial.println("Recording started! Session ID: " + currentSessionId);
  }
}
```

### Step 4: Stop Recording Function

When button is pressed again to stop:

```cpp
void stopRecording() {
  if (isRecording) {
    isRecording = false;
    currentSessionId = "";  // Clear session ID
    chunkSequence = 0;      // Reset counter
    
    Serial.println("Recording stopped!");
  }
}
```

### Step 5: Send Audio Chunk to Supabase

This function sends one chunk of audio data:

```cpp
void sendAudioChunk(uint8_t* audioBuffer, size_t bufferSize) {
  if (currentSessionId.length() == 0) {
    Serial.println("Error: No active session!");
    return;
  }
  
  // Increment chunk sequence number
  chunkSequence++;
  
  // Convert binary audio data to base64 (Supabase needs JSON)
  String base64Audio = base64Encode(audioBuffer, bufferSize);
  
  // Get your device UUID (you need to store this or get it from Supabase)
  String deviceId = "your-device-uuid-here";  // TODO: Replace with actual device ID
  
  // Calculate duration (approximately)
  float duration = (float)bufferSize / (16000 * 2); // sample_rate * bytes_per_sample
  
  // Create JSON payload
  String jsonData = "{";
  jsonData += "\"device_id\":\"" + deviceId + "\",";
  jsonData += "\"session_id\":\"" + currentSessionId + "\",";
  jsonData += "\"chunk_sequence\":" + String(chunkSequence) + ",";
  jsonData += "\"audio_data\":\"" + base64Audio + "\",";
  jsonData += "\"data_size_bytes\":" + String(bufferSize) + ",";
  jsonData += "\"duration_seconds\":" + String(duration, 2) + ",";
  jsonData += "\"sample_rate\":16000,";
  jsonData += "\"bits_per_sample\":16,";
  jsonData += "\"channels\":1,";
  jsonData += "\"recorded_at\":\"" + getCurrentTimestamp() + "\"";
  jsonData += "}";
  
  // Send to Supabase
  int response = supabase.insert("audio_chunks", jsonData, false);
  
  if (response == 200) {
    Serial.println("Chunk #" + String(chunkSequence) + " sent successfully!");
  } else {
    Serial.print("Failed to send chunk. HTTP response: ");
    Serial.println(response);
  }
}
```

### Step 6: Base64 Encoding Function

Supabase needs audio data as base64 string. Add this helper:

```cpp
String base64Encode(uint8_t* data, size_t length) {
  const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String encoded = "";
  
  for (size_t i = 0; i < length; i += 3) {
    uint32_t octet_a = i < length ? data[i] : 0;
    uint32_t octet_b = i + 1 < length ? data[i + 1] : 0;
    uint32_t octet_c = i + 2 < length ? data[i + 2] : 0;
    
    uint32_t triple = (octet_a << 16) + (octet_b << 8) + octet_c;
    
    encoded += base64_chars[(triple >> 18) & 0x3F];
    encoded += base64_chars[(triple >> 12) & 0x3F];
    encoded += (i + 1 < length) ? base64_chars[(triple >> 6) & 0x3F] : '=';
    encoded += (i + 2 < length) ? base64_chars[triple & 0x3F] : '=';
  }
  
  return encoded;
}
```

**Note:** For production, consider using a library like `base64.h` instead of manual encoding.

### Step 7: Get Current Timestamp Function

```cpp
String getCurrentTimestamp() {
  // Get current time (you may need to sync with NTP server first)
  // For now, return ISO 8601 format timestamp
  // Format: "2024-01-15T10:30:00Z"
  
  // Simple implementation (you might want to use time library)
  return "2024-01-15T10:30:00Z";  // TODO: Implement proper timestamp
}
```

### Step 8: Update Your Loop Function

Modify your `loop()` function to handle recording and chunk sending:

```cpp
void loop() {
  // Handle button press
  bool currentBtn = digitalRead(BUTTON_PIN);
  static bool lastBtnState = HIGH;
  
  if (lastBtnState == HIGH && currentBtn == LOW) {
    // Button pressed (edge trigger)
    delay(250);  // Debounce
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
  lastBtnState = currentBtn;
  
  // Handle recording
  if (isRecording) {
    // Read audio data
    size_t bytes_read;
    uint8_t buffer[512];
    i2s_read(I2S_NUM_0, buffer, sizeof(buffer), &bytes_read, portMAX_DELAY);
    
    if (bytes_read > 0) {
      // Visual feedback (green glow)
      int vol = abs((int16_t)buffer[0]) << 2;
      vol = constrain(vol, 40, 255);
      for(int i = 0; i < 3; i++) {
        pixels.setPixelColor(i, pixels.Color(0, vol, 0));
      }
      pixels.show();
      
      // Check if 15 seconds have passed since last chunk
      unsigned long currentTime = millis();
      if (currentTime - lastChunkTime >= CHUNK_INTERVAL) {
        // TODO: Collect all audio data from the last 15 seconds
        // For now, sending current buffer as example
        sendAudioChunk(buffer, bytes_read);
        lastChunkTime = currentTime;
      }
    }
  } else {
    // Not recording - solid blue LED
    for(int i = 0; i < 3; i++) {
      pixels.setPixelColor(i, pixels.Color(0, 0, 255));
    }
    pixels.show();
  }
}
```

---

## ?? Code Structure

### Complete Variable List:

```cpp
// WiFi & Supabase
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* supabaseUrl = "YOUR_SUPABASE_URL";
const char* supabaseKey = "YOUR_SUPABASE_KEY";
Supabase supabase;

// Recording
String currentSessionId = "";
int chunkSequence = 0;
unsigned long lastChunkTime = 0;
const unsigned long CHUNK_INTERVAL = 15000; // 15 seconds
bool isRecording = false;

// Hardware pins
const int BUTTON_PIN = 0;  // Adjust to your button pin
```

### Function Checklist:

- [ ] `generateSessionId()` - Creates unique session ID
- [ ] `startRecording()` - Starts new recording session
- [ ] `stopRecording()` - Stops current recording session
- [ ] `sendAudioChunk()` - Sends chunk to Supabase
- [ ] `base64Encode()` - Converts binary to base64
- [ ] `getCurrentTimestamp()` - Gets current time
- [ ] `setup()` - Initialize WiFi, Supabase, I2S
- [ ] `loop()` - Handle button, recording, chunk sending

---

## ?? Testing

### Test 1: Session ID Generation
1. Upload code
2. Press button to start recording
3. Check Serial Monitor - should see: `"Recording started! Session ID: XX-XX-XX-XXXXX"`
4. Press button again - should see: `"Recording stopped!"`

### Test 2: Chunk Sending
1. Start recording
2. Wait 15 seconds
3. Check Serial Monitor - should see: `"Chunk #1 sent successfully!"`
4. Wait another 15 seconds
5. Should see: `"Chunk #2 sent successfully!"`
6. Both chunks should have same session_id in database

### Test 3: Database Verification
1. Go to Supabase dashboard
2. Open `audio_chunks` table
3. Check that chunks have:
   - Same `session_id` for chunks from same recording
   - Incrementing `chunk_sequence` (1, 2, 3...)
   - Correct `device_id`
   - `audio_data` is not empty

---

## ?? Troubleshooting

### Problem: Session ID is empty when sending chunk
**Solution:** Make sure `startRecording()` is called before sending chunks. Check that `isRecording` is `true`.

### Problem: Chunks have different session_ids
**Solution:** Make sure `currentSessionId` is not reset between chunks. Only reset it in `stopRecording()`.

### Problem: Chunk sequence doesn't increment
**Solution:** Make sure `chunkSequence++` is called at the start of `sendAudioChunk()`, not in `loop()`.

### Problem: Audio data is too large for JSON
**Solution:** 
- Reduce chunk size (send smaller chunks more frequently)
- Use Supabase Storage API instead of database for large files
- Compress audio before sending

### Problem: HTTP 400 error when inserting
**Solution:**
- Check JSON format is valid
- Verify all required fields are present
- Check that `device_id` exists in `devices` table
- Ensure base64 encoding is correct

### Problem: Chunks sent too frequently
**Solution:** Make sure `CHUNK_INTERVAL` is 15000 (15 seconds) and check is: `currentTime - lastChunkTime >= CHUNK_INTERVAL`

---

## ?? Important Notes

1. **Session ID Persistence**: The `session_id` must stay the same for all chunks in one recording session. Don't regenerate it between chunks!

2. **Chunk Sequence**: Always increment `chunkSequence` before sending. Start at 0, so first chunk is sequence 1.

3. **15-Second Timer**: Use `millis()` for timing. Don't use `delay()` as it blocks other code.

4. **Audio Buffer**: You need to accumulate 15 seconds of audio data before sending. The example shows sending one buffer - you'll need to collect multiple buffers.

5. **Device ID**: You need to get your device's UUID from Supabase. Either:
   - Store it in ESP32 flash memory
   - Use `get_or_create_device()` function in Supabase
   - Hardcode it for testing (not recommended for production)

6. **Base64 Encoding**: Large audio chunks create large base64 strings. Consider:
   - Using Supabase Storage for files > 1MB
   - Compressing audio (e.g., MP3 encoding)
   - Sending smaller chunks more frequently

---

## ?? Next Steps

1. **Implement Audio Buffer Collection**: Collect 15 seconds of audio data before sending
2. **Add NTP Time Sync**: Get accurate timestamps for `recorded_at`
3. **Error Handling**: Add retry logic if Supabase insert fails
4. **Storage Optimization**: Consider using Supabase Storage API for large files
5. **Audio Compression**: Add MP3 or other compression to reduce data size

---

## ? Quick Reference

**When button pressed:**
- If not recording ? Generate session_id ? Start recording
- If recording ? Stop recording ? Clear session_id

**Every 15 seconds while recording:**
- Increment chunk_sequence
- Send audio chunk with: session_id, chunk_sequence, audio_data
- Reset timer

**Key Variables:**
- `currentSessionId` - Groups chunks together
- `chunkSequence` - Orders chunks (1, 2, 3...)
- `isRecording` - Recording state
- `lastChunkTime` - Timer for 15-second intervals

---

Good luck with your implementation! ??
