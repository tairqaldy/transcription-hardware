#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "driver/i2s.h"

// WIFI
String WIFI_SSID = "tair-hotspot";
String WIFI_PASS = "12345678tair";

// OPENAI
String OPENAI_KEY = "sk-pr...";

// I2S mic config
#define SAMPLE_RATE 16000
#define CHANNELS 1
#define I2S_READ_LEN 2048

#define PIN_I2S_SCK 14
#define PIN_I2S_WS  15
#define PIN_I2S_SD  32

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

void writeWavHeader(uint8_t *buffer, int dataSize) {
  int fileSize = dataSize + 44 - 8;

  memcpy(buffer, "RIFF", 4);
  buffer[4] = fileSize & 0xff;
  buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff;
  buffer[7] = (fileSize >> 24) & 0xff;

  memcpy(buffer + 8, "WAVEfmt ", 8);

  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
  buffer[20] = 1; buffer[21] = 0;
  buffer[22] = CHANNELS; buffer[23] = 0;

  buffer[24] = SAMPLE_RATE & 0xff;
  buffer[25] = (SAMPLE_RATE >> 8) & 0xff;
  buffer[26] = (SAMPLE_RATE >> 16) & 0xff;
  buffer[27] = (SAMPLE_RATE >> 24) & 0xff;

  int byteRate = SAMPLE_RATE * CHANNELS * 2;
  buffer[28] = byteRate & 0xff;
  buffer[29] = (byteRate >> 8) & 0xff;
  buffer[30] = (byteRate >> 16) & 0xff;
  buffer[31] = (byteRate >> 24) & 0xff;

  buffer[32] = CHANNELS * 2; buffer[33] = 0;
  buffer[34] = 16; buffer[35] = 0;

  memcpy(buffer + 36, "data", 4);

  buffer[40] = dataSize & 0xff;
  buffer[41] = (dataSize >> 8) & 0xff;
  buffer[42] = (dataSize >> 16) & 0xff;
  buffer[43] = (dataSize >> 24) & 0xff;
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting...");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi connected!");

  // I2S start
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);

  delay(500);
  Serial.println("Recording 0.8s...");

  const int samples = SAMPLE_RATE * 0.8;
  const int dataSize = samples * 2;
  const int wavSize = dataSize + 44;

  uint8_t *wav = (uint8_t*)malloc(wavSize);
  writeWavHeader(wav, dataSize);

  size_t readLen = 0;
  i2s_read(I2S_NUM_0, wav + 44, dataSize, &readLen, portMAX_DELAY);

  Serial.println("Encoding multipart/form-data...");

  String boundary = "----------------ESP32BOUNDARY";
  String startPart =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"model\"\r\n\r\n"
    "whisper-1\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"file\"; filename=\"audio.wav\"\r\n"
    "Content-Type: audio/wav\r\n\r\n";

  String endPart =
    "\r\n--" + boundary + "--\r\n";

  int totalLen = startPart.length() + wavSize + endPart.length();

  WiFiClientSecure client;
  client.setInsecure();  

  if (!client.connect("api.openai.com", 443)) {
    Serial.println("Connection failed!");
    return;
  }

  Serial.println("Sending request...");

  client.printf("POST /v1/audio/transcriptions HTTP/1.1\r\n");
  client.printf("Host: api.openai.com\r\n");
  client.printf("Authorization: Bearer %s\r\n", OPENAI_KEY.c_str());
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %d\r\n\r\n", totalLen);

  client.print(startPart);
  client.write(wav, wavSize);
  client.print(endPart);

  free(wav);

  Serial.println("Waiting for OpenAI response...");

  while (client.connected() || client.available()) {
    String line = client.readStringUntil('\n');
    Serial.println(line);
  }
}

void loop() {}
