#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <Adafruit_NeoPixel.h>
#include <driver/i2s.h>

// Definitions
#define BUTTON_PIN 13
#define LED_PIN    27
#define NUMPIXELS  3

const char* ssid = "NoteNecklace"; // WiFi Name
WebServer server(80);
Adafruit_NeoPixel pixels(NUMPIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);

bool isRecording = false;
bool lastBtnState = HIGH;

void handleRoot() {
  server.send(200, "text/html", "<h1>NoteNecklace</h1><p>Connect to stream...</p>");
}

void setup() {
  Serial.begin(115200);
  
  // 1. WiFi Access Point Setup
  WiFi.softAP(ssid);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  server.on("/", handleRoot);
  server.begin();

  // 2. Pins & LEDs
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pixels.begin();
  pixels.setBrightness(50); // Keep brightness low to save power for WiFi

  // Test glow
  for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0,0,255));
  pixels.show();

  // 3. I2S Mic Setup (16kHz for stability)
  setupI2S();
}

void loop() {
  server.handleClient();

  // Toggle Logic
  bool currentBtn = digitalRead(BUTTON_PIN);
  if (lastBtnState == HIGH && currentBtn == LOW) {
    isRecording = !isRecording;
    delay(250);
  }
  lastBtnState = currentBtn;

  if (isRecording) {
    // Green Pulse + Audio logic here
    handleRecordingMode();
  } else {
    // Solid Blue
    for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0,0,255));
    pixels.show();
  }
}

void handleRecordingMode() {
  size_t bytes_read;
  uint8_t buffer[512]; // Chunks of data
  i2s_read(I2S_NUM_0, buffer, sizeof(buffer), &bytes_read, portMAX_DELAY);

  if (bytes_read > 0) {
    // 1. Visuals: Green Glow
    int vol = abs((int16_t)buffer[0]) << 2; 
    vol = constrain(vol, 40, 255);
    for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, vol, 0));
    pixels.show();

    // 2. DATA PUSH: If a client (laptop/phone) is listening, send the bytes
    // We send this as a raw binary stream
    if (WiFiClient client = server.client()) {
       if (client.connected()) {
         client.write(buffer, bytes_read);
       }
    }
  }
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