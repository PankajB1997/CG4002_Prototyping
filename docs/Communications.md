# Communications
  
## Communication between Raspberry Pi and Bluno Beetles

Code for the Arduino can be found [here](../code/freeRTOS/bluno_mpu6050-hand/) - RPi <--> 6x Bluno Beetle (IMU data - accelerometer + gyrometer)

Code for the RaspberryPi can also be found [here](../code/freeRTOS/bluno_mpu6050-hand/main)

Communication between the Raspberry Pi and each Bluno Beetle occurs using BLE Bluetooth. Each Bluno is connected using a Thread in the python code on the Rpi. We use the [bluepy library](https://github.com/IanHarvey/bluepy) to help us manage these bluetooth connection and functions using python.

For each Bluno Beetle:

1. In each thread, a Peripheral object is created using the known MAC Address of the Bluno
2. A delegate is set for each Peripheral that is in charge of handling incoming notifications from the Bluno.
3. `b"\x01\x00"` is written to a handle to enable notifications.
4. An initial message of "H" is sent to the Bluno to start the transfer of data.
5. The Thread is started and a continuous while loop will keep waiting for notifications from the Bluno and handling the incoming data.

* Note that each message packet transferred using BLE is 20 bytes.

---

Every 100ms (periodic push), each Bluno will send out 6 values over Bluetooth, using Serial.print(). The 6 values are ax, ay, az, gx, gy, and gz, the values of the accelerometer and gyroscope respectively.

The Raspberry Pi receives these data from each Bluno on their individual threads and process them accordingly. As each packet only contains 20 bytes of data, we will continue concatenating the data to a string until we have reached the end of the messages, indicated by a "\n". If it is indeed the end of a message, we will append it to the message buffer for that respective Bluno and also write it into a file.

* There will therefore be 6 individual files of data containing readings from each Bluno.

* How the data is processed or combined for machine learning is up to individual implementation.