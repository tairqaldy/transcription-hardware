#include <WiFi.h>
#include <HTTPClient.h>

String WIFI_SSID = "tair-hotspot";
String WIFI_PASS = "12345678tair";

String SUPABASE_URL = "https://....supabase.co/rest/v1/notes";
String SUPABASE_KEY = "eyJhbG...";

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.println("Connecting...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  HTTPClient http;

  http.begin(SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);

  String body = "{\"device_id\":\"esp32-test\",\"text\":\"hello from esp32\",\"lang\":\"en\"}";

  int code = http.POST(body);

  Serial.print("Supabase code: ");
  Serial.println(code);
  Serial.println(http.getString());

  http.end();
}

void loop() {}
