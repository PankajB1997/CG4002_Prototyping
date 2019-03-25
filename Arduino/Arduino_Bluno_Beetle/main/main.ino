#include <Arduino_FreeRTOS.h>
#include <semphr.h>
#include "I2Cdev.h"
#include "MPU6050.h"

#if I2CDEV_IMPLEMENTATION == I2CDEV_ARDUINO_WIRE
    #include "Wire.h"
#endif

#define STACK_SIZE 200
//#define OUTPUT_READABLE_ACCELGYRO //uncomment to print the values read from the accelerometers
#define SAMPLE_SIZE 4

MPU6050 accelgyro1(0x68);
//MPU6050 accelgyro2(0x69);

// Handshake Variables
int handShakeFlag = 0;
int ackFlag = 0;

// Accel+Gyro1
int16_t ax1_i, ay1_i, az1_i;
int16_t gx1_i, gy1_i, gz1_i;
float ax1, ay1, az1;
float gx1, gy1, gz1;

// Accel+Gyro2
//int16_t ax2_i, ay2_i, az2_i;
//int16_t gx2_i, gy2_i, gz2_i;
//float ax2, ay2, az2;
//float gx2, gy2, gz2;

// Buffer
char* ax1Char; char* ay1Char; char* az1Char; char* gx1Char;
char* gy1Char; char* gz1Char; char dataBuffer[500];

// Checksum
int checkSum = 0;
int checkSum2;
char checksumChar[4];

void connectToPi() {
  Serial.println("Begin Handshaking with RPI.");
  //receive Handshake from Rpi
  while (handShakeFlag == 0) {
    if (Serial.available()) {
      if (Serial.read() == 'H') {
        handShakeFlag = 1;
        Serial.write('B');  //send a B to Pi
      }
    }
  }

  //Receive Ack from Rpi
  while (ackFlag == 0) {
    if (Serial.available()) {
      int incoming = Serial.read();
      Serial.println(char(incoming));
      if (incoming == 'F') {
        ackFlag = 1;
      }
    } else {
      Serial.write('B');
      delay(1000);
    }
  }
  Serial.println("Arduino is Ready!");

}

void mainTask(void *p){
  int incomingByte;
  unsigned int len;
  char s[4];
  TickType_t xLastWakeTime;
  Serial.println("In main task");

  xLastWakeTime = xTaskGetTickCount();
  for(;;){
    if (Serial.available()) {       // Check if message available
      incomingByte = Serial.read();
      //Serial.print("Incoming byte is: ");
      //Serial.println(char(incomingByte));
    }
    if(incomingByte == 'H'){ // Reconnect with the Rpi if it disconnects
      Serial.println("Reconnecting!");
      handShakeFlag = 0;
      ackFlag = 0;
      connectToPi();
      incomingByte = 0;
    }
    if(incomingByte == 'R'){
      xLastWakeTime = xTaskGetTickCount();
      strcpy(dataBuffer, ""); //clear the dataBuffer

      //processPower();
      
      for (int i = 0; i < SAMPLE_SIZE; i++) {
        strcat(dataBuffer, "\n");
        //processAcc();
        //ACCMessageFormat();
        vTaskDelayUntil(&xLastWakeTime, (50 / portTICK_PERIOD_MS)); // read acc every 50ms
      }

      len = strlen(dataBuffer);
      for (int i = 0; i < len; i++) {
        checkSum += dataBuffer[i];
      }
      Serial.print("Checksum is ");
      Serial.println(checkSum);

      // check sum
      checkSum2 = (int)checkSum;
      itoa(checkSum2, checksumChar, 10);
      strcat(dataBuffer, ","); 
      strcat(dataBuffer, checksumChar); //add checksum
      strcat(dataBuffer, "\r"); //add breaking character

      len = strlen(dataBuffer);

      //Send message to rpi
      for (int j = 0; j < len + 1; j++) {
        Serial.write(dataBuffer[j]);
      }

      incomingByte = 0;
      checkSum = 0;
    }
  }
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
  accelgyro1.initialize();
  //accelgyro2.initialize();

  // verify connection
  Serial.println("Testing device connections...");
  Serial.println(accelgyro1.testConnection() ? "MPU6050 - accelgyro1 connection successful" : "MPU6050 - accelgyro1 connection failed");
  //Serial.println(accelgyro2.testConnection() ? "MPU6050 - accelgyro2 connection successful" : "MPU6050 - accelgyro2 connection failed");

  // use the code below to change accel/gyro offset values
  //*
  Serial.println("Updating internal sensor offsets...");
  // -76  -2359 1688  0 0 0
  Serial.println("Accelgyro1: ");
  Serial.print(accelgyro1.getXAccelOffset()); Serial.print("\t"); // -76
  Serial.print(accelgyro1.getYAccelOffset()); Serial.print("\t"); // -2359
  Serial.print(accelgyro1.getZAccelOffset()); Serial.print("\t"); // 1688
  Serial.print(accelgyro1.getXGyroOffset()); Serial.print("\t"); // 0
  Serial.print(accelgyro1.getYGyroOffset()); Serial.print("\t"); // 0
  Serial.print(accelgyro1.getZGyroOffset()); Serial.print("\t"); // 0
  Serial.print("\n");

  accelgyro1.setXAccelOffset(-3902);
  accelgyro1.setYAccelOffset(-1052);
  accelgyro1.setZAccelOffset(1661);
  accelgyro1.setXGyroOffset(49);
  accelgyro1.setYGyroOffset(-32);
  accelgyro1.setZGyroOffset(23);

//  Serial.println("Accelgyro2: ");
//  Serial.print(accelgyro2.getXAccelOffset()); Serial.print("\t"); // -76
//  Serial.print(accelgyro2.getYAccelOffset()); Serial.print("\t"); // -2359
//  Serial.print(accelgyro2.getZAccelOffset()); Serial.print("\t"); // 1688
//  Serial.print(accelgyro2.getXGyroOffset()); Serial.print("\t"); // 0
//  Serial.print(accelgyro2.getYGyroOffset()); Serial.print("\t"); // 0
//  Serial.print(accelgyro2.getZGyroOffset()); Serial.print("\t"); // 0
//  Serial.print("\n");
//
//  accelgyro2.setXAccelOffset(-1705);
//  accelgyro2.setYAccelOffset(-3766);
//  accelgyro2.setZAccelOffset(826);
//  accelgyro2.setXGyroOffset(38);
//  accelgyro2.setYGyroOffset(-7);
//  accelgyro2.setZGyroOffset(-3);
  //*/
  
  connectToPi();
  xTaskCreate(mainTask, "Main Task", 400, NULL, 3, NULL);
}

void loop() {

}
