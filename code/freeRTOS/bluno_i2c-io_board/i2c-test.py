import smbus
import time
import sys

bus = smbus.SMBus(1)
address = 0x04 # address of the arduino

# # this is for reading integer
# data = str(bus.read_byte(address))

# # this is for reading decimal
# data = bus.read_i2c_block_data(address, 0)
# bytes = bytearray(data[0:4]) # grab the first 4
# output = struct.unpack('f', bytes)[0]

def main():
    while 1:
      bus.write_byte(address, 0x1)

      # this is for reading integer
      data = str(bus.read_byte(address))

      # this is for reading decimal
      data = bus.read_i2c_block_data(address, 0)
      bytes = bytearray(data[0:4]) # grab the first 4
      output = struct.unpack('f', bytes)[0]

      print("Data received: {}".format(data))
      time.sleep(1)
        # print(status)
        # status = not status
        # if status:
        #     bus.write_byte(address, 0x1)
        # else:
        #     bus.write_byte(address, 0x0)
        # print("Arduino answer to RPi: " + str(bus.read_byte(address)))
        # time.sleep(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted")
        sys.exit(0)