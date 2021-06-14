const { Mongoose } = require("mongoose");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const exifr = require("exifr");
const imageThumbnail = require("image-thumbnail");

const Grafiti = require("../models/grafiti.model.js");
const User = require("../models/user.model");

const RNA = require("../config/neuralnet.config.js");

/**
 * Devuelve el archivo del grafiti indicado, para la API
 */
const get = async (req, res) => {

    // Buscamos el grafiti indicado en la base de datos
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id, deleted: false }, { absolutePath: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        return res.sendFile(path.resolve("src/public/images/image_not_found.png"));
    else if (image.deleted)
        return res.sendFile(path.resolve("src/public/images/image_not_found.png"));
    // Si existe la devolvemos
    else {
        return res.sendFile(image.absolutePath);
    }
};

/**
 * Devuelve la miniatura del grafiti indicado, para la API
 */
const getThumbnail = async (req, res) => {

    // Buscamos el grafiti indicado en la base de datos
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id, deleted: false }, { thumbnail: 1, orientation: 1, absolutePath: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        return res.sendFile(path.resolve("src/public/images/image_not_found.png"));
    else if (image.deleted)
        return res.sendFile(path.resolve("src/public/images/image_not_found.png"));
    // Si existe la devolvemos
    else {
        if (image.orientation == 1) {
            return res.send(image.thumbnail);
        } else {
            return res.sendFile(image.absolutePath);
        }
    }
};

