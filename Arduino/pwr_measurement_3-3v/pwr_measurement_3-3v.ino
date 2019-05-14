// resistor used:
//                12kohm + (()) + 8.2kohm
// calibrated value
//                11.78kohm + 8.1kohm <=> 7.2V == 3.2V
// old resistor choice:
//                10ohm + 10ohm + 120ohm + 1kohm + (()) + 100ohm = 1.240kohm
/*
 * Owner:   Hazmei Bin Abdul Rahman
 * Module:  CG3002 (Embedded Systems Project)
 * Date:    18 SEPTEMBER 2017
 * 
 * Code is referenced from:
 * Voltage - https://startingelectronics.org/articles/arduino/measuring-voltage-with-arduino/
 */

#define VOLT_REF 5            // voltage reference to 5V

// Constants
const int VOLT_PIN = A0;      // Input pin for measuring Vin

void setup() {
  Serial.begin(9600);
}

void loop() {
  int sumCount = 0;

  int rawInput;
  float voltRemapped;
  float voltage;

  pinMode(VOLT_PIN,INPUT);

  rawInput = analogRead(VOLT_PIN);
  
  // Remap the ADC value into a voltage number (5V reference)
  voltRemapped = (rawInput * VOLT_REF) / 1023.0;

  // voltage multiplied by ~2.38 when using voltage divider
  // 7.852 3.2409 2.42278379462495
  voltage = voltRemapped * 2.38;

  Serial.print(" A, Voltage: ");
  Serial.println(voltage, 3);
  delay(500);
}

