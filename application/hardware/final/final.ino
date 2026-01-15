#include <WiFi.h>
#include <Adafruit_NeoPixel.h>
#include <driver/i2s.h>
#include <ESPSupabase.h>

// --- Configuration ---
const char* ssid = "Samsung Smart Fridge";
const char* password = "penisz1234";
const char* supabaseUrl = "https://kmnbvxhfdfnrmnjxfkwf.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbmJ2eGhmZGZucm1uanhma3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzAwNTAsImV4cCI6MjA4MDk0NjA1MH0.Vzgmk7EKkrN3r67iPEfoza2sX5hfCJFKd3ohvLnC0rE"; 

#define BUTTON_PIN 13
#define LED_PIN    27
#define NUMPIXELS  3

// Audio Buffer (Holds ~1 second of 16kHz 16-bit audio)
// 16000 samples * 2 bytes = 32000 bytes
const size_t RECORD_SIZE = 32000; 
uint8_t audioData[RECORD_SIZE];
size_t audioPtr = 0;

Adafruit_NeoPixel pixels(NUMPIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);
Supabase supabase;

bool isRecording = false;
String currentSessionId = "";
int chunkSequence = 0;

// Function Prototypes
void handleButton();
void captureAudio();
void sendToSupabase();
void showIdlePattern();
void setupI2S();
String base64Encode(uint8_t* data, size_t length);

void setup() {
  Serial.begin(115200);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pixels.begin();
  pixels.setBrightness(40); 
  
  // WiFi Connection with Visual Feedback
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    pixels.setPixelColor(0, pixels.Color(255, 0, 0)); // Red flash
    pixels.show();
    delay(250);
    pixels.clear();
    pixels.show();
    delay(250);
    Serial.println(".");
  }
  Serial.println("\nWiFi Connected!");

  supabase.begin(supabaseUrl, supabaseKey);
  setupI2S();
  
  // System Ready Glow (Green flash)
  for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, 255, 0));
  pixels.show();
  delay(500);
}

void loop() {
  handleButton();

  if (isRecording) {
    captureAudio();
  } else {
    showIdlePattern();
  }
}

String generateUUID() {
  String uuid = "";
  for (int i = 0; i < 32; i++) {
    const char *hex = "0123456789abcdef";
    uuid += hex[random(0, 16)];
    if (i == 7 || i == 11 || i == 15 || i == 19) uuid += "-";
  }
  return uuid;
}

void handleButton() {
  static bool lastBtnState = HIGH;
  static unsigned long lastDebounceTime = 0;
  bool reading = digitalRead(BUTTON_PIN);

  if (reading != lastBtnState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > 50) { // 50ms debounce
    if (reading == LOW && !isRecording) {
      // Start Recording
      isRecording = true;
      chunkSequence = 0;
      audioPtr = 0;
      
      // We still need a valid UUID for the audio_chunks table
      currentSessionId = generateUUID(); 
      
      Serial.println("Recording Started. UUID: " + currentSessionId);
      delay(300); 
    } 
    else if (reading == LOW && isRecording) {
      // Stop Recording
      isRecording = false;
      Serial.println("Recording Stopped.");
      delay(300);
    }
  }
  lastBtnState = reading;
}

void captureAudio() {
  size_t bytes_read;
  uint8_t tempBuffer[512];
  i2s_read(I2S_NUM_0, tempBuffer, sizeof(tempBuffer), &bytes_read, portMAX_DELAY);

  if (bytes_read > 0) {
    // Volume-Reactive Green LEDs
    int16_t sample = (tempBuffer[1] << 8) | tempBuffer[0];
    int vol = abs(sample) >> 6;
    for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, constrain(vol, 30, 255), 0));
    pixels.show();

    // Fill the Buffer
    if (audioPtr + bytes_read < RECORD_SIZE) {
      memcpy(audioData + audioPtr, tempBuffer, bytes_read);
      audioPtr += bytes_read;
    } else {
      // Buffer full: push to cloud
      sendToSupabase();
      audioPtr = 0; 
    }
  }
}


void sendToSupabase() {
  if (currentSessionId == "") return;

  chunkSequence++;
  String base64Audio = base64Encode(audioData, audioPtr);
  
  // 1. Calculate the 'metadata' your table requires
  // Your table has a CHECK constraint: data_size_bytes MUST be > 0
  int dataSize = audioPtr; 
  
  // Your duration calculation: (Total Bytes / 2 bytes per sample) / 16000 samples per sec
  float duration = (float)(dataSize / 2.0) / 16000.0;

  // 2. Build the JSON with the specific columns your SQL code defined
  String jsonData = "{";
  jsonData += "\"device_id\":\"4dbdd7cc-17b9-42c1-8965-bf9709a56c0f\",";
  jsonData += "\"session_id\":\"" + currentSessionId + "\","; 
  jsonData += "\"chunk_sequence\":" + String(chunkSequence) + ",";
  jsonData += "\"audio_data\":\"" + base64Audio + "\",";
  jsonData += "\"data_size_bytes\":" + String(dataSize) + ","; // Required by your constraint
  jsonData += "\"duration_seconds\":" + String(duration, 2) + ",";
  jsonData += "\"sample_rate\":16000,";
  jsonData += "\"bits_per_sample\":16,";
  jsonData += "\"channels\":1";
  jsonData += "}";
  
  // 3. Send to Supabase
  int httpCode = supabase.insert("audio_chunks", jsonData, false);
  Serial.print("Supabase Status: ");
  Serial.println(httpCode);
}

void showIdlePattern() {
  // Breathing Blue pattern
  float val = (exp(sin(millis() / 2000.0 * PI)) - 0.36787944) * 108.0;
  for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, 0, val));
  pixels.show();
}

String base64Encode(uint8_t* data, size_t length) {
  const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String encoded = "";
  encoded.reserve(((length + 2) / 3) * 4 + 1); 

  for (size_t i = 0; i < length; i += 3) {
    uint32_t octet_a = data[i];
    uint32_t octet_b = (i + 1 < length) ? data[i + 1] : 0;
    uint32_t octet_c = (i + 2 < length) ? data[i + 2] : 0;
    uint32_t triple = (octet_a << 16) + (octet_b << 8) + octet_c;

    encoded += base64_chars[(triple >> 18) & 0x3F];
    encoded += base64_chars[(triple >> 12) & 0x3F];
    encoded += (i + 1 < length) ? base64_chars[(triple >> 6) & 0x3F] : '=';
    encoded += (i + 2 < length) ? base64_chars[triple & 0x3F] : '=';
  }
  return encoded;
}

void setupI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64
  };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_pin_config_t pins = {.bck_io_num = 33, .ws_io_num = 25, .data_out_num = -1, .data_in_num = 32};
  i2s_set_pin(I2S_NUM_0, &pins);
}