//const tf = require('@tensorflow/tfjs-node');

const grafitiFeatureExtraction = (images) => {

    // Aceptamos el path de una imagen o un array de paths a imágenes
    switch (typeof(images)) {

        case "object":

            if(!Array.isArray(images)) break;

            var featureMaps = [];
            for(const image of images){
                // Simulamos la extracción de características
                var array = [];
                for (let index = 0; index < 50; index++) {
                    array.push(Math.floor(Math.random()*100));
                }
                // Añadimos el array de características al vector de mapas
                featureMaps.push(array);
            }
            return featureMaps;

            break;

        case "string":

            // Simulamos la extracción de características
            var array = [];
            for (let index = 0; index < 50; index++) {
                array.push(Math.floor(Math.random()*100));
            }
            // Devolvemos el mapa de características
            return array;

            break;

        default:

            return null;
            break;

    }
};

module.exports = {
    grafitiFeatureExtraction
};