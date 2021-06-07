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
    const image = await Grafiti.findOne({ _id: grafiti_id, deleted: false }, { absolutePath: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        return res.sendFile(path.resolve("../public/images/image_not_found.png"));
    else if (image.deleted)
        return res.sendFile(path.resolve("../public/images/image_not_found.png"));
    // Si existe la devolvemos
    else{
        return res.sendFile(image.absolutePath);
    }
};

/**
 * Devuelve la miniatura del grafiti indicado, para la API
 */
const getThumbnail = async (req, res) => {

    // Buscamos el grafiti indicado en la base de datos
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id, deleted: false }, { thumbnail: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        return res.sendFile(path.resolve("../public/images/image_not_found.png"));
    else if (image.deleted)
        return res.sendFile(path.resolve("../public/images/image_not_found.png"));
    // Si existe la devolvemos
    else{
        return res.send(image.thumbnail);
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
    var errores = [];
    var fileErr = [];

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
                    errores.push(`No se han podido extraer los metadatos de ${file.originalname}, imagen no almacenada.`);
                    fileErr.push(file.originalName);
                    success = false;
                    message = "Fallo al obtener metadatos de imagen";
                    console.log("Error al extraer metadatos: ", message);
                    await fs.unlink(imgTargetPath);
                    continue;
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
                    errores.push(`La imagen ${file.originalname} no se ha podido almacenar en la base de datos.`);
                    fileErr.push(file.originalName);
                    success = false;
                    message = "Error al subir las imágenes a la base: imagen no almacenada";
                    console.log(message);
                    await fs.unlink(imgTargetPath);
                    continue;
                }

            } else {
                await fs.unlink(imgTempPath);
                errores.push(`La imagen ${file.originalname} no tiene un formato de archivo aceptado.`);
                fileErr.push(file.originalName);
                success = false;
                message = "Solo puede subir imágenes del tipo especificado";
                console.log("Error: ", message);
                await fs.unlink(imgTargetPath);
                continue;
            }

        } catch (error) {
            errores.push(`Error al tratar de subir ${file.originalname}: ${error}`);
            fileErr.push(file.originalName);
            success = false;
            message = "Error al subir las imágenes a la base => " + error;
            console.log(message);
            await fs.unlink(imgTargetPath).catch(null);
            await fs.unlink(imgTempPath).catch(null);
            continue;
        }

    } // Hasta aquí el for()

    console.log({ success, message, errores, fileErr });
    return res.status(success ? 200 : 400).json({ success, message , errores, fileErr});

};

/**
 * Actualiza los datos de un documento
 */
const update = async (req, res) => {

    // Buscamos el grafiti en la base
    const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id, deleted: false });

    // Si el grafiti no existe, está borrado o no pertenece al usuario
    if (!grafiti) {
        console.log("No grafiti")
        return res.status(400).json({
            success: false,
            message: "Error: el grafiti no existe"
        });
    }
    else if (grafiti.deleted) {
        console.log("Grafiti deleted")
        return res.status(400).json({
            success: false,
            message: "Error: el grafiti ha sido borrado"
        });
    }
    else if (!grafiti.userId.equals(req.user._id)) {
        console.log("Not user")
        return res.status(400).json({
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
                        return res.status(400).json({
                            success: false,
                            message: "Error: no se ha podido modificar el dato"
                        });
                    } else {
                        return res.status(200).json({
                            success: true,
                            message: `Ubicación actualizada a: ${req.body.atributo.lat}, ${req.body.atributo.lng}`
                        });
                    }

                } catch (error) {
                    console.log("Error al actualizar: ", error);
                    return res.status(400).json({
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
                        return res.status(400).json({
                            success: false,
                            message: "Error: no se ha podido modificar el dato"
                        });
                    } else {
                        return res.status(200).json({
                            success: true,
                            message: `Descripción actualizada a: ${req.body.atributo}`
                        });
                    }

                } catch (error) {
                    console.log("Error al actualizar: ", error);
                    return res.status(400).json({
                        success: false,
                        message: "Error: no se ha podido modificar el dato => " + error
                    });
                }
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: "Error: El atributo a cambiar no coincide con ninguno de los aceptados"
                });
                break;
        }

    }
};

