#include <Arduino_FreeRTOS.h>
#include <task.h>
#include <semphr.h>
#include <Wire.h>

#define STACK_SIZE          100
#define SLAVE_ADDRESS       0x04

SemaphoreHandle_t xSemaphoreProducerA1 = NULL;
SemaphoreHandle_t xSemaphoreProducerA2 = NULL;
SemaphoreHandle_t xSemaphoreProducerA3 = NULL;
SemaphoreHandle_t xSemaphoreBuffer = NULL;

int flag = 1;

void setup(){
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
  //    1. read power
  //    2. read EMG
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
    if((xSemaphoreProducerA1 != NULL) && (xSemaphoreProducerA2 != NULL) && (xSemaphoreProducerA3 != NULL) && (xSemaphoreBuffer != NULL) && (flag == 1)){
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
static void A2Pow(void* pvParameter){

  while(1){
    if((xSemaphoreProducerA1 != NULL) && (xSemaphoreProducerA2 != NULL) && (xSemaphoreProducerA3 != NULL) && (xSemaphoreBuffer != NULL) && (flag == 2)){
      if((xSemaphoreTake(xSemaphoreProducerA1, portMAX_DELAY) == pdTRUE) && xSemaphoreTake(xSemaphoreProducerA2, portMAX_DELAY) && xSemaphoreTake(xSemaphoreProducerA3, portMAX_DELAY) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){
        Serial.println("Power");

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
    if((xSemaphoreProducerA1 != NULL) && (xSemaphoreProducerA2 != NULL) && (xSemaphoreProducerA3 != NULL) && (xSemaphoreBuffer != NULL) && (flag == 3)){
      if((xSemaphoreTake(xSemaphoreProducerA1, portMAX_DELAY) == pdTRUE) && xSemaphoreTake(xSemaphoreProducerA2, portMAX_DELAY) && xSemaphoreTake(xSemaphoreProducerA3, portMAX_DELAY) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){
        Serial.println("EMG");

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
    if((xSemaphoreBuffer != NULL) && (flag == 4)){
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

