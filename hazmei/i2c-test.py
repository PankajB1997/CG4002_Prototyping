import smbus
import time
import sys

bus = smbus.SMBus(1)
address = 0x04 # address of the arduino

def main():
    status = False

    while 1:
        print(status)
        status = not status
        if status:
            bus.write_byte(address, 0x1)
        else:
            bus.write_byte(address, 0x0)
        print("Arduino answer to RPi: " + str(bus.read_byte(address)))
        time.sleep(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted")
        sys.exit(0)