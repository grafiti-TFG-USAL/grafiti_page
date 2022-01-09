const jo = require("jpeg-autorotate");
const imageThumbnail = require("image-thumbnail");
const Jimp = require("jimp");

/**
 * Devuelve la imagen rotada según la orientación EXIF, incluido el thumnail
 * @param {Buffer|Path} image 
 * @param {Number} quality - 0-100 porcentaje de compresión
 * @returns {Buffer|null} - El buffer de la imagen ajustada o null de haberse producido un fallo
 */
const rotate = (image, quality = null) => {

    try {
        const options = {
            quality,
            jpegjsMaxMemoryUsageInMB: 200,
            maxMemoryUsageInMB: 200
        };

        var retorno;

        jo.rotate(image, options, (error, buffer, orientation, dimensions, quality) => {
            if (error) {
                if(error.code !== jo.errors.correct_orientation){
                    console.error('Error al rotar la imagen: ' + error.message);
                }
                return retorno = null;
            }
            return retorno = buffer;
        });

    } catch (error) {
        console.errir("Error en el helper rotate: ", error);
        return null;
    }

};

/**
 * Dada una imagen genera un thumbnail
 * @param {*} image - Buffer, Base64 o Path de la imagen
 * @returns - null en caso de error, Base64 con el thumbnail en caso de tener éxito
 */
const generateThumbnail = async (image) => {

    try {

        const options = {
            responseType: "buffer",
            percentage: 15
        }

        const response = await imageThumbnail(image, options);
        if (response) {
            return response;

        } else {
            console.error("Error al generar el thumbnail: no se ha obtenido respuesta de imageThumbnail")
            return null;
        }

    } catch (error) {
        console.error("Error en generateThumbnail: ", error);
        return null;
    }

};


module.exports = {
    rotate,
    generateThumbnail,
}