import os
import sys
import time
import base64
import pickle
import random
import serial
import socket
import datetime
import threading
import numpy as np
from collections import deque
from Crypto import Random
from Crypto.Cipher import AES
from statsmodels import robust
from scipy.stats import entropy
from scipy.signal import savgol_filter
from obspy.signal.filter import highpass
from scipy.fftpack import fft, ifft, rfft
from bluepy.btle import Scanner, DefaultDelegate, Peripheral
from sklearn.preprocessing import StandardScaler, MinMaxScaler

# Initialize constants
MODEL_SAVEPATH = os.path.join("model", "ovr_mlp.pkl")
SCALER_SAVEPATH = os.path.join("model", "scaler.pkl")
MAX_RESULTS_BUFFER_SIZE = 2
SEGMENT_SIZE = 10
OVERLAP_RATIO = 0.5
INITIAL_WAIT = 1.5 # 1.5 second wait before predicting each move

# Initialize starting time
wait_time = int(round(time.time() * 1000))

# Add all 6 bluno addresses here as a list, in the given order
BLUNO_ADDRESSES = ["0c:b2:b7:46:e5:d1", # dancer 1 left hand bluno
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
        self.db = None
        self.dancer_1_result = None
        self.dancer_2_result = None
        self.dancer_3_result = None
        self.movementData = [[], [], []] # list of lists (set of sensor readings for each dancer)

        # power data is only for main rpi. not for all blunos
        self.powerData = [] # list of lists (set of voltage/current/power/cumpower readings for each bluno)
        self.currentPowerReadings = {}

    def connectToServer(self):
        IPAddress = sys.argv[1]
        Port = int(sys.argv[2])
        server_address = (IPAddress, Port)
        self.sock.connect(server_address)
        print("Connected to test server!")
        self.server = Server(self.sock)

    def connectToBlunos(self):
        for addr in BLUNO_ADDRESSES:
            p = Peripheral(addr)
            connections.append(p)
            message_buffer.append([])
            t = ConnectionHandlerThread(len(connections)-1)
            t.start()
            connection_threads.append(t)
        print("Connected to blunos!")

    # def connectToMongoDB(self):
    #     '''
    #     The database used here was set up on mLab.
    #     Please setup a similar database on your personal mLab account,
    #        create the below environment variables using your credentials
    #        and connect using the new credentials.
    #     '''
    #     client = MongoClient(os.environ["MONGODB_URI"], os.environ["MONGODB_PORT"])
    #     self.db = client[os.environ["MONGODB_DATABASE_NAME"]]
    #     self.db.authenticate(os.environ["MONGODB_USERNAME"], os.environ["MONGODB_PASSWORD"])
    #     print("Connected to mongo database!")

    # # def writeToMongoDB(self, voltage, current, power, cumpower):
    # def writeToMongoDB(self):
    #     results = [ self.dancer_1_result, self.dancer_2_result, self.dancer_3_result ]
    #     predictedMove = max(set(results), key=results.count)
    #     if self.db is not None:
    #         data = {
    #             'timestamp': time.time(),
    #             'pre': predictedMove,
    #             'vol': voltage,
    #             'cur': current,
    #             'pow': power,
    #             'ene': cumpower,
    #             'emg': random.uniform(-1, 1) # emg sensor is currently unused, hence random values sent
    #         }
    #         # data = {
    #         #     'timestamp': time.time(),
    #         #     'pre': predictedMove,
    #         #     'emg': random.uniform(-1, 1) # emg sensor is currently unused, hence random values sent
    #         # }
    #         self.db.realtime_data.insert(data)

    def collectDancerData(self, left_hand_data, right_hand_data, dancer_idx):
        self.movementData = [[], [], []]
        # self.powerData = []
        for i in range(SEGMENT_SIZE):
            left_values = [ float(val.strip()) for val in left_hand_data[i].strip("\n").strip(',').split(",") ]
            right_values = [ float(val.strip()) for val in right_hand_data[i].strip("\n").strip(',').split(",") ]
            move_readings = left_values[:6] + right_values[:6]
            self.movementData[dancer_idx].append(move_readings)
            # there is no power data per dancer, only main dancer with rpi system - hazmei
            # self.powerData.append(np.array(left_values[6:]).mean(axis=0).tolist())
            # self.powerData.append(np.array(right_values[6:]).mean(axis=0).tolist())

    def getMovementAndPowerData(self):
        dancer_1_left = message_buffer[0][-SEGMENT_SIZE:]
        message_buffer[0] = dancer_1_left[-int(OVERLAP_RATIO * SEGMENT_SIZE):]
        dancer_1_right = message_buffer[1][-SEGMENT_SIZE:]
        message_buffer[1] = dancer_1_right[-int(OVERLAP_RATIO * SEGMENT_SIZE):]
        self.collectDancerData(dancer_1_left, dancer_1_right, 0) # collectDancerData will expect powerData per blunos
        dancer_2_left = message_buffer[2][-SEGMENT_SIZE:]
        message_buffer[2] = dancer_2_left[-int(OVERLAP_RATIO * SEGMENT_SIZE):]
        dancer_2_right = message_buffer[3][-SEGMENT_SIZE:]
        message_buffer[3] = dancer_2_right[-int(OVERLAP_RATIO * SEGMENT_SIZE):]
        self.collectDancerData(dancer_2_left, dancer_2_right, 1) # collectDancerData will expect powerData per blunos
        dancer_3_left = message_buffer[4][-SEGMENT_SIZE:]
        message_buffer[4] = dancer_3_left[-int(OVERLAP_RATIO * SEGMENT_SIZE):]
        dancer_3_right = message_buffer[5][-SEGMENT_SIZE:]
        message_buffer[5] = dancer_3_right[-int(OVERLAP_RATIO * SEGMENT_SIZE):]
        self.collectDancerData(dancer_3_left, dancer_3_right, 2) # collectDancerData will expect powerData per blunos

    def calculateCurrentPowerValues(self): # this method is only used in run() method
        # powerVals = np.sum(np.array(), axis=0).tolist()
        self.currentPowerReadings = {}
        # self.currentPowerReadings["voltage"] = powerVals[0]
        # self.currentPowerReadings["current"] = powerVals[1]
        # self.currentPowerReadings["power"] = powerVals[2]
        # self.currentPowerReadings["cumpower"] = powerVals[3]
        self.currentPowerReadings["voltage"] = 7.340
        self.currentPowerReadings["current"] = 0.261
        self.currentPowerReadings["power"] = 1.92
        self.currentPowerReadings["cumpower"] = 1.92

    def predictDanceMove(self, X):
        # normalize values
        X = self.scaler.transform(X)
        # preprocess data
        X = savgol_filter(X, 3, 2)
        X = highpass(X, 3, 50)
        X = self.scaler.transform(X)
        # extract time domain features
        X_mean = np.mean(X, axis=0)
        X_median = np.median(X, axis=0)
        X_var = np.var(X, axis=0)
        X_max = np.max(X, axis=0)
        X_min = np.min(X, axis=0)
        X_off = np.subtract(X_max, X_min)
        X_mad = robust.mad(X, axis=0)
        # extract frequency domain features
        X_fft_abs = np.abs(fft(X)) # np.abs() if you want the absolute val of complex number
        X_fft_mean = np.mean(X_fft_abs, axis=0)
        X_fft_var = np.var(X_fft_abs, axis=0)
        X_fft_max = np.max(X_fft_abs, axis=0)
        X_fft_min = np.min(X_fft_abs, axis=0)
        X_entr = entropy(np.abs(np.fft.rfft(X, axis=0))[1:], base=2)
        # Append all vectors above as one d-dimension feature vector
        feature_vector = np.append(X_off, [ X_mean, X_median, X_var, X_mad, X_entr, X_min, X_max, X_fft_mean, X_fft_var, X_fft_max, X_fft_min ])
        # Predict using pretrained model
        return self.model.predict(feature_vector)[0]

    def run(self):
        try:
            # Set up all connections
            self.connectToServer()
            self.connectToBlunos()
            #self.connectToMongoDB()
            # Load pretrained model and scaler
            self.model = pickle.load(open(MODEL_SAVEPATH, "rb"))
            self.scaler = pickle.load(open(SCALER_SAVEPATH, "rb"))
            start_time = time.time()
            # Main loop to run real-time prediction of dance moves
            while 1:
                if time.time() - start_time >= INITIAL_WAIT:
                    # 1. Split message buffer readings into movementData and powerData for each dancer
                    #    Only get last SEGMENT_SIZE readings from each message buffer
                    if len(message_buffer[0]) >= SEGMENT_SIZE and len(message_buffer[1]) >= SEGMENT_SIZE and len(message_buffer[2]) >= SEGMENT_SIZE and len(message_buffer[3]) >= SEGMENT_SIZE and len(message_buffer[4]) >= SEGMENT_SIZE and len(message_buffer[5]) >= SEGMENT_SIZE:
                        self.getMovementAndPowerData()
                    # 2. Predict dance move on the movementData for each dancer
                    if len(self.movementData[0]) == SEGMENT_SIZE and len(self.movementData[1]) == SEGMENT_SIZE and len(self.movementData[2]) == SEGMENT_SIZE:
                        self.dancer_1_result = self.predictDanceMove(self.movementData[0])
                        self.dancer_2_result = self.predictDanceMove(self.movementData[1])
                        self.dancer_3_result = self.predictDanceMove(self.movementData[2])
                    # 3. Calculate average of powerData values for each dancer and then sum their averages
                    self.calculateCurrentPowerValues() # only main dancer with rpi system will have powerData value - hazmei
                    # 4. Send predicted dance move and average of power values to MongoDB for real-time display on dashboard
                    # self.writeToMongoDB(self.currentPowerReadings["voltage"], self.currentPowerReadings["current"], self.currentPowerReadings["power"], self.currentPowerReadings["cumpower"])
                    #self.writeToMongoDB()
                    # 5. If predicted result for each dancer is same, send to server with power values and update start_time
                    if self.dancer_1_result == self.dancer_2_result and self.dancer_2_result == self.dancer_3_result:
                        self.server.sendData(self.dancer_1_result, self.currentPowerReadings["voltage"], self.currentPowerReadings["current"], self.currentPowerReadings["power"], self.currentPowerReadings["cumpower"])
                        start_time = time.time()
                continue
        except KeyboardInterrupt:
            sys.exit(1)

if __name__ == "__main__":
    pi = RaspberryPi()
    pi.run()
