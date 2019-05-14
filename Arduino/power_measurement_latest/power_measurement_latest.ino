/*
 * Owner:   Hazmei Bin Abdul Rahman
 * Module:  CG3002 (Embedded Systems Project)
 * Date:    18 SEPTEMBER 2017
 * 
 * Code is referenced from:
 * Voltage - https://startingelectronics.org/articles/arduino/measuring-voltage-with-arduino/
 * Current - https://learn.sparkfun.com/tutorials/ina169-breakout-board-hookup-guide
 */

#define VOLT_REF 5

// Constants
const int VOLT_PIN = A0;      // Input pin for measuring Vin
const int INA169_OUT = A1;    // Input pin for measuring Vout
const float RS = 0.09;        // Shunt resistor value (in ohms, calibrated)
const int RL = 10;            // Load resistor value (in ohms)

void setup() {
  Serial.begin(9600);
}

void loop() {
  // current
  int ina169raw;   // Variable to store value from analog read
  float curr_adc;
  float current;     // Calculated current value
  // ================================ //

  // voltage
  int rawInput;
  float voltRemapped;
  float voltage;
  // ================================ //

  pinMode(INA169_OUT,INPUT);
  pinMode(VOLT_PIN,INPUT);
  
  ina169raw = analogRead(INA169_OUT);
  rawInput = analogRead(VOLT_PIN);
  
  // Remap the ADC value into a voltage number (5V reference)
  curr_adc = (float)(ina169raw * VOLT_REF) / 1023.0;

  // Remap the ADC value into a voltage number (5V reference)
  voltRemapped = (rawInput * VOLT_REF) / 1023.0;
    
  // Follow the equation given by the INA169 datasheet to
  // determine the current flowing through RS.
  // Is = (Vout x 1k) / (RS x RL)
  current = curr_adc / (RS * RL);
  
  // voltage multiplied by ~2.38 when using voltage divider
  // 7.852 3.2409 2.42278379462495
  voltage = voltRemapped * 2.38;
  
  Serial.print("Voltage: ");
  Serial.print(voltage, 3);
  Serial.print(" V, Current: ");
  Serial.print(current, 3);
  Serial.println(" A");
  delay(500);
}

