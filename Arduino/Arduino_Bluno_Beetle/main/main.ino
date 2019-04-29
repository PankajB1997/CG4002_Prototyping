#include <Arduino_FreeRTOS.h>
#include <semphr.h>
#include "I2Cdev.h"
#include "MPU6050.h"

#if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
    #include "Wire.h"
#endif

#define STACK_SIZE          100
#define ACCEL_SENSITIVITY   8192
#define GYRO_SENSITIVITY    250
#define GRAVITY             9.81
//#define OUTPUT_READABLE_ACCELGYRO //uncomment to print the values read from the accelerometers
#define SAMPLE_SIZE 4

#define N                   6   // size of buffer
#define INITIAL_NUM_SAMPLE  100
#define SAMPLE_RATE         50  // 50Hz sampling rate
#define DLPF_MODE           0   // MPU6050 on-board digital low pass filter

// RTOS variables
float buffer[30];
int in, out;
int itemsInBuffer = 0;

// sensor variable
MPU6050 mpu;

// Handshake Variables
int handShakeFlag = 0;
int ackFlag = 0;

long currmillis = 0;
long startmillis = 0;

int avgAccX = 0;
int avgAccY = 0;
int avgAccZ = 0;

SemaphoreHandle_t xSemaphoreProducer = NULL;
SemaphoreHandle_t xSemaphoreBuffer = NULL;
int readFlag = 0;
int count = 0;

void connectToPi() {
  Serial.println("Begin Handshaking with RPI.");
  //receive Handshake from Rpi
  while (handShakeFlag == 0) {
    if (Serial.available()) {
      if (Serial.read() == 'H') {
        handShakeFlag = 1;
        //Serial.write('B');  //send a B to Pi
      }
    }
  }

  //Receive Ack from Rpi
//  while (ackFlag == 0) {
//    if (Serial.available()) {
//      int incoming = Serial.read();
//      Serial.println(char(incoming));
//      if (incoming == 'F') {
//        ackFlag = 1;
//      }
//    } else {
//      Serial.write('B');
//      delay(1000);
//    }
//  }
  //Serial.println("Arduino is Ready!");

}


void setup() {
  Serial.begin(115200);

  // ACC setup
  #if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
    Wire.begin();
  #elif I2CDEV_IMPLEMENTATION == I2CDEV_BUILTIN_FASTWIRE
    Fastwire::setup(400, true);
  #endif

  // initialize device
  Serial.println("Initializing I2C devices...");
  mpu.initialize();
  mpu.setRate(SAMPLE_RATE);
  mpu.setDLPFMode(DLPF_MODE);       // set on-board digital low-pass filter configuration
  mpu.setFullScaleAccelRange(1);    // 0 = +/- 2g
                                    // 1 = +/- 4g
                                    // 2 = +/- 8g
                                    // 3 = +/- 16g
  mpu.setFullScaleGyroRange(0);     // FS_SEL | Full Scale Range    | LSB Sensitivity
                                    // 0      | +/- 250 degrees/s   | 131 LSB/deg/s
                                    // 1      | +/- 500 degrees/s   | 65.5 LSB/deg/s
                                    // 2      | +/- 1000 degrees/s  | 32.8 LSB/deg/s
                                    // 3      | +/- 2000 degrees/s  | 16.4 LSB/deg/s

  // mpu.setXAccelOffset();
  // mpu.setYAccelOffset();
  // mpu.setZAccelOffset();
  // mpu.setXGyroOffset();
  // mpu.setYGyroOffset();
  // mpu.setZGyroOffset();

  // verify connection
  Serial.println("Testing device connections...");
  Serial.println(mpu.testConnection() ? "MPU6050 - accelgyro1 connection successful" : "MPU6050 - accelgyro1 connection failed");
  
  connectToPi();
  
  // create semaphores - currently we only have one task
  xSemaphoreProducer = xSemaphoreCreateBinary();
  xSemaphoreBuffer = xSemaphoreCreateMutex();

  // give semaphores
  xSemaphoreGive((xSemaphoreBuffer));
  xSemaphoreGive((xSemaphoreProducer));
  
  // create tasks
  //xTaskCreate(A1Task, "A1", 100, NULL, 3, NULL);
  //xTaskCreate(CommTask, "C", 100, NULL, 2, NULL);
  xTaskCreate(mainTask, "Main Task", 400, NULL, 3, NULL);
}

void loop() {

}

