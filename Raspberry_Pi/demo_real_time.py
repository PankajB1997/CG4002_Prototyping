import os
import time
import random
from time import sleep
import pymongo
from pymongo import MongoClient

DATABASE_USERNAME = os.environ['CG4002_DATABASE_USERNAME']
DATABASE_PASSWORD = os.environ['CG4002_DATABASE_PASSWORD']

client = MongoClient("ds121674.mlab.com", 21674)
db = client["heroku_qsp32s4v"]
db.authenticate(DATABASE_USERNAME, DATABASE_PASSWORD)

while(True):
    test_data = {
        'timestamp': time.time(),
        'pre': random.uniform(-1, 1) + 1.0,
        'vol': random.uniform(-1, 1) + 2.0,
        'cur': random.uniform(-1, 1) + 3.0,
        'pow': random.uniform(-1, 1) + 4.0,
        'ene': random.uniform(-1, 1) + 5.0,
        'emg': random.uniform(-1, 1)
    }
    db.realtime_data.insert(test_data)
    sleep(.5)
