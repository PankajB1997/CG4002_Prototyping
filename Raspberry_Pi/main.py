from bluepy.btle import Scanner, DefaultDelegate, Peripheral
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
import threading

useServer = 0
collect_test_data = 0
testing_samples = 1

bt_addrs = ['0c:b2:b7:46:57:50', '0c:b2:b7:46:35:f5'] #Add all bluno addresses here as a list
connections = []
connection_threads = []
message_buffer = []

def readlineCR(port):
    rv=""
    while True:
        ch=port.read()
        rv+=ch
        if ch=='\r':
            return rv

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

class NotificationDelegate(DefaultDelegate):
    def __init__(self, number):
        DefaultDelegate.__init__(self)
        self.number = number
        self.message_string = ""

    def handleNotification(self, cHandle, data):
        end_of_message = False
        msg = data.decode("utf-8")
        print('Notification:\nConnection:'+str(self.number)+ '\nMsg:'+ msg)
        self.message_string = self.message_string + msg
        if "\n" in msg:
            end_of_message = True
        
        if end_of_message:
            message_buffer[self.number].append(self.message_string)
            file_name = "data{}".format(self.number)
            my_file = open(file_name, 'a+')
            my_file.write(self.message_string)
            self.message_string = ""            

class ConnectionHandlerThread (threading.Thread):
    def __init__(self, connection_index):
        threading.Thread.__init__(self)
        self.connection_index = connection_index

    def run(self):
        connection = connections[self.connection_index]
        connection.setDelegate(NotificationDelegate(self.connection_index))
        port = connection.getServiceByUUID("0000dfb0-0000-1000-8000-00805f9b34fb")
        dfb1 = port.getCharacteristics()[0]
        connection.writeCharacteristic((dfb1.getHandle() + 1), b"\x01\x00")

        dfb1.write(bytes("H", "utf-8"))
        print("H sent")

        while True:
            if connection.waitForNotifications(1):
                continue
            #dfb1.write(bytes("R", "utf-8"))
            #print("R sent")

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
        
        print("Connecting to bluno ...")
        #setup_data = b"\x01\x00"
        for addr in bt_addrs:
            p = Peripheral(addr)
            connections.append(p)

            t = ConnectionHandlerThread(len(connections)-1)
            t.start()
            connection_threads.append(t)

        #self.device = btle.Peripheral("0c:b2:b7:46:57:50")
        #self.device = btle.Peripheral("0c:b2:b7:46:39:a6")
        #print("Device 1 connected!")
        #self.device2 = btle.Peripheral("0c:b2:b7:46:35:f5")
        #self.device2 = btle.Peripheral("0c:b2:b7:46:35:96")
        #print("Device 2 connected!")
        
        #self.device.setDelegate(MyDelegate())
        # writing_port = self.device.getServiceByUUID("0000dfb0-0000-1000-8000-00805f9b34fb")
        # self.dfb1 = writing_port.getCharacteristics()[0]
        # self.device.writeCharacteristic((self.dfb1.getHandle() + 1), setup_data)
        
        # self.device2.setDelegate(MyDelegate())
        # writing_port_2 = self.device2.getServiceByUUID("0000dfb0-0000-1000-8000-00805f9b34fb")
        # self.dfb2 = writing_port_2.getCharacteristics()[0]
        # self.device2.writeCharacteristic((self.dfb2.getHandle() + 1), setup_data)
        print("Ports Open!")

    def run(self):
        try:
            #Connections
            if(useServer):
                self.connectToServer()
                print("Connected to test server")
                data = Data(self.sock)

            self.connectToArduino()

            while 1:
                if len(message_buffer[0]) > 0 and len(message_buffer[1]) > 0:
                    first_string = message_buffer[0][0].strip("\n")
                    second_string = message_buffer[1][0].strip("\n")[:-1] #Remove the last \n and comma
                    full_msg = first_string + second_string + "\n"
                    full_file = open("combined", 'a+')
                    full_file.write(full_msg)
                    message_buffer[0] = message_buffer[0][1:]
                    message_buffer[1] = message_buffer[1][1:]
                continue

            #Send start signal
            #self.dfb1.write(bytes("H", "utf-8"))
            #self.dfb2.write(bytes("H", "utf-8"))
            # print("H sent")

            # time.sleep(5)

            # self.dfb1.write(bytes("R", "utf-8"))
            # self.dfb2.write(bytes("R", "utf-8"))
            # print("R sent")

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

            # while 1:
            #     if self.device.waitForNotifications(1.0) or self.device2.waitForNotifications(1.0):
            #         continue
            #     #time.sleep(1)
            #     self.dfb1.write(bytes("R", "utf-8"))
            #     self.dfb2.write(bytes("R", "utf-8"))
            #     print("R sent")

        except KeyboardInterrupt:
            sys.exit(1)

if __name__ == '__main__':
    pi = RaspberryPi()
    pi.run()
