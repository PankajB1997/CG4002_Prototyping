from bluepy import btle
from bluepy.btle import Scanner
import datetime
from collections import deque
import datetime
import serial
import socket
import sys
import time
from Crypto import Random
from Crypto.Cipher import AES
import base64

useServer = 0
collect_test_data = 0
testing_samples = 1

reply_from_bluno = ""

def readlineCR(port): 
    rv="" 
    while True:
        ch=port.read() 
        rv+=ch 
        if ch=='\r': 
            return rv
            
class MyDelegate(btle.DefaultDelegate):
    def __init__(self):
        btle.DefaultDelegate.__init__(self)

    def handleNotification(self, cHandle, data):
        global reply_from_bluno
        print("A notification was received: %s" %data)
        reply_from_bluno = data.decode("utf-8")
        
class Data():
    def __init__(self, socket):
        self.bs = 32
        self.secret_key = "1234512345123451"
        self.voltage = 0 
        self.current = 0 
        self.power = 0  #voltage * current
        self.cumpower=0
        self.sock = socket
        self.sample_queue = deque([], 20)

    def pad(self, msg):
        return msg + (self.bs - len(msg)%self.bs)*chr(self.bs - len(msg)%self.bs)

    def encryptText(self, msg, secret_key):
        raw = self.pad(msg)
        iv = Random.new().read(AES.block_size)
        cipher = AES.new(secret_key,AES.MODE_CBC,iv)
        return base64.b64encode(iv + cipher.encrypt(raw))

    def sendData(self, predictedMove):
        formattedAnswer = ("#"+ str(predictedMove) + "|" + str(self.voltage)\
            + "|" + str(self.current) + "|" + str(self.power) + "|" + str(self.cumpower) + "|")
        print(formattedAnswer)
        encryptedText = self.encryptText(formattedAnswer, self.secret_key)
        self.sock.send(encryptedText)

class RaspberryPi():
    def __init__(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.isHandshakeDone = False
        self.result_queue = deque([], 2)
        
        self.prev_data_time = time.time()
        self.current_data_time = time.time()

    def connectToServer(self):
        IPAddress = sys.argv[1]
        Port = int(sys.argv[2])
        server_address = (IPAddress, Port)
        self.sock.connect(server_address)

    def connectToArduino(self):
        #self.serial_port=serial.Serial("/dev/serial0", baudrate=115200, timeout=0) #For the Rpi
        print("Connecting to bluno ...")
        setup_data = b"\x01\x00"
        self.device = btle.Peripheral("0c:b2:b7:46:57:50")
        print("Device 1 connected!")
        self.device2 = btle.Peripheral("0c:b2:b7:46:35:f5")
        print("Device 2 connected!")
        self.device.setDelegate(MyDelegate())
        writing_port = self.device.getServiceByUUID("0000dfb0-0000-1000-8000-00805f9b34fb")
        self.dfb1 = writing_port.getCharacteristics()[0]
        notify_handle = self.dfb1.getHandle() + 1
        self.device.writeCharacteristic(notify_handle, setup_data)
        print("Ports Open!")
	
    def run(self):
        try:
            #Connections
            if(useServer):
                self.connectToServer()
                print("Connected to test server")
                data = Data(self.sock)

            self.connectToArduino()
            
            #Send start signal
            self.dfb1.write(bytes("H", "utf-8"))
            print("H sent")
            
            time.sleep(5)
            
            self.dfb1.write(bytes("R", "utf-8"))
            print("R sent")
            
            #print(self.device2.getState())
            
            #Handshaking with Arduino
            #while(self.isHandshakeDone == False):
                #self.dfb1.write(bytes("H", "utf-8"))
                ##self.serial_port.write('H')
                #print("H sent")
                #time.sleep(0.5)
                #if self.device.waitForNotifications(1.0):
                    #print(reply_from_bluno)
                ##reply = self.serial_port.read(1)
                #if(reply_from_bluno == 'B'):
                    #self.isHandshakeDone = True
                    #self.dfb1.write(bytes("F", "utf-8"))
                    ##self.serial_port.write('F')
                    #print("Connected to Arduino")
                    ##self.serial_port.readline()
                    #time.sleep(1)
                #else:
                    #time.sleep(0.5)
                    
            while 1:
                continue
                #if self.device.waitForNotifications(1.0):
                    #continue
        
        except KeyboardInterrupt:
            sys.exit(1)
            
if __name__ == '__main__':
    pi = RaspberryPi()
    pi.run()

