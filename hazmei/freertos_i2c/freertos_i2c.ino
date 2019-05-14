#include <Arduino_FreeRTOS.h>
#include <task.h>
#include <semphr.h>
#include <Wire.h>

#define STACK_SIZE          100
#define SLAVE_ADDRESS       0x04
#define VOLT_REF 5

// constants - power
const int VOLT_PIN = A0;                              // Input pin for measuring Vin
const int INA169_OUT = A1;                            // Input pin for measuring Vout
const float RS = 0.09;                                // Shunt resistor value (in ohms, calibrated)
const int RL = 10;                                    // Load resistor value (in ohms)

// constants - emg
const int EMG_PIN = A2;

// global variable - power
float powerData[4] = {0.0, 0.0, 0.0, 0.0};            // voltage, current, power, cumpower

// global variable - emg
int emgData = 0;

SemaphoreHandle_t xSemaphoreProducerA1 = NULL;
SemaphoreHandle_t xSemaphoreProducerA2 = NULL;
SemaphoreHandle_t xSemaphoreProducerA3 = NULL;
SemaphoreHandle_t xSemaphoreBuffer = NULL;

int start = 1;

void setup(){
  pinMode(INA169_OUT, INPUT);
  pinMode(VOLT_PIN, INPUT);
  pinMode(EMG_PIN, INPUT);
  
  // initialize i2c
  Wire.begin(SLAVE_ADDRESS);
  Wire.onReceive(receiveData);
  Wire.onRequest(sendData);

  // Setup serial
  Serial.begin(9600);
  Serial.println("Ready!");

  // insert comms handshake here

  // create semaphores - currently we only have one task
  xSemaphoreProducerA1 = xSemaphoreCreateBinary();
  xSemaphoreProducerA2 = xSemaphoreCreateBinary();
  xSemaphoreProducerA3 = xSemaphoreCreateBinary();
  xSemaphoreBuffer = xSemaphoreCreateMutex();

  // give semaphores
  xSemaphoreGive((xSemaphoreBuffer));
  xSemaphoreGive((xSemaphoreProducerA1));
  xSemaphoreGive((xSemaphoreProducerA2));
  xSemaphoreGive((xSemaphoreProducerA3));

  // create tasks
  // available task:
  //    1. fingerprint auth
  //    1. read power (DONE)
  //    2. read EMG (DONE)
  xTaskCreate(A1Fps, "FPS", 100, NULL, 3, NULL);
  xTaskCreate(A2Pow, "Power", 100, NULL, 3, NULL);
  xTaskCreate(A3Emg, "EMG", 100, NULL, 3, NULL);
  xTaskCreate(CommTask, "C", 100, NULL, 2, NULL);
  // the way these tasks are structured such that it runs from A1 > A2 > A3 > Comms task > A1 > ...
}

//data = Wire.read();
void receiveData(int byteCount) {
  while (Wire.available()) {
//    read inbound signal and flip the switch
  }
}

//example of sending int:
//  Wire.write(number);

//example of sending float:
//  float curr = 0.59;
//  Wire.write((byte*) &curr, sizeof(curr));

void sendData() {
  // read data and send
}

void loop(){
}

// Task for A1 - Fingerprint Sensor (only runs once)
static void A1Fps(void* pvParameter){

  while(1){
    if((xSemaphoreProducerA1 != NULL) && (xSemaphoreProducerA2 != NULL) && (xSemaphoreProducerA3 != NULL) && (xSemaphoreBuffer != NULL)){
      if((xSemaphoreTake(xSemaphoreProducerA1, portMAX_DELAY) == pdTRUE) && xSemaphoreTake(xSemaphoreProducerA2, portMAX_DELAY) && xSemaphoreTake(xSemaphoreProducerA3, portMAX_DELAY) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){
        Serial.println("FPS");

        vTaskDelay(1);
        xSemaphoreGive(xSemaphoreProducerA2);
        xSemaphoreGive(xSemaphoreProducerA3);
        xSemaphoreGive(xSemaphoreBuffer);
      }
    }
  }
}

// Task for A2 - Power Measurement
// should store in global variables
static void A2Pow(void* pvParameter){

  while(1){
    if((xSemaphoreProducerA1 != NULL) && (xSemaphoreProducerA2 != NULL) && (xSemaphoreProducerA3 != NULL) && (xSemaphoreBuffer != NULL)){
      if((xSemaphoreTake(xSemaphoreProducerA1, portMAX_DELAY) == pdTRUE) && xSemaphoreTake(xSemaphoreProducerA2, portMAX_DELAY) && xSemaphoreTake(xSemaphoreProducerA3, portMAX_DELAY) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){        
        // current
        int ina169raw;   // Variable to store value from analog read
        float curr_adc;
        float current;     // Calculated current value
        float power;
        float cumpower = 0.0;
        
        // voltage
        int rawInput;
        float voltRemapped;
        float voltage;
        
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

        power = voltage * current;
//        cumpower = (powerData[3] + power) / 2;  // this is wrong

        powerData[0] = voltage;         // voltage
        powerData[1] = current;         // current
        powerData[2] = power;           // power
        powerData[3] = cumpower;        // cumpower
        Serial.println("power");

        vTaskDelay(1);
        xSemaphoreGive(xSemaphoreProducerA1);
        xSemaphoreGive(xSemaphoreProducerA3);
        xSemaphoreGive(xSemaphoreBuffer);
      }
    }
  }
}


// Task for A3 - EMG
static void A3Emg(void* pvParameter){

  while(1){
    if((xSemaphoreProducerA1 != NULL) && (xSemaphoreProducerA2 != NULL) && (xSemaphoreProducerA3 != NULL) && (xSemaphoreBuffer != NULL)){
      if((xSemaphoreTake(xSemaphoreProducerA1, portMAX_DELAY) == pdTRUE) && xSemaphoreTake(xSemaphoreProducerA2, portMAX_DELAY) && xSemaphoreTake(xSemaphoreProducerA3, portMAX_DELAY) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){
        Serial.println("EMG");
        
        int raw = 0;
        raw = analogRead(A2);
        emgData = raw;
        
        vTaskDelay(1);
        xSemaphoreGive(xSemaphoreProducerA1);
        xSemaphoreGive(xSemaphoreProducerA2);
        xSemaphoreGive(xSemaphoreBuffer);
      }
    }
  }
}

static void CommTask(void* pvParameters){
  while(1){
    if((xSemaphoreBuffer != NULL)){
      if(xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE){
        Serial.println("Comms");

        vTaskDelay(1);
        xSemaphoreGive(xSemaphoreBuffer);
        xSemaphoreGive(xSemaphoreProducerA1);
        xSemaphoreGive(xSemaphoreProducerA2);
        xSemaphoreGive(xSemaphoreProducerA3);
      }
    }
  }
}

