# Hardware Documentation

Sensor code can be found in the `somewhere` folder.  
Sensor schematic can be found in the `somewhere` folder.  
Circuit design can be found in the `somewhere` folder.  

## Hardware Components & Sensors
- 6x AA rechargeable battery
- 1x 6 AA battery holder
- 1x GP ReCyko+ AA Charger
- 1x Ankle support
- 1x Li-Po Charger
- 4x 3.7V 150mAh Li-Po
- 2x 3.7V 500mAh Li-Po
- 10x Bluno Beetle
- 30x CR2032 Coin Cell battery
- 2x GT-511C1R Fingerprint Sensor
- 1x MyoWare EMG Sensor
- 14x Biomedical Stickers
- 1x EMG cable
- 1x Raspberry Pi
- 1x Micro SD card
- 6x MPU-6050 Accel/Gyro Sensor
- 1x 5V 3A LDO Regulator
- 6x DC-DC 3.3V 0.5A Regulator
- 1x INA169 Current Sensor

## Hardware Setup  
![Pololu DC-DC 3.3V 500mA Regulator](./images/dcdc-regulator.JPG)

## Hardware Code (Bluno Beetle)  
There are 2 set of freeRTOS code for the Bluno Beetle:  
1. i2c comms code - RPi <--> 1x Bluno Beetle (Fingerprint, Power, EMG)
2. BLE comms code - RPi <--> 6x Bluno Beetle (IMU data - accelerometer + gyrometer)