# import standard python libraries
import logging
import os, pickle, json, h5py, operator
import numpy as np
import pandas as pd
from collections import Counter

# import libraries for ML
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.datasets import make_moons, make_circles, make_classification
from sklearn.neural_network import MLPClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.discriminant_analysis import QuadraticDiscriminantAnalysis
from sklearn.multiclass import OneVsRestClassifier

# Fix seed value for reproducibility
np.random.seed(1234)

N = 10
OVERLAP = 0.8

# initialise logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

CG3002_FILEPATH = os.path.join("/", "CG3002")

# set constant flag for which classifier to use
'''
0: OneVsRestClassifier(estimator = MLPClassifier(activation="tanh")),
1: OneVsRestClassifier(estimator = SVC(kernel="linear", C=0.025)),
2: MLPClassifier(activation="tanh"),
3: RandomForestClassifier(max_depth=5, n_estimators=200, max_features=1),
4: SVC(kernel="linear", C=0.025),
'''

MODEL_UNIQUE_IDS = {
    0: "ovr_mlp",
    1: "ovr_svm",
    2: "mlp",
    3: "rf",
    4: "svm"
}

CONFIDENCE_THRESHOLD = 0.75

ENC_LIST = [
    ("chicken", 0),
    ("wipers", 1),
    ("number7", 2)
]

CLASSLIST = [ pair[0] for pair in ENC_LIST ]

# Computes precision, recall and F1 scores for every class
def precision_recall_f1(Y_pred, Y_test):
    precision = precision_score(Y_test, Y_pred, average=None, labels=CLASSLIST)
    recall = recall_score(Y_test, Y_pred, average=None, labels=CLASSLIST)
    f1 = f1_score(Y_test, Y_pred, average=None, labels=CLASSLIST)
    metrics = {}
    for i in range(0, len(CLASSLIST)):
        metrics[CLASSLIST[i]] = { "precision": precision[i], "recall": recall[i], "f1": f1[i] }
    return metrics

# Calculate and display various accuracy, precision, recall and f1 scores
def calculatePerformanceMetrics(Y_pred, Y_true, dataset_type):
    assert len(Y_pred) == len(Y_true)
    num_incorrect = len(Y_true) - accuracy_score(Y_true, Y_pred, normalize=False)
    logger.info(len(Y_true))
    logger.info(accuracy_score(Y_true, Y_pred, normalize=False))
    accuracy = accuracy_score(Y_true, Y_pred)
    metrics = precision_recall_f1(Y_pred, Y_true)
    cf_matrix = confusion_matrix(Y_true, Y_pred, labels=CLASSLIST)
    logger.info("Results for " + dataset_type + " set...")
    logger.info("Number of cases that were incorrect: " + str(num_incorrect))
    logger.info("Accuracy: " + str(accuracy))
    for i in range(0, len(CLASSLIST)):
        logger.info("Precision " + CLASSLIST[i] + ": " + str(metrics[CLASSLIST[i]]["precision"]))
        logger.info("Recall " + CLASSLIST[i] + ": " + str(metrics[CLASSLIST[i]]["recall"]))
        logger.info("F1 " + CLASSLIST[i] + ": " + str(metrics[CLASSLIST[i]]["f1"]))
    logger.info("Confusion Matrix below " + str(CLASSLIST) + " : ")
    logger.info("\n" + str(cf_matrix))

# Initialise sklearn models using classifier
def initialiseModel(model_index):
    classifiers = [
        OneVsRestClassifier(estimator = MLPClassifier(activation="tanh")),
        OneVsRestClassifier(estimator = SVC(kernel="linear", C=0.025)),
        MLPClassifier(activation="tanh"),
        RandomForestClassifier(max_depth=5, n_estimators=200, max_features=1),
        SVC(kernel="linear", C=0.025)
    ]
    return classifiers[model_index]

# Train the model, cross-validate and save on file
def fitModel(X, Y):
    models = []
    scores = []
    for i in range(0, 5):
        filepath = os.path.join("model", MODEL_UNIQUE_IDS[i] + ".pkl")
        model = initialiseModel(i)
        accuracy_scores = cross_val_score(model, X, Y, cv=10, scoring="accuracy", n_jobs=-1)
        scores.append(accuracy_scores.mean())
        model.fit(X, Y)
        pickle.dump(model, open(filepath, "wb"))
        models.append(model)
    return models, scores

# Delete samples of certain classes from training/testing dataset
def filterDataset(X, Y, X_test, Y_test):
    classes_to_remove = [
        # No classes need to be removed from self-collected dataset unless experimenting
    ]
    del_idx = [ idx for idx, val in enumerate(Y) if val in classes_to_remove ]
    X = np.delete(X, del_idx, axis=0)
    Y = np.delete(Y, del_idx)
    del_idx = [ idx for idx, val in enumerate(Y_test) if val in classes_to_remove ]
    X_test = np.delete(X_test, del_idx, axis=0)
    Y_test = np.delete(Y_test, del_idx)
    return X, Y, X_test, Y_test

TRAIN_DATASET_PATH = os.path.join("..", "dataset", "train.pkl")
TEST_DATASET_PATH = os.path.join("..", "dataset", "test.pkl")

if __name__ == "__main__":
    scaler = StandardScaler() # other normalization techniques can also be tried

    # Use the dataset prepared from self-collected dataset's raw data values
    X, Y = pickle.load(open(TRAIN_DATASET_PATH, "rb"))
    X_test, Y_test = pickle.load(open(TEST_DATASET_PATH, "rb"))

    logger.info(str(Counter(Y)))
    logger.info(str(Counter(Y_test)))
    logger.info("Fitting...\n")
    models, scores = fitModel(X, Y)
    count = 0

    for model in models:
        import time
        start = time.time()
        train_pred = model.predict(X)
        test_pred = model.predict(X_test)
        end = time.time()
        print("Model : " + MODEL_UNIQUE_IDS[count])
        print("Accuracy on Training set : " + str(round(accuracy_score(Y, train_pred)*100, 2)) + " %")
        print("10-fold Cross Validation Accuracy : " + str(round(scores[count]*100, 2)) + " %")
        print("Accuracy on Testing set : " + str(round(accuracy_score(Y_test, test_pred)*100, 2)) + " %")
        print("Total Prediction time : " + str(round((end-start), 2)) + " seconds")
        print("\n")
        count += 1
