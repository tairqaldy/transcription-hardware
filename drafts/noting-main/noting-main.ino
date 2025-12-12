#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "driver/i2s.h"

// ----------------------
// CONFIG
// ----------------------
String WIFI_SSID = "tair-hotspot";
String WIFI_PASS = "password";

String OPENAI_KEY = "sk-p...";     // Must start with sk-proj
String SUPABASE_URL = "https://....supabase.co/rest/v1/notes";
String SUPABASE_KEY = "eyJh...";

// Device
#define DEVICE_ID "esp32-necklace"

// Pins
#define BUTTON_PIN 27
#define LED_PIN 2   // GPIO2 = onboard LED

// Audio parameters
#define SAMPLE_RATE 16000
#define CHANNELS 1
#define CHUNK_SECONDS 2
#define I2S_READ_LEN 2048

// I2S pins
#define PIN_I2S_SCK 14
#define PIN_I2S_WS  15
#define PIN_I2S_SD  32

bool recording = false;
String mergedFinal = "";
bool buttonPrev = HIGH;

// ----------------------
// I2S CONFIG
// ----------------------
i2s_config_t i2s_config = {
  .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
  .sample_rate = SAMPLE_RATE,
  .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
  .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
  .communication_format = I2S_COMM_FORMAT_I2S,
  .intr_alloc_flags = 0,
  .dma_buf_count = 4,
  .dma_buf_len = 1024,
  .use_apll = false
};

i2s_pin_config_t pin_config = {
  .bck_io_num = PIN_I2S_SCK,
  .ws_io_num = PIN_I2S_WS,
  .data_out_num = -1,
  .data_in_num = PIN_I2S_SD
};

// ----------------------
// WAV HEADER
// ----------------------
void writeWavHeader(uint8_t *buffer, int dataSize) {
  int fileSize = dataSize + 44 - 8;

  memcpy(buffer, "RIFF", 4);
  buffer[4] = fileSize & 0xff;
  buffer[5] = (fileSize >> 8);
  buffer[6] = (fileSize >> 16);
  buffer[7] = (fileSize >> 24);

  memcpy(buffer + 8, "WAVEfmt ", 8);

  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
  buffer[20] = 1; buffer[21] = 0;
  buffer[22] = CHANNELS; buffer[23] = 0;

  buffer[24] = SAMPLE_RATE & 0xff;
  buffer[25] = (SAMPLE_RATE >> 8);
  buffer[26] = (SAMPLE_RATE >> 16);
  buffer[27] = (SAMPLE_RATE >> 24);

  int byteRate = SAMPLE_RATE * CHANNELS * 2;
  buffer[28] = byteRate & 0xff;
  buffer[29] = (byteRate >> 8);
  buffer[30] = (byteRate >> 16);
  buffer[31] = (byteRate >> 24);

  buffer[32] = CHANNELS * 2; buffer[33] = 0;
  buffer[34] = 16; buffer[35] = 0;

  memcpy(buffer + 36, "data", 4);

  buffer[40] = dataSize & 0xff;
  buffer[41] = (dataSize >> 8);
  buffer[42] = (dataSize >> 16);
  buffer[43] = (dataSize >> 24);
}

// ----------------------
// SUPABASE SAVE CHUNK
// ----------------------
void saveChunk(String text) {
  HTTPClient http;
  http.begin(SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["text"] = text;
  doc["lang"] = "auto";
  doc["type"] = "chunk";

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}

// ----------------------
// SUPABASE FINAL MERGED
// ----------------------
void saveFinalMerged() {
  if (mergedFinal.length() == 0) return;

  HTTPClient http;
  http.begin(SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);

  StaticJsonDocument<2048> doc;
  doc["device_id"] = DEVICE_ID;
  doc["text"] = mergedFinal;
  doc["lang"] = "auto";
  doc["type"] = "final";

  String body;
  serializeJson(doc, body);
  http.POST(body);

  http.end();

  mergedFinal = "";
}

// ----------------------
// TRANSCRIBE WITH WHISPER-1
// ----------------------
String transcribe(uint8_t *wav, int wavSize) {
  WiFiClientSecure client;
  client.setInsecure();

  if (!client.connect("api.openai.com", 443)) {
    Serial.println("TLS connect failed");
    return "";
  }

  String boundary = "----ESP32BOUND";
  String startPart =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"model\"\r\n\r\n"
    "whisper-1\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"file\"; filename=\"chunk.wav\"\r\n"
    "Content-Type: audio/wav\r\n\r\n";

  String endPart = "\r\n--" + boundary + "--\r\n";
  int totalLen = startPart.length() + wavSize + endPart.length();

  client.printf("POST /v1/audio/transcriptions HTTP/1.1\r\n");
  client.printf("Host: api.openai.com\r\n");
  client.printf("Authorization: Bearer %s\r\n", OPENAI_KEY.c_str());
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %d\r\n\r\n", totalLen);

  client.print(startPart);
  client.write(wav, wavSize);
  client.print(endPart);

  String jsonLine = "";
  while (client.connected() || client.available()) {
    String line = client.readStringUntil('\n');
    if (line.startsWith("{\"text\"")) {
      jsonLine = line;
      break;
    }
  }

  if (jsonLine == "") return "";

  StaticJsonDocument<1024> json;
  deserializeJson(json, jsonLine);
  return (const char*)json["text"];
}

// ----------------------
// SETUP
// ----------------------
void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting...");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi OK");

  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);

  Serial.println("Ready!");
}

// ----------------------
// LOOP
// ----------------------
void loop() {
  bool buttonNow = digitalRead(BUTTON_PIN);

  // toggle mode
  if (buttonPrev == HIGH && buttonNow == LOW) {
    recording = !recording;
    digitalWrite(LED_PIN, recording ? HIGH : LOW);

    if (!recording) {
      saveFinalMerged();
    }

    delay(300);
  }

  buttonPrev = buttonNow;

  if (recording) {
    // 2-second chunk
    int samples = SAMPLE_RATE * CHUNK_SECONDS;
    int dataSize = samples * 2;
    int wavSize = dataSize + 44;

    uint8_t *wav = (uint8_t*)malloc(wavSize);
    writeWavHeader(wav, dataSize);

    size_t readLen;
    i2s_read(I2S_NUM_0, wav + 44, dataSize, &readLen, portMAX_DELAY);

    // LED blink during processing
    digitalWrite(LED_PIN, LOW);
    delay(60);
    digitalWrite(LED_PIN, HIGH);

    String text = transcribe(wav, wavSize);
    free(wav);

    if (text.length() > 1) {
      mergedFinal += text + " ";
      saveChunk(text);
      Serial.println("Chunk: " + text);
    } else {
      Serial.println("Empty chunk");
    }
  }
}
