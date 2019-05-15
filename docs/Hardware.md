# Hardware Documentation

**Sensor code can be found in the `Arduino` folder.**  
<!-- Sensor schematic can be found in the `somewhere` folder.   -->
<!-- Circuit design can be found in the `somewhere` folder.   -->

## Hardware Components & Sensors  
| Count | Brand | Type | Purchased from | Remarks |
| --- | --- | --- | --- | --- |
| 6 | ?? | AA Rechargeable Battery | | |
| 1 | ?? | 6 AA Battery Holder | | |
| 1 | GP ReCyko+ | AA Charger | | |
| 1 | Daiso | Ankle Support | | |
| 1 | ?? | Li_po Charger | | |
| 4 | Unicell | 3.7V 150mAh Li-Po Battery | | |
| 2 | Unicell | 3.7V 500mAh Li-Po Battery | | |
| 10 | DFRobot | Bluno Beetle | | |
| 30 | Mitsubishi + others | CR2032 Lithium Coin Cell Battery | | |
| 2 | ?? | GT511-C1R Fingerprint Sensor | | Borrowed from Prof Peh |
| 1 | Sparkfun | MyoWare EMG Sensor | SGBotic | |
| 14 | ?? | Biomedical Stickers | SGBotic | |
| 1 | ?? | EMG Cable | SGBotic | |
| 1 | ?? | Raspberry Pi 3 Model B | | Borrowed from DSA Lab |
| 1 | ?? | Micro SD Card | | Borrowed from DSA Lab |
| 6 | ?? | MPU-6050 Accel/Gyro Sensor (IMU) | | Borrowed from DSA Lab |
| 1 | ?? | 5V 3A LDO Regulator | RS Singapore | |
| 6 | Pololu | DC-DC 3.3V 0.5A Regulator | SGBotic | |
| 1 | Sparkfun | INA169 Current Sensor | | Borrowed from DSA Lab |

## Hardware Setup  
![Pololu DC-DC 3.3V 500mA Regulator](./images/dcdc-regulator.JPG)

## Hardware Code (Bluno Beetle)  
There are 2 set of freeRTOS code for the Bluno Beetle:  
1. i2c comms code - RPi <--> 1x Bluno Beetle (Fingerprint, Power, EMG)
2. BLE comms code - RPi <--> 6x Bluno Beetle (IMU data - accelerometer + gyrometer)