const { Mongoose } = require("mongoose");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const exifr = require("exifr");
const imageThumbnail = require("image-thumbnail");

const Grafiti = require("../models/grafiti.model");

const RNA = require("../config/neuralnet.config");

/**
 * Devuelve el archivo del grafiti indicado, para la API
 */
 const get = async (req, res) => {

    // Buscamos el grafiti indicado en la base de datos
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id }, { absolutePath: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        res.sendFile(path.resolve("../public/images/image_not_found.png"));
    else if (image.deleted)
        res.sendFile(path.resolve("../public/images/image_not_found.png"));
    // Si existe la devolvemos
    else{
        res.sendFile(image.absolutePath);
    }
};

/**
 * Devuelve la miniatura del grafiti indicado, para la API
 */
const getThumbnail = async (req, res) => {

    // Buscamos el grafiti indicado en la base de datos
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id }, { thumbnail: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        res.sendFile(path.resolve("../public/images/image_not_found.png"));
    else if (image.deleted)
        res.sendFile(path.resolve("../public/images/image_not_found.png"));
    // Si existe la devolvemos
    else{
        res.send(image.thumbnail);
    }
};

/**
 * Subida de un conjunto de imágenes al servidor
 */
const upload = async (req, res) => {

    const files = req.files;

    // Iniciamos la respuesta afirmativa
    var success = true;
    var message = "Subido con éxito";

    //var pathArray = []; // Esto iba a ser para procesar las imagenes de golpe tras subirlas 

    for (const file of files) {

        try {

            var images, imgTempPath, imgExt, imgUniqueName, imgTargetPath, imgRelativePath;
            do {

                imgExt = path.extname(file.originalname).toLowerCase();
                imgTempPath = file.path;
                imgUniqueName = uuidv4();
                imgRelativePath = `src/public/uploads/${imgUniqueName}${imgExt}`
                imgTargetPath = path.resolve(imgRelativePath);

                images = await Grafiti.find({ path: imgTargetPath });

            } while (images.length > 0);

            const filetypes = /jpeg|jpg|png/;
            if (filetypes.test(file.mimetype) || filetypes.test(imgExt)) {

                // Movemos el archivo a la carpeta objetivo
                await fs.rename(imgTempPath, imgTargetPath);

                // Extraemos metadatos del archivo
                const buffer = fs.readFileSync(imgTargetPath);
                if (!buffer) {
                    success = false;
                    message = "La imagen no se ha podido leer correctamente";
                    console.log(message);
                    //TODO: eliminar las anteriores
                    return;
                }
                var meta = await exifr.parse(buffer, true);
                if (!meta) {
                    meta = null;
                }
                var gps = await exifr.gps(buffer);
                if (!gps) {
                    gps = null;
                } else if (gps.latitude == 0 && gps.longitude == 0) {
                    gps == null;
                } else {
                    gps = {
                        latitude: gps.latitude,
                        longitude: gps.longitude,
                        altitude: meta.GPSAltitude ? meta.GPSAltitude : null
                    };
                }
                var orientation = await exifr.orientation(buffer);
                if (!orientation) {
                    orientation = null;
                }
                var rotation = await exifr.rotation(buffer);
                if (!rotation) {
                    rotation = null;
                }
                var thumbnail = await exifr.thumbnail(buffer);
                if (!thumbnail) {
                    thumbnail = await imageThumbnail(buffer);
                }

                const image = new Grafiti({
                    originalname: file.originalname,
                    userId: req.user.id,
                    serverName: imgUniqueName + imgExt,
                    relativePath: imgRelativePath,
                    absolutePath: imgTargetPath,
                    gps,
                    orientation,
                    rotation,
                    thumbnail,
                    metadata: meta,
                    featureMap: RNA.grafitiFeatureExtraction(imgRelativePath)
                });

                const imageSaved = await image.save();

                if (!imageSaved) {
                    success = false;
                    message = "Error al subir las imágenes a la base: imagen no almacenada";
                    console.log(message);
                    //TODO: eliminar las anteriores
                    return;
                }

            } else {
                await fs.unlink(imgTempPath);
                success = false;
                message = "Solo puede subir imágenes del tipo especificado";
                console.log("Error: ", message);
            }

        } catch (error) {
            //TODO: eliminar todas las que se hayan guardado
            success = false;
            message = "Error al subir las imágenes a la base => " + error;
            console.log(message);
        }

    }

    console.log({ success, message });
    res.status(success ? 200 : 400).json({ success, message });

};

