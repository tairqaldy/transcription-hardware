#include "driver/i2s.h"

#define SAMPLE_RATE 16000
#define I2S_READ_LEN 1024

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

void setup() {
  Serial.begin(115200);

  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);

  Serial.println("Mic test started. Speak into it.");
}

void loop() {
  uint8_t buffer[I2S_READ_LEN];
  size_t bytes_read;

  i2s_read(I2S_NUM_0, buffer, I2S_READ_LEN, &bytes_read, portMAX_DELAY);

  long sum = 0;
  for (int i = 0; i < bytes_read; i++) {
    sum += abs(buffer[i]);
  }

  Serial.println(sum);  
  delay(100);
}
