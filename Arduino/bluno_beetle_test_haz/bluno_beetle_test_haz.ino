#include <Arduino_FreeRTOS.h>
#include <task.h>
#include <semphr.h>
#include "I2Cdev.h"
#include <MPU6050.h>

#if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
  #include "Wire.h"
#endif

#define STACK_SIZE          100
#define ACCEL_SENSITIVITY   8192
#define GYRO_SENSITIVITY    250
#define GRAVITY             9.81

#define N                   6   // size of buffer
#define INITIAL_NUM_SAMPLE  100
#define SAMPLE_RATE         50  // 50Hz sampling rate
#define DLPF_MODE           0   // MPU6050 on-board digital low pass filter

// RTOS variables
float buffer[N];
int in, out;
int itemsInBuffer = 0;

// sensor variable
MPU6050 mpu;

long currmillis = 0;
long startmillis = 0;

int avgAccX = 0;
int avgAccY = 0;
int avgAccZ = 0;

SemaphoreHandle_t xSemaphoreProducer = NULL;
SemaphoreHandle_t xSemaphoreBuffer = NULL;

void setup(){
  // join I2C bus (I2Cdev library doesn't do this automatically) 
  #if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
    Wire.begin();
  #elif I2CDEV_IMPLEMENTATION == I2CDEV_BUILTIN_FASTWIRE
    Fastwire::setup(400, true);   // set I2C speed to 400kbps. Max speed is 500kbps
  #endif

  // Setup serial
  Serial.begin(115200);

  // initialize device
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

  // insert comms handshake here

  // create semaphores - currently we only have one task
  xSemaphoreProducer = xSemaphoreCreateBinary();
  xSemaphoreBuffer = xSemaphoreCreateMutex();

  // give semaphores
  xSemaphoreGive((xSemaphoreBuffer));
  xSemaphoreGive((xSemaphoreProducer));

  // create tasks
  xTaskCreate(A1Task, "A1", 100, NULL, 3, NULL);
  xTaskCreate(CommTask, "C", 100, NULL, 2, NULL);
}

void loop(){
  
}

// Task for A1
static void A1Task(void* pvParameter){
  int16_t ax, ay, az, gx, gy, gz;

  while(1){
    if((xSemaphoreProducer != NULL) && (xSemaphoreBuffer != NULL)){
      if((xSemaphoreTake(xSemaphoreProducer, portMAX_DELAY) == pdTRUE) && (xSemaphoreTake(xSemaphoreBuffer, 0) == pdTRUE)){
        mpu.getAcceleration(&ax, &ay, &az);
        mpu.getRotation(&gx, &gy, &gz);
                
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

        itemsInBuffer += 6;
                
        xSemaphoreGive(xSemaphoreBuffer);
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
    if((xSemaphoreBuffer != NULL) && (itemsInBuffer == 6)){
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

