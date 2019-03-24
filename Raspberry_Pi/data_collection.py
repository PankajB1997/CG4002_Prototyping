#!/usr/bin/python3

import time
import serial
import os
import sys
import threading
import socket
import base64
import pickle

'''
1. This code assumes that data from Blunos is received in the order of
dancer1, dancer2, dancer3 [ initially located left, middle, right
respectively but this can become right, left, middle and so on ].
2. dancer1, dancer2, dancer3 are labels that can be mapped to specific subsystems.
3. So basically during start of data collection, the dancer starting at
leftmost position must wear the subsystem meant for dancer1, and so on.
'''

# Dance move: record this move
danceMove = "number7"

# Transition move: record either left-idle/right-right or right-idle/left-left
lirr_or_rill = "lirr" # or "rill"

# Assign time limits for dance move state and transition move state
DANCE_MOVE_TIME_LIMIT = 10 # in seconds
TRANSITION_MOVE_TIME_LIMIT = 5 # in seconds

# Assign constants for dance move state and transition move state
DANCE_MOVE_STATE = 0
TRANSITION_MOVE_STATE = 1

# Assign number of sets of readings
N = 128

# Assign dancers 1, 2 and 3
dancer1 = "pankaj"
dancer2 = "ashley"
dancer3 = "hazmei"

# Assign location arrays for each dancer
dancer1_locations = [ "left", "middle", "right" ]
dancer2_locations = [ "middle", "right", "left" ]
dancer3_locations = [ "right", "left", "middle" ]
if lirr_or_rill == "rill":
    dancer1_locations = [ "left", "right", "middle" ]
    dancer2_locations = [ "middle", "left", "right" ]
    dancer3_locations = [ "right", "middle", "left" ]

# Assign initial dance location index
dance_location_index = 0

# Assign initial location of each dancer
dancer1_location = dancer1_locations[dance_location_index]
dancer2_location = dancer2_locations[dance_location_index]
dancer3_location = dancer3_locations[dance_location_index]

# Initialize dance move save paths
DANCE_1_SAVEPATH = os.path.join("dataset", "RawData", dancer1, danceMove + ".txt")
DANCE_2_SAVEPATH = os.path.join("dataset", "RawData", dancer2, danceMove + ".txt")
DANCE_3_SAVEPATH = os.path.join("dataset", "RawData", dancer3, danceMove + ".txt")

# Initialize transition move save paths
TRANSITION_1_SAVEPATH = os.path.join("dataset", "RawData", "transition", "left-idle.txt")
TRANSITION_2_SAVEPATH = os.path.join("dataset", "RawData", "transition", "right-right.txt")

if lirr_or_rill == "rill":
    TRANSITION_1_SAVEPATH = os.path.join("dataset", "RawData", "transition", "right-idle.txt")
    TRANSITION_2_SAVEPATH = os.path.join("dataset", "RawData", "transition", "left-left.txt")

def getTransitionSavePaths():
    if lirr_or_rill == "lirr":
        if dancer1_location == "left" and dancer2_location == "middle" and dancer3_location == "right":
            return [ TRANSITION_1_SAVEPATH, TRANSITION_1_SAVEPATH, TRANSITION_2_SAVEPATH ]
        if dancer1_location == "middle" and dancer2_location == "right" and dancer3_location == "left":
            return [ TRANSITION_1_SAVEPATH, TRANSITION_2_SAVEPATH, TRANSITION_1_SAVEPATH ]
        else:
            return [ TRANSITION_2_SAVEPATH, TRANSITION_1_SAVEPATH, TRANSITION_1_SAVEPATH ]
    else:
        if dancer1_location == "left" and dancer2_location == "middle" and dancer3_location == "right":
            return [ TRANSITION_2_SAVEPATH, TRANSITION_1_SAVEPATH, TRANSITION_1_SAVEPATH ]
        if dancer1_location == "middle" and dancer2_location == "right" and dancer3_location == "left":
            return [ TRANSITION_1_SAVEPATH, TRANSITION_1_SAVEPATH, TRANSITION_2_SAVEPATH ]
        else:
            return [ TRANSITION_1_SAVEPATH, TRANSITION_2_SAVEPATH, TRANSITION_1_SAVEPATH ]

def updateDancerLocations():
    dance_location_index = (dance_location_index + 1) % 3
    dancer1_location = dancer1_locations[dance_location_index]
    dancer2_location = dancer2_locations[dance_location_index]
    dancer3_location = dancer3_locations[dance_location_index]

def readLineCR(port):
    rv = ""
    while True:
        ch = port.read().decode()
        rv += ch
        if ch == "\r" or ch == "":
            return rv

def isStateChanged(state, time):
    return state == DANCE_MOVE_STATE and time.time() - time > DANCE_MOVE_TIME_LIMIT
           or state == TRANSITION_MOVE_STATE and time.time() - time > TRANSITION_MOVE_TIME_LIMIT

'''
Perform handshaking between the RPi and each of the 6 Blunos.
'''

handshake_flag = False
port = serial.Serial("/dev/serial0", baudrate=115200, timeout=3.0)
port.reset_input_buffer()
port.reset_output_buffer()
# port.flushInput()
# port.flushOutput()

while (handshake_flag == False):
    port.write("H".encode())
    print("H sent")
    response = port.read(1)
    time.sleep(0.5)
    if (response.decode() == "A"):
        print("A received, sending N")
        port.write("N".encode())
        time.sleep(0.5)
        handshake_flag = True
        # port.readline()
    else:
        time.sleep(0.5)

print("RPi is connected to all Blunos.")
# port.flush() # waits till all in buffer is written then flush

'''
Start data collection.
'''

data_flag = False
count = 1
initial_time = time.time()
current_state = DANCE_MOVE_STATE

while (data_flag == False):
    if isStateChanged(current_state, initial_time):
        current_state = 1 - current_state
        initial_time = time.time()
        if current_state == DANCE_MOVE_STATE:
            updateDancerLocations()
    if current_state == DANCE_MOVE_STATE: # Record dance move data
        for DANCE_SAVEPATH in [ DANCE_1_SAVEPATH, DANCE_2_SAVEPATH, DANCE_3_SAVEPATH ]:
            with open(DANCE_SAVEPATH, "a") as txtfile:
                for i in range(N): # write from 0->N-1 = N sets of readings
                    data = readLineCR(port)
                    # extract acc1[3], gyro1[3], acc2[3] and gyro2[3] values
                    data = data.split(",")[0:12]
                    data = [ val.strip() for val in data ]
                    output = "\t".join(data) + "\n"
                    txtfile.write(output)
                    print(str(count) + ". " + output)
                    count += 1
    else: # Record transition move data
        for TRANSITION_SAVEPATH in getTransitionSavePaths():
            with open(TRANSITION_SAVEPATH, "a") as txtfile:
                for i in range(N): # write from 0->N-1 = N sets of readings
                    data = readLineCR(port)
                    # extract acc1[3], gyro1[3], acc2[3] and gyro2[3] values
                    data = data.split(",")[0:12]
                    data = [ val.strip() for val in data ]
                    output = "\t".join(data) + "\n"
                    txtfile.write(output)
    # data_flag = True
