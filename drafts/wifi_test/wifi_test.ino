#include <WiFi.h>

const char* ssid = "tair-hotspot";
const char* password = "password";

void setup() {
  Serial.begin(115200);
  Serial.println("Connecting...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
}
