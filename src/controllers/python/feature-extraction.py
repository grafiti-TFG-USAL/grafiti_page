import os
import sys
import tensorflow as tf
import tensorflow.keras as keras
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.imagenet_utils import preprocess_input
from tensorflow.keras.models import Model
import time

init_time = time.time()

print("TF VERSION: "+ tf.version.VERSION)
if tf.test.gpu_device_name(): 
    print('Dispositivo GPU (por defecto): {}\n'.format(tf.test.gpu_device_name()))
else:
    print("Instale y configure una versión de TensorFlow GPU compatible para mejorar sustancialmente el rendimiento")

def checkFileExistance(filePath):
    try:
        with open(filePath, 'r') as f:
            return True
    except FileNotFoundError as e:
        return False
    except IOError as e:
        return False
    
feature_extractor_path = os.path.abspath(os.path.join("src", "models", "ML", "feature-extractor-"+sys.argv[1]+".h5"))
model_path = os.path.abspath(os.path.join("src", "models", "ML", sys.argv[1]+".h5"))
if not checkFileExistance(feature_extractor_path):
    if not checkFileExistance(model_path):
        print("No existe el modelo base, se descarga")
        model = keras.applications.VGG16(weights="imagenet", include_top=True)
        model.save(model_path)
    else:
        print("Cargando el modelo base")
        model = keras.models.load_model(model_path)
    print("No existe el extractor de caracteristicas, se crea")
    feature_extractor = Model(inputs=model.input, outputs=model.get_layer("fc2").output, name="feature_extractor")
    feature_extractor.save(feature_extractor_path)
else:
    print("Cargando el extractor de caracteristicas")
    feature_extractor = keras.models.load_model(feature_extractor_path)
    
print("Duración de la carga: " + str(time.time()-init_time) + " s")

from PIL import Image, ExifTags
def correct_exif_orientation(image_path):
    try:
        image=Image.open(image_path)
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation]=='Orientation':
                break
        exif = image._getexif()
        if exif:
            if exif[orientation] == 3:
                image=image.rotate(180, expand=True)
            elif exif[orientation] == 6:
                image=image.rotate(270, expand=True)
            elif exif[orientation] == 8:
                image=image.rotate(90, expand=True)
        image.save(image_path)
        image.close()
    except (AttributeError, KeyError, IndexError):
        image.save(image_path)
        image.close()
        pass

import numpy as np
def load_image(path):
    img = image.load_img(path, target_size=(224, 224)) # En ImageNet siempre es 224, 224, 1
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    return img, x
    
images = []
for img in sys.argv[2:]:
    path_to_image = os.path.abspath(os.path.join("src", "public", "uploads", img))
    correct_exif_orientation(path_to_image)
    images.append(img)

features = []
for i in range(len(images)):
    image_path = os.path.abspath(os.path.join("src", "public", "uploads", images[i]))
    img, x = load_image(image_path)
    feat = feature_extractor.predict(x)[0]
    features.append(feat)
    
print("finished extracting features for %d images" % len(images))

features = np.array(features)

from sklearn.decomposition import PCA
import pickle5 as pk

# Comprobar si existe un archivo
pca_path = os.path.abspath(os.path.join("src", "models", "ML", "pca.pkl"))
features_path = os.path.abspath(os.path.join("src", "models", "ML", "features.pkl"))
pca_features_path = os.path.abspath(os.path.join("src", "models", "ML", "pca_features.pkl"))
images_path = os.path.abspath(os.path.join("src", "models", "ML", "images.pkl"))
if checkFileExistance(pca_path) and checkFileExistance(features_path) and checkFileExistance(images_path) and checkFileExistance(pca_features_path):
    
    pca_rf = open(pca_path, 'rb')
    pca = pk.load(pca_rf)
    pca_rf.close()
    
    old_features_rf = open(features_path, 'rb')
    old_features = pk.load(old_features_rf)
    old_features_rf.close()
    
    old_images_rf = open(images_path, 'rb')
    old_images = pk.load(old_images_rf)
    old_images_rf.close()
    
    new_features = np.concatenate((old_features, features), axis=0)
    pca_features = pca.fit_transform(new_features)
    old_images.extend(images)
    
    
    pca_wf = open(pca_path, 'wb')
    pk.dump(pca, pca_wf)
    pca_wf.close()
    
    new_feat_wf = open(features_path, 'wb')
    pk.dump(new_features, new_feat_wf)
    new_feat_wf.close()
    
    new_pca_feat_wf = open(pca_features_path, 'wb')
    pk.dump(pca_features, new_pca_feat_wf)
    new_feat_wf.close()
    
    new_images_wf = open(images_path, 'wb')
    pk.dump(old_images, new_images_wf)
    new_images_wf.close()
    print("Continuado modelo")
    
else:
    principal_components = 50
    pca = PCA(n_components=principal_components)
    pca_features = pca.fit_transform(features)
    
    
    pca_wb = open(pca_path, 'wb')
    pk.dump(pca, pca_wb)
    pca_wb.close()
    
    features_wb = open(features_path, 'wb')
    pk.dump(features, features_wb)
    features_wb.close()
    
    pca_features_wb = open(pca_features_path, 'wb')
    pk.dump(pca_features, pca_features_wb)
    pca_features_wb.close()
    
    images_wb = open(images_path, 'wb')
    pk.dump(images, images_wb)
    images_wb.close()
    print("Creados los modelos")

print("Duración total del proceso %s" % (time.time() - init_time))