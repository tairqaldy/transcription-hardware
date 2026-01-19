#include <WiFi.h>
#include <Adafruit_NeoPixel.h>
#include <driver/i2s.h>
#include <ESPSupabase.h>
#include <FS.h>
#include <SD.h>
#include <SPI.h>

// --- Configuration ---
const char* ssid = "Samsung Smart Fridge";
const char* password = "penisz1234";
const char* supabaseUrl = "https://kmnbvxhfdfnrmnjxfkwf.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbmJ2eGhmZGZucm1uanhma3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzAwNTAsImV4cCI6MjA4MDk0NjA1MH0.Vzgmk7EKkrN3r67iPEfoza2sX5hfCJFKd3ohvLnC0rE"; 

#define BUTTON_PIN 13
#define LED_PIN    27
#define NUMPIXELS  3
#define SD_CS      5

Adafruit_NeoPixel pixels(NUMPIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);
Supabase supabase;

bool isRecording = false;
bool isUploading = false;
String currentSessionId = "";
File recFile;

// --- Function Prototypes ---
void handleButton();
void captureAudio();
void uploadTask(void * pvParameters);
void uploadFileToSupabase(String fileName);
void showIdlePattern();
void setupI2S();
void writeWavHeader(File file, int totalDataSize);
String generateUUID();

void setup() {
  Serial.begin(115200);
  

  pinMode(BUTTON_PIN, INPUT_PULLUP); 
  
  pixels.begin();
  pixels.setBrightness(40); 
  
  if (!SD.begin(SD_CS)) {
    Serial.println("SD Error!");
    while(1) { pixels.setPixelColor(1, pixels.Color(255,0,0)); pixels.show(); delay(500); }
  }

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  supabase.begin(supabaseUrl, supabaseKey);
  setupI2S();
  
  // Ready signal
  for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, 255, 0));
  pixels.show();
  delay(500);
}

void loop() {
  handleButton();

  if (isRecording) {
    captureAudio();
  } else if (!isUploading) {
    showIdlePattern();
  }
}

void handleButton() {
  static bool lastBtnState = HIGH;
  bool reading = digitalRead(BUTTON_PIN);

  // Detect a state change (Pressing down)
  if (reading == LOW && lastBtnState == HIGH) {
    delay(50); // Simple debounce
    
    if (!isRecording && !isUploading) {
      // START
      currentSessionId = generateUUID();
      String path = "/rec_" + currentSessionId + ".wav";
      recFile = SD.open(path, FILE_WRITE);
      if (recFile) {
        uint8_t header[44] = {0};
        recFile.write(header, 44);
        isRecording = true;
        Serial.println("RECORDING START");
      }
    } 
    else if (isRecording) {
      // STOP
      isRecording = false;
      int fileSize = recFile.size();
      recFile.seek(0);
      writeWavHeader(recFile, fileSize - 44);
      recFile.close();
      Serial.println("RECORDING STOP");
      
      isUploading = true;
      xTaskCreate(uploadTask, "UploadTask", 10000, NULL, 1, NULL);
    }
  }
  lastBtnState = reading;
}

void captureAudio() {
  size_t bytes_read;
  uint8_t tempBuffer[512];
  
  // Change portMAX_DELAY to 0 so it doesn't block the button check!
  i2s_read(I2S_NUM_0, tempBuffer, sizeof(tempBuffer), &bytes_read, 0); 

  if (isRecording && recFile && bytes_read > 0) {
    recFile.write(tempBuffer, bytes_read);
    
    // Quick visual feedback
    int16_t sample = (tempBuffer[1] << 8) | tempBuffer[0];
    int vol = abs(sample) >> 6;
    pixels.setPixelColor(1, pixels.Color(0, constrain(vol, 30, 255), 0));
    pixels.show();
  }
}

void uploadTask(void * pvParameters) {
    String fileName = "/rec_" + currentSessionId + ".wav";
    uploadFileToSupabase(fileName);
    isUploading = false; 
    vTaskDelete(NULL);
}

void uploadFileToSupabase(String fileName) {
  File file = SD.open(fileName, FILE_READ);
  if (!file) return;

  uint32_t fileSize = file.size();
  String remotePath = fileName.substring(1); 

  // Blue for Upload
  for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, 0, 255));
  pixels.show();

  int status = supabase.upload("audio", remotePath, "application/octet-stream", (Stream*)&file, fileSize);
  Serial.print("Supabase Return: ");
  Serial.println(status);

  file.close();
}

String generateUUID() {
  String uuid = "";
  for (int i = 0; i < 16; i++) {
    const char *hex = "0123456789abcdef";
    uuid += hex[random(0, 16)];
  }
  return uuid;
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

void writeWavHeader(File file, int totalDataSize) {
  int sampleRate = 16000;
  int bitsPerSample = 16;
  int channels = 1;
  int byteRate = sampleRate * channels * bitsPerSample / 8;
  uint8_t header[44];
  memcpy(header, "RIFF", 4);
  int fileSize = totalDataSize + 36;
  memcpy(header + 4, &fileSize, 4);
  memcpy(header + 8, "WAVE", 4);
  memcpy(header + 12, "fmt ", 4);
  int fmtSize = 16;
  memcpy(header + 16, &fmtSize, 4);
  int16_t audioFormat = 1;
  memcpy(header + 20, &audioFormat, 2);
  memcpy(header + 22, &channels, 2);
  memcpy(header + 24, &sampleRate, 4);
  memcpy(header + 28, &byteRate, 4);
  int16_t blockAlign = channels * bitsPerSample / 8;
  memcpy(header + 32, &blockAlign, 2);
  memcpy(header + 34, &bitsPerSample, 2);
  memcpy(header + 36, "data", 4);
  memcpy(header + 40, &totalDataSize, 4);
  file.write(header, 44);
}

void showIdlePattern() {
  float val = (exp(sin(millis() / 2000.0 * PI)) - 0.36787944) * 108.0;
  for(int i=0; i<3; i++) pixels.setPixelColor(i, pixels.Color(0, 0, val));
  pixels.show();
}