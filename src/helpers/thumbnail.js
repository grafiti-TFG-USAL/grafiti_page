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
        //console.log(image)
        const options = {
            quality,
            jpegjsMaxMemoryUsageInMB: 200,
            maxMemoryUsageInMB: 200
        };

        var retorno;

        jo.rotate(image, options, (error, buffer, orientation, dimensions, quality) => {
            if (error) {
                console.log('Error al rotar la imagen: ' + error.message);
                return retorno = null;
            }
            console.log(`Orientation was ${orientation}`);
            console.log(`Dimensions after rotation: ${dimensions.width}x${dimensions.height}`);
            console.log(`Quality: ${quality}`);
            return retorno = buffer;
        });

    } catch (error) {
        console.log("Error en el helper rotate: ", error);
        return null;
    }

};

/**
 * Dada una imagen genera un thumbnail
 * @param {*} image - Buffer, Base64 o Path de la imagen
 * @returns - null en caso de error, Base64 con el thumbnail en caso de tener éxito
 */
const generateThumbnail = async (image) => {

    console.log("Generando thumbnail --------------------------------------")
    try {

        const options = {
            //width: 100,
            //height: 100,
            responseType: "buffer",
            percentage: 15
        }

        const response = await imageThumbnail(image, options);
        if (response) {

            /*const buf = Buffer.from(response, 'base64');
            const img = await Jimp.read(buf);
            var rotated = null;

            img.rotate(90).getBase64(Jimp.MIME_JPEG, (err, src) => {
                if (!err) {
                    rotated = Buffer.from(src, 'base64');
                } else {
                    console.log("Error al rotar el thumbnail: ", err);
                    rotated = null;
                    return null;
                }
            });
            return rotated;*/
            return response;

        } else {
            console.log("Error al generar el thumbnail: no se ha obtenido respuesta de imageThumbnail")
            return null;
        }

    } catch (error) {
        console.log("Error en generateThumbnail: ", error);
        return null;
    }

};


module.exports = {
    rotate,
    generateThumbnail,
}