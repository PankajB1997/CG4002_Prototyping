import os
import pymongo
from flask import Flask

DATABASE_USERNAME = os.environ["CG4002_DATABASE_USERNAME"]
DATABASE_PASSWORD = os.environ["CG4002_DATABASE_PASSWORD"]
client = pymongo.MongoClient("mongodb:" + DATABASE_USERNAME + "//:" + DATABASE_PASSWORD + "@ds121674.mlab.com:21674/heroku_qsp32s4v")

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
