import os
import sys
import time
import base64
import pickle
import serial
import socket
import datetime
import threading
from Crypto import Random
from Crypto.Cipher import AES
from collections import deque
from bluepy.btle import Scanner, DefaultDelegate, Peripheral

# Filepath for pretrained model
MODEL_SAVEPATH = os.path.join("models", "mlp.pkl")

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

class Server():
    def __init__(self, socket):
        self.bs = 32
        self.secret_key = "1234512345123451"
        self.sock = socket
        self.sample_queue = deque([], 20)

    def pad(self, msg):
        return msg + (self.bs - len(msg)%self.bs)*chr(self.bs - len(msg)%self.bs)

    def encryptText(self, msg, secret_key):
        raw = self.pad(msg)
        iv = Random.new().read(AES.block_size)
        cipher = AES.new(secret_key,AES.MODE_CBC,iv)
        return base64.b64encode(iv + cipher.encrypt(raw))

    def sendData(self, predictedMove, voltage, current, power, cumpower):
        formattedAnswer = ("#"+ str(predictedMove) + "|" + str(voltage)\
            + "|" + str(current) + "|" + str(power) + "|" + str(cumpower) + "|")
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
        self.server = None

    def connectToServer(self):
        IPAddress = sys.argv[1]
        Port = int(sys.argv[2])
        server_address = (IPAddress, Port)
        self.sock.connect(server_address)
        print("Connected to test server!")
        self.server = Server(self.sock)

    def connectToBlunos(self):
        for addr in bt_addrs:
            p = Peripheral(addr)
            connections.append(p)
            message_buffer.append([])
            t = ConnectionHandlerThread(len(connections)-1)
            t.start()
            connection_threads.append(t)
        print("Connected to blunos!")

    def connectToMongoDB(self):
        '''
        The database used here was set up on mLab.
        Please setup a similar database on your personal mLab account,
           create the below environment variables using your credentials
           and connect using the new credentials.
        '''
        client = MongoClient(os.environ["MONGODB_URI"], os.environ["MONGODB_PORT"])
        db = client[os.environ["MONGODB_DATABASE_NAME"]]
        db.authenticate(os.environ["MONGODB_USERNAME"], os.environ["MONGODB_PASSWORD"])
        print("Connected to mongo database!")

    def collectDancerData(self, bluno_left_idx, bluno_right_idx):
        first_string = message_buffer[bluno_left_idx][0].strip("\n")
        second_string = message_buffer[bluno_right_idx][0].strip("\n")[:-1] #Remove the last \n and comma
        full_msg = first_string + second_string + "\n"
        dancer_savepath = os.path.join(SAVEPATH, dancer, DANCE_MOVE)
        with open(dancer_savepath, "a+") as f:
            f.write(full_msg)
        message_buffer[bluno_left_idx] = message_buffer[bluno_left_idx][1:]
        message_buffer[bluno_right_idx] = message_buffer[bluno_right_idx][1:]

    def sendToServer(self):
        self.server.sendData()

    def run(self):
        try:
            # Set up all connections
            self.connectToServer()
            self.connectToBlunos()
            self.connectToMongoDB()
            # Load pretrained model
            model = pickle.load(open(MODEL_SAVEPATH, "rb"))
            # Main loop to run real-time prediction of dance moves
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