const update = async (req, res) => {

    // Buscamos el grafiti en la base
    const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id });

    // Si el grafiti no existe, está borrado o no pertenece al usuario
    if (!grafiti) {
        console.log("No grafiti")
        res.status(400).json({
            success: false,
            message: "Error: el grafiti no existe"
        });
    }
    else if (grafiti.deleted) {
        console.log("Grafiti deleted")
        res.status(400).json({
            success: false,
            message: "Error: el grafiti ha sido borrado"
        });
    }
    else if (!grafiti.userId.equals(req.user._id)) {
        console.log("Not user")
        res.status(400).json({
            success: false,
            message: "Error: solo el usuario que ha subido el grafiti puede modificarlo"
        });
    } else {
        let resultado;
        switch (req.body.cambio) {
            case "ubicacion":
                try {

                    resultado = await Grafiti.updateOne({ _id: req.params.grafiti_id }, {
                        $set: {
                            gps: {
                                latitude: req.body.atributo.lat,
                                longitude: req.body.atributo.lng,
                                altitude: null
                            }
                        },
                        $currentDate: { lastModified: 1 }
                    });
                    if (resultado.nModified < 1 || resultado.nModified > 1) {
                        res.status(400).json({
                            success: false,
                            message: "Error: no se ha podido modificar el dato"
                        });
                    } else {
                        res.status(200).json({
                            success: true,
                            message: `Ubicación actualizada a: ${req.body.atributo.lat}, ${req.body.atributo.lng}`
                        });
                    }

                } catch (error) {
                    console.log("Error al actualizar: ", error);
                    res.status(400).json({
                        success: false,
                        message: "Error: no se ha podido modificar el dato => " + error
                    });
                }
                break;

            case "descripcion":
                try {
                    resultado = await Grafiti.updateOne({ _id: req.params.grafiti_id }, {
                        $set: {
                            description: req.body.atributo
                        },
                        $currentDate: { lastModified: 1 }
                    });
                    if (resultado.nModified < 1 || resultado.nModified > 1) {
                        res.status(400).json({
                            success: false,
                            message: "Error: no se ha podido modificar el dato"
                        });
                    } else {
                        res.status(200).json({
                            success: true,
                            message: `Descripción actualizada a: ${req.body.atributo}`
                        });
                    }

                } catch (error) {
                    console.log("Error al actualizar: ", error);
                    res.status(400).json({
                        success: false,
                        message: "Error: no se ha podido modificar el dato => " + error
                    });
                }
                break;

            default:
                res.status(400).json({
                    success: false,
                    message: "Error: El atributo a cambiar no coincide con ninguno de los aceptados"
                });
                break;
        }

    }
};

const remove = async (req, res) => {

    // Buscamos el grafiti en la base
    const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id });

    // Si el grafiti no existe, está borrado o no pertenece al usuario
    if (!grafiti) {
        console.log("No grafiti")
        res.status(400).json({
            success: false,
            message: "Error: el grafiti no existe"
        });
    }
    else if (grafiti.deleted) {
        console.log("Grafiti deleted")
        res.status(400).json({
            success: false,
            message: "Error: el grafiti ha sido borrado"
        });
    }
    else if (!grafiti.userId.equals(req.user._id)) {
        console.log("Not user")
        res.status(400).json({
            success: false,
            message: "Error: solo el usuario que ha subido el grafiti puede modificarlo"
        });
    } else {

        try {
            
            // Actualizamos el grafiti a eliminado
            const resultado = await Grafiti.updateOne({ _id: req.params.grafiti_id }, {
                $set: {
                    deleted: true
                },
                $currentDate: { lastModified: 1 }
            });
            if (resultado.nModified < 1 || resultado.nModified > 1) {
                res.status(400).json({
                    success: false,
                    message: "Error: no se ha podido eliminar la imagen"
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: "Grafiti eliminado"
                });
            }

        } catch (error) {
            console.log("No se ha podido eliminar el grafiti: ", error);
            res.status(400).json({
                success: false,
                message: "No se ha podido eliminar el grafiti: " + error
            });
        }

    }
};

const postComment = (req, res) => {

}

const deleteComment = (req, res) => {

}

/**
 * Si hay un grafiti_id en req.params, busca que el grafiti se corresponda con el usuario que tiene la sesión loggeada.
 */
const esSuyo = async (req, res, next) => {

    // Buscamos el grafiti en la base
    const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id });

    // Si el grafiti no existe, está borrado o no pertenece al usuario
    if (!grafiti) {
        console.log("No grafiti")
        res.render("../views/404");
    }
    else if (grafiti.deleted) {
        console.log("Grafiti deleted")
        res.render("../views/404");
    }
    else if (!grafiti.userId.equals(req.user._id)) {
        console.log("Not user")
        res.render("../views/404");
    }
    // Si es correcto, seguimos
    else {
        next();
    }

};

module.exports = {
    get,
    getThumbnail,
    upload,
    update,
    remove,
    postComment,
    deleteComment,
    esSuyo,
};