/**
 * Elimina un documento de la base
 */
const remove = async (req, res) => {

    // Buscamos el grafiti en la base
    const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id, deleted: false });

    // Si el grafiti no existe, está borrado o no pertenece al usuario
    if (!grafiti) {
        console.log("No grafiti")
        return res.status(400).json({
            success: false,
            message: "Error: el grafiti no existe"
        });
    }
    else if (grafiti.deleted) {
        console.log("Grafiti deleted")
        return res.status(400).json({
            success: false,
            message: "Error: el grafiti ha sido borrado"
        });
    }
    else if (!grafiti.userId.equals(req.user._id)) {
        console.log("Not user")
        return res.status(400).json({
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
                return res.status(400).json({
                    success: false,
                    message: "Error: no se ha podido eliminar la imagen"
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: "Grafiti eliminado"
                });
            }

        } catch (error) {
            console.log("No se ha podido eliminar el grafiti: ", error);
            return res.status(400).json({
                success: false,
                message: "No se ha podido eliminar el grafiti: " + error
            });
        }

    }
};

/**
 * Devuelve el número de grafitis de un usuario
 * @returns Entero con el número de grafitis del usuario o null si hay un error 
 */
const countOf = async (userId, countDeleted = false) => {

    try {
        
        if(countDeleted){
            return await Grafiti.countDocuments({ userId });
        }else{
            return await Grafiti.countDocuments({ userId, deleted: false });
        }
        
    } catch (error) {
        console.log("Error al contar grafitis: ", error);
        return null;
    }

};

/**
 * Elimina los grafitis de un usuario
 * @returns Número de grafitis eliminados
 */
const deleteUserGrafitis = async (userId, changeUser = false, communityId = null) => {

    try {
        var deleted;
        if(changeUser) {
            if(!communityId){
                console.log("Debe proporcionar el id del usuario community para poder reasignar los grafitis");
                return null;
            }
            deleted = await Grafiti.updateMany({ userId, deleted: false }, {
                $set: {
                    userId: communityId,
                    originalUser: userId
                },
                $currentDate: { lastModified: 1 }
            });
        }else{
            deleted = await Grafiti.updateMany({ userId, deleted: false }, {
                $set: {
                    deleted: true
                },
                $currentDate: { lastModified: 1 }
            });
        }
        
        if(!deleted)
            return null;
        else
            return deleted.nModified;
        
    } catch (error) {
        console.log("Error al contar grafitis: ", error);
        return null;
    }

};

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

/**
 * Busca y devuelve el path, el nombre en el servidor y el id de los grafitis del usuario indicado
 * @param {mongoose.Types.ObjectId} userId - ObjectId del usuario que tiene los grafitis
 * @param {number} limit - Límite de imágenes a devolver
 * @param {boolean} getDeleted - Devolver también imágenes eliminadas
 */
const getIndexGrafitis = async (userId, limit = 20, getDeleted = false) => {
    return await Grafiti.find({ userId: userId, deleted: getDeleted }, { _id: 1, relativePath: 1 , serverName: 1 , uniqueId: 1}).sort({ uploadedAt: -1 }).limit(limit);
};

/**
 * Busca y devuelve el grafiti especificado por id
 * @param {mongoose.Types.ObjectId} grafitiId - ObjectId del grafiti a buscar en la BD
 */
const getGrafitiById = async (grafitiId) => {
    return await Grafiti.findOne({ _id: grafitiId });
};

module.exports = {
    get,
    getThumbnail,
    upload,
    update,
    remove,
    esSuyo,
    countOf,
    deleteUserGrafitis,
    getIndexGrafitis,
    getGrafitiById,
};