const thumbnails = require("../helpers/thumbnail");
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
                var buffer = fs.readFileSync(imgTargetPath);
                const stats = fs.statSync(imgTargetPath);
                if (!buffer || !stats) {
                    errores.push(`No se han podido extraer los metadatos de ${file.originalname}, imagen no almacenada.`);
                    fileErr.push(file.originalName);
                    success = false;
                    message = "Fallo al obtener metadatos de imagen";
                    console.log("Error al extraer metadatos: ", message);
                    await fs.unlink(imgTargetPath);
                    continue;
                }

                const rotated = thumbnails.rotate(buffer, stats.size > 1024 * 1024 ? 20 : 80);
                if (rotated) {
                    buffer = rotated;
                } else {
                    console.log("no rotado");
                }
                /*const thumbnail_response = await thumbnails.generateThumbnail(buffer);
                if (!thumbnail_response) {
                    console.log("!thumbnail response")
                    const jpgTypes = /jpeg|jpg/;
                    if (jpgTypes.test(file.mimetype) || jpgTypes.test(imgExt)) {
                        console.log("is JPEG");
                        const rotated = thumbnails.rotate(buffer);
                        if (rotated){
                            console.log("Rotated")
                            buffer = rotated;
                        }
                    }
                }*/

                var meta = await exifr.parse(buffer, true);
                var description = "";
                if (!meta) {
                    meta = null;
                } else {
                    //if (meta.hasOwnProperty("XPComment")) {
                    if (meta.XPComment) {
                        description = meta.XPComment;
                    }
                }
                var gps = await exifr.gps(buffer);
                if (!gps) {
                    gps = null;
                } else {
                    gps = {
                        type: "Point",
                        coordinates: [gps.longitude, gps.latitude],
                    };
                }
                console.log(gps);
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
                    if (stats.size < 1024 * 1024) {
                        console.log("Imagen demasiado pequeña como para usar su thumbnail")
                        thumbnail = await imageThumbnail(buffer, { percentage: 70 });
                    } else {
                        thumbnail = await imageThumbnail(buffer);
                    }
                }

                /*var thumbnail;
                if (thumbnail_response) {
                    console.log("Thumbnail response == true")
                    thumbnail = thumbnail_response;
                } else {
                    thumbnail = await exifr.thumbnail(buffer);
                    if (!thumbnail) {
                        thumbnail = await imageThumbnail(buffer);
                    }
                }*/

                const image = new Grafiti({
                    originalname: file.originalname,
                    user: req.user._id,
                    serverName: imgUniqueName + imgExt,
                    relativePath: imgRelativePath,
                    absolutePath: imgTargetPath,
                    description,
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

    return res.status(success ? 200 : 400).json({ success, message, errores, fileErr });

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
    else if (!grafiti.user.equals(req.user._id)) {
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
                                type: "Point",
                                coordinates: [req.body.atributo.lng, req.body.atributo.lat],
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
    else if (!grafiti.user.equals(req.user._id)) {
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
const countOf = async (user, countDeleted = false) => {

    try {

        if (countDeleted) {
            return await Grafiti.countDocuments({ user });
        } else {
            return await Grafiti.countDocuments({ user, deleted: false });
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
const deleteUserGrafitis = async (user, changeUser = false, communityId = null) => {

    try {
        var deleted;
        if (changeUser) {
            if (!communityId) {
                console.log("Debe proporcionar el id del usuario community para poder reasignar los grafitis");
                return null;
            }
            deleted = await Grafiti.updateMany({ user, deleted: false }, {
                $set: {
                    user: communityId,
                    originalUser: user
                },
                $currentDate: { lastModified: 1 }
            });
        } else {
            deleted = await Grafiti.updateMany({ user, deleted: false }, {
                $set: {
                    deleted: true
                },
                $currentDate: { lastModified: 1 }
            });
        }

        if (!deleted)
            return null;
        else
            return deleted.nModified;

    } catch (error) {
        console.log("Error al contar grafitis: ", error);
        return null;
    }

};

/**
 * Busca y devuelve el path, el nombre en el servidor y el id de los grafitis del usuario indicado
 * @param {mongoose.Types.ObjectId} user - ObjectId del usuario que tiene los grafitis
 * @param {number} limit - Límite de imágenes a devolver
 * @param {boolean} getDeleted - Devolver también imágenes eliminadas
 */
const getIndexGrafitis = async (user, limit = 20, getDeleted = false) => {

    try {

        return await Grafiti.find({ user: user, deleted: getDeleted }, { _id: 1, relativePath: 1, serverName: 1, uniqueId: 1 }).sort({ uploadedAt: -1 }).limit(limit);

    } catch (error) {
        console.log("Error en getIndexGrafitis: ", error);
        return null;
    }

};

/**
 * Busca y devuelve el grafiti especificado por id
 * @param {mongoose.Types.ObjectId} grafitiId - ObjectId del grafiti a buscar en la BD
 */
const getGrafitiById = async (grafitiId) => {

    try {

        return await Grafiti.findOne({ _id: grafitiId, deleted: false });

    } catch (error) {
        console.log("Error en getGrafitiById: ", error);
        return null;
    }

};

/**
 * Devuelve n grafitis de la base de datos
 * @param {Number} page - Número de página
 * @param {Number} nGrafitis - Número de grafitis por página
 * @returns Grafitis
 */
const getGrafitiPage = async (page, nGrafitis) => {

    try {

        const grafitis = await Grafiti.find({ deleted: false }).sort({ lastModified: -1 }).skip((page - 1) * nGrafitis).limit(nGrafitis).populate("user", { name: 1, surname: 1, email: 1 });

        if (!grafitis) {
            console.log("No se han podido recuperar los grafitis en la consulta");
            return null;
        }
        /*console.time("Bucle for");
        const usuarios = {};
        for (var grafiti of grafitis) {

            if (!usuarios[grafiti.user.toString]) {

                // Eliminamos de la base de datos de usuarios a los no verificados que exceden el plazo
                const user = await User.findById(grafiti.user, {
                    name: 1, surname: 1, email: 1
                });
                if (!user) {
                    console.log("No he han podido consultar los datos del usuario");
                    return null;
                }

                const username = {
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                };

                grafiti["username"] = username;
                usuarios[grafiti.user.toString] = username;

            } else {
                grafiti["username"] = usuarios[grafiti.user.toString];
            }

        }
        console.timeEnd("Bucle for");*/

        return grafitis;

    } catch (error) {
        console.log("Error en getGrafitiPage: ", error);
        return null;
    }

};

/**
 * Devuelve el número de páginas totales dado el número de grafitis por página
 * @param {Number} n - Número de grafitis por página
 * @returns Número de páginas
 */
const getNumberOfPages = async (n) => {

    try {

        const nGrafitis = await Grafiti.countDocuments({ deleted: false });
        if (!nGrafitis) {
            console.log("Error al consultar el número de grafitis");
            return null;
        }

        return Math.ceil(nGrafitis / n);

    } catch (error) {
        console.log("Error en getNumberOfPages: ", error);
        return null;
    }

};

/**
 * Devuelve todos los grafitis con su ubicación definida
 * @returns Número de páginas
 */
const getGrafitisWithGPS = async (req, res) => {

    try {

        const grafitis = await Grafiti.find({
            deleted: false, 
            "gps.type": { $ne: null }
        },
        { gps: 1, user: 1 });
        if (!grafitis) {
            console.log("Error al consultar el número de grafitis");
            return res.status(400).json({
                success: false,
                message: "Error al consultar el número de grafitis"
            });
        } else
            if (grafitis.length == 0) {
                console.log("Se obtuvieron 0 grafitis en la consulta");
                return res.status(400).json({
                    success: false,
                    message: "Se obtuvieron 0 grafitis en la consulta"
                });
            }

        //console.log("grafitis: ", grafitis);
        return res.status(200).json({
            success: true,
            message: `Se obtuvieron ${grafitis.length} grafitis en la consulta`,
            grafitis: grafitis
        });

    } catch (error) {
        console.log("Error en getGrafitisWithGPS: ", error);
        return res.status(400).json({
            success: false,
            message: "Error en getGrafitisWithGPS: " + error
        });
    }

};



module.exports = {
    get,
    getThumbnail,
    upload,
    update,
    remove,
    countOf,
    deleteUserGrafitis,
    getIndexGrafitis,
    getGrafitiById,
    getNumberOfPages,
    getGrafitiPage,
    getGrafitisWithGPS,
};