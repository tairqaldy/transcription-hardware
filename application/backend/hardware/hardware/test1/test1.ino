// Import WiFi and ESPSupabase Library
#include <WiFi.h>
#include <ESPSupabase.h>

// Wi-Fi credentials
const char* ssid = "Xbox";
const char* password = "penisz1234";

// Supabase credentials
const char* supabaseUrl = "";
const char* supabaseKey = "";

Supabase supabase;

void setup() {
  Serial.begin(115200);                       // if not doing this, ArduinoIDE will give an error, not knowing what serial is (not being defined)

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {     // while the wifi status is NOT established send out a print line to the serial monitor
    delay(1000);
    Serial.println("Connecting to Wi-Fi...");
  }
  Serial.println("Wi-Fi connected!");        // otherwise send out this printline    //ln meaning in a new row

  // Init Supabase
  supabase.begin(supabaseUrl, supabaseKey);  

  //table name
  String tableName = "healthdata";
  // change the correct columns names you create in your table
  String jsonData = "{\"heartrate\": \"70\", \"bodytemp\": \"37\"}";

  // sending data to supabase
  int response = supabase.insert(tableName, jsonData, false); 
  if (response == 200) {
    Serial.println("Data inserted successfully!");
  } else {
    Serial.print("Failed to insert data. HTTP response: ");
    Serial.println(response);
  }
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