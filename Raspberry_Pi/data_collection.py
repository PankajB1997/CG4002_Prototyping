import os
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

SAVEPATH = os.path.join("..", "dataset", "RawData")
DANCE_MOVE = "chicken"
DANCER_1 = "ashley"
DANCER_2 = "hazmei"
DANCER_3 = "pankaj"

useServer = 0
collect_test_data = 0
testing_samples = 1

# Add all 6 bluno addresses here as a list, in the given order
bt_addrs = ["0c:b2:b7:46:57:50", # dancer 1 left hand bluno
            "0c:b2:b7:46:35:f5", # dancer 1 right hand bluno
            "0c:b2:b7:46:4d:80", # dancer 2 left hand bluno
            "0c:b2:b7:46:35:96", # dancer 2 right hand bluno
            "0c:b2:b7:46:39:a6", # dancer 3 left hand bluno
            "0c:b2:b7:46:41:67"] # dancer 3 right hand bluno
connections = []
connection_threads = []
message_buffer = []

class Data():
    def __init__(self, socket):
        self.bs = 32
        self.secret_key = "1234512345123451"
        self.voltage = 0
        self.current = 0
        self.power = 0  # voltage * current
        self.cumpower = 0
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
        msg = data.decode("utf-8")
        # print("Notification:\nConnection:" + str(self.number) + "\nMsg:" + msg)
        self.message_string = self.message_string + msg
        if "\n" in msg: # if end of message
            message_buffer[self.number].append(self.message_string)
            file_name = "data{}".format(self.number)
            my_file = open(file_name, "a+")
            my_file.write(self.message_string)
            self.message_string = ""

class ConnectionHandlerThread(threading.Thread):
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

    def connectToBlunos(self):
        print("Connecting to blunos ...")
        for addr in bt_addrs:
            p = Peripheral(addr)
            connections.append(p)
            message_buffer.append([])
            t = ConnectionHandlerThread(len(connections)-1)
            t.start()
            connection_threads.append(t)
        print("Ports Open!")

    def collectDancerData(bluno_left_idx, bluno_right_idx):
        first_string = message_buffer[bluno_left_idx][0].strip("\n")
        second_string = message_buffer[bluno_right_idx][0].strip("\n")[:-1] #Remove the last \n and comma
        full_msg = first_string + second_string + "\n"
        dancer_savepath = os.path.join(SAVEPATH, dancer, DANCE_MOVE)
        with open(dancer_savepath, "a+") as f:
            f.write(full_msg)
        message_buffer[bluno_left_idx] = message_buffer[bluno_left_idx][1:]
        message_buffer[bluno_right_idx] = message_buffer[bluno_right_idx][1:]

    def run(self):
        try:
            # Set up connections to test server and blunos
            if(useServer):
                self.connectToServer()
                print("Connected to test server")
                data = Data(self.sock)
            self.connectToBlunos()
            # Main loop to run data collection
            while 1:
                if len(message_buffer[0]) > 0 and len(message_buffer[1]) > 0:
                    self.collectDancerData(0, 1)
                if len(message_buffer[2]) > 0 and len(message_buffer[3]) > 0:
                    self.collectDancerData(2, 3)
                if len(message_buffer[4]) > 0 and len(message_buffer[5]) > 0:
                    self.collectDancerData(4, 5)
                continue
        except KeyboardInterrupt:
            sys.exit(1)

if __name__ == "__main__":
    pi = RaspberryPi()
    pi.run()
