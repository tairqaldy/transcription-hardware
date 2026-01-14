#define BUTTON_PIN 27

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP); // use internal pull-up resistor
  Serial.println("Button test started. Press the button!");
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);
  
  if (buttonState == LOW) { // pressed
    Serial.println("Button pressed!");
    delay(300); // small debounce delay
  }
}
