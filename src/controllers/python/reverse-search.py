import os
import sys
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.imagenet_utils import preprocess_input
import numpy as np
import time

init_time = time.time()

def checkFileExistance(filePath):
    try:
        with open(filePath, 'r') as f:
            return True
    except FileNotFoundError as e:
        return False
    except IOError as e:
        return False

features_path = os.path.abspath(os.path.join("src", "models", "ML", "pca_features.pkl"))
images_path = os.path.abspath(os.path.join("src", "models", "ML", "images.pkl"))
if (not checkFileExistance(features_path)) and (not checkFileExistance(images_path)):
    print("No existe alguno de los archivos de volcado necesarios", file=sys.stderr)
    exit(1)

import pickle5 as pk

features = pk.load(open(features_path, 'rb'))
images = pk.load(open(images_path, 'rb'))

print("Hay " + str(len(images)) + " imagenes")
idx = images.index(sys.argv[1])

img_path = os.path.abspath(os.path.join("src", "public", "uploads", images[idx]))
img = image.load_img(img_path)

from scipy.spatial import distance

similar_idx = [distance.cosine(features[idx], feat) for feat in features]
idx_closest = sorted(range(len(similar_idx)), key=lambda k : similar_idx[k])[1:]

min_dist = min(similar_idx)
max_dist = max(similar_idx)

def map_dist(dst, in_min, in_max, out_min, out_max):
  return (dst - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

servernames = []
percentages = []
for tuple in idx_closest:
    servernames.append(images[tuple])
    percentages.append(map_dist(similar_idx[tuple], min_dist, max_dist, 100, 0))

import pandas as pd

df = pd.DataFrame({"Servername": servernames, "Similarity": percentages})

path_csv = os.path.abspath(os.path.join("src", "tempfiles", "searches", os.path.splitext(sys.argv[1])[0])+".csv")

df.to_csv(path_or_buf=path_csv, header=False, index=False)

print("Duración total de la búsqueda " + images[idx] + ": " + str(time.time()-init_time) + " s")