void mainTask(void *p) {
  int incomingByte;
  unsigned int len;
  char s[4];
  TickType_t xLastWakeTime;
  int16_t ax, ay, az, gx, gy, gz;
  int bufferCount = 0;

  xLastWakeTime = xTaskGetTickCount();
  for(;;){
    //if (Serial.available()) {       // Check if message available
      //incomingByte = Serial.read();
    //}
    //if(incomingByte == 'R'){
      xLastWakeTime = xTaskGetTickCount();
      memset(buffer, 0.0, 30);
      bufferCount = 0;
      //for (int i = 0; i < 5; i++) {
        
        mpu.getAcceleration(&ax, &ay, &az);
        mpu.getRotation(&gx, &gy, &gz);
        buffer[bufferCount] = (((float)(ax-avgAccX)/ACCEL_SENSITIVITY)*GRAVITY);
        //in = (in+1)%N;
        bufferCount += 1;
        buffer[bufferCount] = (((float)(ay-avgAccY)/ACCEL_SENSITIVITY)*GRAVITY);
        bufferCount += 1;
        buffer[bufferCount] = (((float)(az-avgAccZ)/ACCEL_SENSITIVITY)*GRAVITY);
        bufferCount += 1;
        buffer[bufferCount] = (int)((float)gx/GYRO_SENSITIVITY);
        bufferCount += 1;
        buffer[bufferCount] = (int)((float)gy/GYRO_SENSITIVITY);
        bufferCount += 1;
        buffer[bufferCount] = (int)((float)gz/GYRO_SENSITIVITY);
        bufferCount += 1;
        
        //vTaskDelayUntil(&xLastWakeTime, (20 / portTICK_PERIOD_MS)); // read acc every 50ms
      //}
      
      for(int i=0; i < 6; i++){
        Serial.print(buffer[i]);
        Serial.print(",");
        //if(i == 5 || i == 11 || i == 17 || i == 23 || i == 29){
          //Serial.print("\n");
        //}
      }
      Serial.print("\n");
      incomingByte = 0;
      vTaskDelayUntil(&xLastWakeTime, (20 / portTICK_PERIOD_MS)); // read acc every 50ms
    //}
  }
}

// Task for A1
static void A1Task(void* pvParameter){
  int16_t ax, ay, az, gx, gy, gz;
  const TickType_t xDelay = 50 / portTICK_PERIOD_MS;

  while(1){
    if((xSemaphoreProducer != NULL) && (xSemaphoreBuffer != NULL)){
      if((xSemaphoreTake(xSemaphoreProducer, portMAX_DELAY) == pdTRUE) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){
        mpu.getAcceleration(&ax, &ay, &az);
        mpu.getRotation(&gx, &gy, &gz);
        
//        while (readFlag == 0) {
//          if (Serial.available()) {
//            if (Serial.read() == 'R') {
//              readFlag = 1;
//              count = 0;
//            }
//          }
//        }

        buffer[in] = (((float)(ax-avgAccX)/ACCEL_SENSITIVITY)*GRAVITY);
        in = (in+1)%N;
        buffer[in] = (((float)(ay-avgAccY)/ACCEL_SENSITIVITY)*GRAVITY);
        in = (in+1)%N;
        buffer[in] = (((float)(az-avgAccZ)/ACCEL_SENSITIVITY)*GRAVITY);
        in = (in+1)%N;
        buffer[in] = (int)((float)gx/GYRO_SENSITIVITY);
        in = (in+1)%N;
        buffer[in] = (int)((float)gy/GYRO_SENSITIVITY);
        in = (in+1)%N;
        buffer[in] = (int)((float)gz/GYRO_SENSITIVITY);
        in = (in+1)%N;

        itemsInBuffer += N;
        count += 1;
                
        xSemaphoreGive(xSemaphoreBuffer);
        vTaskDelay(xDelay);
//        xSemaphoreGive(xSemaphoreProducer);
      }
      else {
//        Serial.println("A1: Failed to grab semaphores and start task!");
      }
    }
  }
}

static void CommTask(void* pvParameters){
  while(1){
    if((xSemaphoreBuffer != NULL) && (itemsInBuffer == N)){
      if(xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE){
        int i;
//        Serial.write(START_FLAG);
//        Serial.write(INBD_DATA);
//        Serial.write(0b11110001);
        
        for(i=0; i<N; i++){
//          int val = buffer[out];
//          out = (out+1) % N;
//          Serial.write(highByte(val));
//          Serial.write(lowByte(val));
          Serial.print(buffer[i]);
          Serial.print(",");
        }
        Serial.println();
        Serial.println(count);

        itemsInBuffer = 0;

        vTaskDelay(1);
        xSemaphoreGive(xSemaphoreBuffer);
        xSemaphoreGive(xSemaphoreProducer);
      }
      else {
//        Serial.println("C: Failed to grab semaphores and start task!");
      }
    }
  }
}
