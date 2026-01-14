# Hardware Integration Guide
## ESP32 Device Setup and Component Integration

**Target Audience:** Hardware Engineers, IT Engineers, Embedded Systems Developers , IoT Developers
**Version:** 1.0  
**Last Updated:** 16.12.2025

*Any Questions? Submit issue request or ask a teamate!*

---

## Table of Contents

1. [Overview](#overview)
2. [Hardware Requirements](#hardware-requirements)
3. [Component Setup](#component-setup)
4. [ESP32 Configuration](#esp32-configuration)
5. [Database Integration](#database-integration)
6. [Audio Processing](#audio-processing)
7. [Battery Management](#battery-management)
8. [Network Configuration](#network-configuration)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

This guide is for hardware and IT engineers working with ESP32 devices and components. You'll learn how to:

- Set up ESP32 hardware and required components
- Configure WiFi and network connectivity
- Integrate with the Supabase database
- Handle audio input and processing
- Manage battery levels and power consumption
- Debug and troubleshoot hardware issues

---

## Hardware Requirements

### Essential Components

- **ESP32 Development Board** (ESP32-WROOM-32 or similar)
- **Microphone Module** (INMP441, MAX9814, or similar I2S microphone)
- **Power Supply** (USB or battery pack)
- **Battery** (if using battery-powered setup)
- **Battery Level Monitoring Circuit** (optional but recommended)

### Optional Components

- **SD Card Module** (for local storage backup)
- **LED Indicators** (status feedback)
- **Button** (manual trigger/control)
- **OLED Display** (status display)

---

## Component Setup (Check 2nd time when assembling!)

### 1. Microphone Connection (I2S)

**INMP441 I2S Microphone:**

```
INMP441    →    ESP32
VDD        →    3.3V
GND        →    GND
WS         →    GPIO 15 (LRC)
SCK        →    GPIO 14 (BCLK)
SD         →    GPIO 32 (DIN)
```

**Code Example:**

```cpp
#include <driver/i2s.h>

#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14
#define I2S_PORT I2S_NUM_0

void setupI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,  // 16kHz for speech recognition
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
}
```

### 2. Battery Level Monitoring

**Voltage Divider Circuit:**

```
Battery+ → [R1: 10kΩ] → [R2: 10kΩ] → GND
                    ↓
                 ADC Pin (GPIO 34)
```

**Code Example:**

```cpp
#define BATTERY_PIN 34
#define BATTERY_MAX_VOLTAGE 4.2  // LiPo fully charged
#define BATTERY_MIN_VOLTAGE 3.0  // LiPo empty

int readBatteryLevel() {
  int raw = analogRead(BATTERY_PIN);
  float voltage = (raw / 4095.0) * 3.3 * 2.0; // Voltage divider ratio
  
  // Convert voltage to percentage
  int percentage = map(
    constrain(voltage * 100, BATTERY_MIN_VOLTAGE * 100, BATTERY_MAX_VOLTAGE * 100),
    BATTERY_MIN_VOLTAGE * 100,
    BATTERY_MAX_VOLTAGE * 100,
    0,
    100
  );
  
  return percentage;
}
```

### 3. Status LED

```cpp
#define STATUS_LED 2  // Built-in LED on most ESP32 boards

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(delayMs);
    digitalWrite(STATUS_LED, LOW);
    delay(delayMs);
  }
}
```

---

## ESP32 Configuration

### Complete Setup Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>
#include <time.h>
#include "FS.h"
#include "SPIFFS.h"

// Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* supabaseUrl = "https://[project-id].supabase.co";
const char* supabaseKey = "YOUR_SERVICE_ROLE_KEY";
const char* deviceId = "esp32-device-001";

// Pin Definitions
#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14
#define BATTERY_PIN 34
#define STATUS_LED 2

// NTP Configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

// Device State
unsigned long lastNoteTime = 0;
const unsigned long noteInterval = 30000; // 30 seconds
int batteryLevel = 100;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(STATUS_LED, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  
  // Initialize I2S
  setupI2S();
  
  // Connect to WiFi
  connectWiFi();
  
  // Sync time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Ensure device exists in database
  ensureDeviceExists();
  
  Serial.println("Setup complete!");
  blinkLED(3, 200); // Success indicator
}

void loop() {
  // Read battery level
  batteryLevel = readBatteryLevel();
  
  // Record and upload audio periodically
  if (millis() - lastNoteTime >= noteInterval) {
    String audioUrl = recordAndUploadAudio();
    if (audioUrl.length() > 0) {
      Serial.print("Audio uploaded: ");
      Serial.println(audioUrl);
      lastNoteTime = millis();
    }
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  }
  
  delay(1000);
}
```

---

## Database Integration

### Device Registration

```cpp
void ensureDeviceExists() {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/devices?device_id=eq." + String(deviceId);
  
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  int code = http.GET();
  String response = http.getString();
  
  if (code == 200 && response == "[]") {
    // Device doesn't exist, create it
    createDevice();
  }
  
  http.end();
}

void createDevice() {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/devices";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = deviceId;
  doc["device_name"] = "ESP32 Device";
  doc["device_type"] = "esp32";
  doc["status"] = "active";
  doc["firmware_version"] = "1.0.0";
  
  String payload;
  serializeJson(doc, payload);
  
  int code = http.POST(payload);
  Serial.print("Create device: ");
  Serial.println(code == 201 ? "SUCCESS" : "FAILED");
  
  http.end();
}
```

### Upload Audio and Create Note

**Workflow**: Record audio → Save to file → Upload to Supabase Storage → Create note with audio URL

```cpp
String recordAndUploadAudio() {
  // Record audio
  int16_t* audioBuffer = NULL;
  size_t audioBufferSize = SAMPLE_RATE * RECORD_DURATION_SECONDS;
  audioBuffer = (int16_t*)malloc(audioBufferSize * sizeof(int16_t));
  
  if (!audioBuffer) {
    Serial.println("Failed to allocate audio buffer");
    return "";
  }
  
  // Record audio (same as before)
  size_t bytesRead = 0;
  size_t totalBytes = audioBufferSize * sizeof(int16_t);
  
  while (bytesRead < totalBytes) {
    size_t bytesToRead = min(BUFFER_SIZE, totalBytes - bytesRead);
    size_t bytesReadThisTime = 0;
    
    i2s_read(I2S_PORT, 
             (char*)audioBuffer + bytesRead, 
             bytesToRead, 
             &bytesReadThisTime, 
             portMAX_DELAY);
    
    bytesRead += bytesReadThisTime;
  }
  
  // Save to file
  String filePath = saveAudioToFile(audioBuffer, audioBufferSize);
  free(audioBuffer);
  
  if (filePath.length() == 0) {
    return "";
  }
  
  // Upload to Supabase Storage
  String audioUrl = uploadAudioToStorage(filePath);
  
  if (audioUrl.length() == 0) {
    return "";
  }
  
  // Create note with audio URL
  createNoteWithAudio(audioUrl, audioBufferSize);
  
  // Clean up local file (optional - keep for backup or delete)
  // SPIFFS.remove(filePath);
  
  return audioUrl;
}
```

String getDeviceUuid() {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/devices?device_id=eq." + String(deviceId) + "&select=id";
  
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  int code = http.GET();
  String uuid = "";
  
  if (code == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);
    
    if (doc.is<JsonArray>() && doc.size() > 0) {
      uuid = doc[0]["id"].as<String>();
    }
  }
  
  http.end();
  return uuid;
}
```

### Update Battery Level

```cpp
void updateBatteryLevel() {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/devices?device_id=eq." + String(deviceId);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  StaticJsonDocument<128> doc;
  doc["battery_level"] = batteryLevel;
  
  String payload;
  serializeJson(doc, payload);
  
  int code = http.PATCH(payload);
  
  if (code == 200) {
    Serial.print("Battery updated: ");
    Serial.print(batteryLevel);
    Serial.println("%");
  }
  
  http.end();
}
```

---

## Audio Processing

### Recording Audio Buffer

```cpp
#define SAMPLE_RATE 16000
#define BUFFER_SIZE 1024
#define RECORD_DURATION_SECONDS 5

int16_t* audioBuffer = NULL;
size_t audioBufferSize = 0;

String recordAndTranscribe() {
  // Allocate buffer
  audioBufferSize = SAMPLE_RATE * RECORD_DURATION_SECONDS;
  audioBuffer = (int16_t*)malloc(audioBufferSize * sizeof(int16_t));
  
  if (!audioBuffer) {
    Serial.println("Failed to allocate audio buffer");
    return "";
  }
  
  Serial.println("Recording...");
  blinkLED(1, 500);
  
  size_t bytesRead = 0;
  size_t totalBytes = audioBufferSize * sizeof(int16_t);
  
  while (bytesRead < totalBytes) {
    size_t bytesToRead = min(BUFFER_SIZE, totalBytes - bytesRead);
    size_t bytesReadThisTime = 0;
    
    i2s_read(I2S_PORT, 
             (char*)audioBuffer + bytesRead, 
             bytesToRead, 
             &bytesReadThisTime, 
             portMAX_DELAY);
    
    bytesRead += bytesReadThisTime;
  }
  
  Serial.println("Recording complete");
  
  // Save audio to file (WAV format)
  String audioFilePath = saveAudioToFile(audioBuffer, audioBufferSize);
  
  // Upload to Supabase Storage
  String audioUrl = uploadAudioToStorage(audioFilePath);
  
  // Create note in database with audio URL (transcription happens later)
  createNoteWithAudio(audioUrl, audioBufferSize);
  
  // Free buffer
  free(audioBuffer);
  audioBuffer = NULL;
  
  // Clean up local file
  if (audioFilePath.length() > 0) {
    // Optionally keep file for backup, or delete it
    // SPIFFS.remove(audioFilePath);
  }
  
  return audioUrl; // Return URL for confirmation
}
```

### Save Audio to File

```cpp
#include "FS.h"
#include "SPIFFS.h"

String saveAudioToFile(int16_t* buffer, size_t size) {
  // Initialize SPIFFS if not already done
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS Mount Failed");
    return "";
  }
  
  // Generate filename with timestamp
  String filename = "/audio_" + String(millis()) + ".wav";
  File file = SPIFFS.open(filename, "wb");
  
  if (!file) {
    Serial.println("Failed to create file");
    return "";
  }
  
  // Write WAV header (simplified - you may need proper WAV header)
  // For now, write raw PCM data
  file.write((uint8_t*)buffer, size * sizeof(int16_t));
  file.close();
  
  Serial.print("Audio saved: ");
  Serial.println(filename);
  
  return filename;
}
```

### Upload Audio to Supabase Storage

```cpp
String uploadAudioToStorage(String filePath) {
  HTTPClient http;
  
  // Supabase Storage endpoint
  String url = String(supabaseUrl) + "/storage/v1/object/audio/" + getFileName(filePath);
  
  // Read file from SPIFFS
  File file = SPIFFS.open(filePath, "r");
  if (!file) {
    Serial.println("Failed to open file for upload");
    return "";
  }
  
  // Get file size
  size_t fileSize = file.size();
  
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type", "audio/wav");
  http.addHeader("x-upsert", "true"); // Overwrite if exists
  
  // Upload file
  int httpResponseCode = http.sendRequest("POST", &file, fileSize);
  
  file.close();
  
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    // Get public URL
    String publicUrl = String(supabaseUrl) + "/storage/v1/object/public/audio/" + getFileName(filePath);
    Serial.print("Audio uploaded: ");
    Serial.println(publicUrl);
    http.end();
    return publicUrl;
  } else {
    Serial.print("Upload failed: ");
    Serial.println(httpResponseCode);
    Serial.println(http.getString());
    http.end();
    return "";
  }
}

String getFileName(String filePath) {
  // Extract filename from path
  int lastSlash = filePath.lastIndexOf('/');
  if (lastSlash >= 0) {
    return filePath.substring(lastSlash + 1);
  }
  return filePath;
}
```

### Create Note with Audio URL

```cpp
void createNoteWithAudio(String audioUrl, size_t audioSize) {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/notes";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Prefer", "return=representation");
  
  // Get device UUID
  String deviceUuid = getDeviceUuid();
  if (deviceUuid == "") {
    Serial.println("Error: Could not get device UUID");
    http.end();
    return;
  }
  
  // Calculate duration (rough estimate: size in bytes / (sample_rate * channels * bytes_per_sample))
  int durationSeconds = audioSize / (SAMPLE_RATE * 1 * 2); // 1 channel, 16-bit (2 bytes)
  
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceUuid;
  doc["audio_file_url"] = audioUrl;
  doc["audio_duration_seconds"] = durationSeconds;
  doc["text"] = ""; // Will be filled by transcription service
  doc["language"] = "en";
  doc["is_processed"] = false; // Not transcribed yet
  doc["recorded_at"] = getCurrentTimestamp();
  
  // Include battery level in metadata
  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["battery_level"] = batteryLevel;
  
  String payload;
  serializeJson(doc, payload);
  
  int code = http.POST(payload);
  
  if (code == 201 || code == 200) {
    Serial.println("Note created with audio URL!");
    blinkLED(1, 100);
  } else {
    Serial.print("Error creating note: ");
    Serial.println(code);
    Serial.println(http.getString());
    blinkLED(5, 50);
  }
  
  http.end();
}
```

---

## Battery Management

### Power-Saving Mode

```cpp
#include "esp_sleep.h"

void enterDeepSleep(int seconds) {
  Serial.println("Entering deep sleep...");
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void managePower() {
  int battery = readBatteryLevel();
  
  if (battery < 10) {
    // Critical battery - enter deep sleep
    Serial.println("Critical battery, entering deep sleep");
    enterDeepSleep(3600); // Sleep for 1 hour
  } else if (battery < 20) {
    // Low battery - reduce activity
    noteInterval = 60000; // Send notes less frequently
  }
}
```

### Battery Monitoring

```cpp
void monitorBattery() {
  static unsigned long lastBatteryCheck = 0;
  const unsigned long batteryCheckInterval = 60000; // Check every minute
  
  if (millis() - lastBatteryCheck >= batteryCheckInterval) {
    int newBatteryLevel = readBatteryLevel();
    
    if (abs(newBatteryLevel - batteryLevel) >= 5) {
      // Battery level changed significantly, update database
      updateBatteryLevel();
      batteryLevel = newBatteryLevel;
    }
    
    lastBatteryCheck = millis();
  }
}
```

---

## Network Configuration

### WiFi Connection with Retry

```cpp
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
    blinkLED(1, 100);
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    blinkLED(2, 200); // Success
  } else {
    Serial.println("\nWiFi connection failed!");
    blinkLED(5, 100); // Error
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.disconnect();
    delay(1000);
    connectWiFi();
  }
}
```

### Time Synchronization

```cpp
String getCurrentTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return "";
  }
  
  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(timestamp);
}

void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  struct tm timeinfo;
  int attempts = 0;
  while (!getLocalTime(&timeinfo) && attempts < 10) {
    delay(1000);
    attempts++;
  }
  
  if (attempts < 10) {
    Serial.println("Time synchronized");
  } else {
    Serial.println("Time sync failed");
  }
}
```

---

## Troubleshooting

### Common Issues

**1. WiFi Connection Fails**

- Check SSID and password
- Verify WiFi signal strength
- Check for special characters in credentials
- Try different WiFi channel (2.4GHz recommended)

**2. I2S Audio Issues**

- Verify pin connections
- Check sample rate compatibility
- Ensure proper power supply (3.3V stable)
- Check for electrical interference

**3. Database Connection Errors**

- Verify Supabase URL and API key
- Check internet connectivity
- Verify device exists in database
- Check RLS policies

**4. Battery Reading Incorrect**

- Calibrate voltage divider
- Check ADC reference voltage
- Verify battery voltage range
- Test with known voltage source

### Debug Mode

```cpp
#define DEBUG_MODE true

void debugPrint(String message) {
  if (DEBUG_MODE) {
    Serial.println("[DEBUG] " + message);
  }
}

void debugPrintJson(JsonDocument& doc) {
  if (DEBUG_MODE) {
    String output;
    serializeJsonPretty(doc, output);
    Serial.println("[DEBUG JSON]");
    Serial.println(output);
  }
}
```

---

## Best Practices

### 1. Error Handling with Retry

```cpp
bool sendNoteWithRetry(String text, String language, float confidence, int maxRetries = 3) {
  for (int i = 0; i < maxRetries; i++) {
    if (sendNote(text, language, confidence)) {
      return true;
    }
    delay(1000 * (i + 1)); // Exponential backoff
  }
  return false;
}
```

### 2. Memory Management

```cpp
// Always free allocated memory
if (audioBuffer != NULL) {
  free(audioBuffer);
  audioBuffer = NULL;
}

// Use appropriate buffer sizes
#define BUFFER_SIZE 1024  // Not too large, not too small
```

### 3. Watchdog Timer

```cpp
#include "esp_task_wdt.h"

void setup() {
  // Enable watchdog
  esp_task_wdt_init(30, true); // 30 second timeout
  esp_task_wdt_add(NULL);
  
  // ... rest of setup
}

void loop() {
  esp_task_wdt_reset(); // Reset watchdog
  // ... main loop code
}
```

### 4. Secure Credential Storage

```cpp
#include <Preferences.h>

Preferences preferences;

void saveCredentials() {
  preferences.begin("wifi", false);
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  preferences.end();
}

void loadCredentials() {
  preferences.begin("wifi", true);
  ssid = preferences.getString("ssid", "");
  password = preferences.getString("password", "");
  preferences.end();
}
```

### 5. Status Indicators

```cpp
void indicateStatus(DeviceStatus status) {
  switch(status) {
    case STATUS_CONNECTING:
      blinkLED(2, 200);
      break;
    case STATUS_CONNECTED:
      blinkLED(1, 500);
      break;
    case STATUS_ERROR:
      blinkLED(5, 100);
      break;
    case STATUS_RECORDING:
      digitalWrite(STATUS_LED, HIGH);
      break;
    default:
      digitalWrite(STATUS_LED, LOW);
  }
}
```

---

## Component Specifications

### Recommended Microphones

| Model | Interface | Sample Rate | Power | Notes |
|-------|-----------|-------------|-------|-------|
| INMP441 | I2S | Up to 48kHz | 3.3V | High quality, digital output |
| MAX9814 | Analog | Up to 20kHz | 3.3V-5V | AGC enabled, easy to use |
| SPH0645 | I2S | Up to 48kHz | 1.8V-3.6V | MEMS, low power |

### Power Consumption

- **Active Recording**: ~80-120mA
- **WiFi Connected (Idle)**: ~20-40mA
- **Deep Sleep**: ~10-150µA (depending on configuration)

---

## Next Steps

1. Assemble hardware components
2. Flash firmware to ESP32
3. Configure WiFi credentials
4. Test database connection
5. Verify audio recording
6. Test end-to-end flow
7. Deploy to production

---

## Resources

- [ESP32 Official Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Arduino ESP32 Core](https://github.com/espressif/arduino-esp32)
- [I2S Audio Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2s.html)

---

*Last updated: 16.12.2025*

