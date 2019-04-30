# Software

The software part consists of two main components: the machine learning aspect to predict dance moves and the coaching dashboard to run analytics.  

## Machine Learning

The Machine Learning scripts are added to the `Raspberry_Pi/` folder. A detailed list of all the ML scripts is as below:  

1. `data_collection.py` - This script interfaces with 6 Bluno boards to receive sensor readings for 3 dancers every 20 ms. This script is used for collecting data to train/test the model. Data for each dancer and each dance move is saved to the path `dataset\RawData\<dancer>\<danceMove>.txt` where `<dancer>` and `<danceMove>` are initialised in the beginning of this script and can thus be configured.
2. `raw_data_categorize_by_move.py` - This script takes in the data collected using `data_collection.py` and consolidates it across different dancers for each dance move and generates a pickle object as output for feature extraction.
3. `feature_extraction.py` - This script takes in the pickle file generated from `raw_data_categorize_by_move.py` and prepares a training and testing set from the same by applying preprocessing and feature engineering steps on the raw dataset. For preprocessing, lowpass filter, highpass filter, and normalization steps are applied. For feature engineering, both time domain and frequency domain features are extracted. The training and testing sets are saved as pickle files.
4. `train_classifier.py` - This script takes in the training and testing dataset from `feature_extraction.py` and trains a selected list of sklearn ML models on the same and reports the performance of each, in terms of accuracy, precision, recall and f1 score. The trained models are saved as pickle files.
5. `run_detector.py` - This is the script for real-time prediction of dance moves using a pretrained model. This script interfaces  with one Arduino Mega board to receive sensor readings every 20 ms and tries to predict what dance move is being performed with steps such as preprocessing, feature engineering and model prediction.

The following files are work in progress and need to be improved/continued in future:  
1. `main.py` - Communications code to interface with blunos using Bluetooth to connect to each and receive sensor readings every 20 ms.
2. `final_eval_server.py` - Server code to be used by the evaluator. Currently, this version is for evaluating systems as per the specs of CG3002. However, this needs to be updated as per the specs of CG4002.

## Coaching Dashboard

This is deployed as a web application and coded using MEAN stack. Used for running analytics on dance moves data. It can load analytics on either the results of previous test runs with the system, or show real-time analytics as well if the system is in use. The software architecture for this dashboard is inspired from [this tutorial](https://www.codeproject.com/Articles/1169143/Creating-Contact-Manager-App-with-MEAN-Stack). The code from this MEAN stack tutorial has been significantly refactored and extended for this dashboard. All the dashboard features are as per the specs of CG4002. The dashboard is currently hosted at [https://cg4002.herokuapp.com/#!/](https://cg4002.herokuapp.com/#!/).
