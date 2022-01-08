const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const archiver = require("archiver");
const exifr = require("exifr");
const imageThumbnail = require("image-thumbnail");
const ObjectsToCsv = require("objects-to-csv");

const Grafiti = require("../models/grafiti.model");
const Location = require("../models/location.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const Match = require("../models/match.model");

const Sockets = require("../config/sockets.config");
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

/**
 * Devuelve la información del grafiti de la base de datos
 */
const getInfo = async (req, res) => {

    // Buscamos el grafiti indicado en la base de datos (no me gusta devolver el user id)
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id, deleted: false }, { user:1, description:1, gps:1, orientation:1, rotation:1, thumbnail:1, dateTimeOriginal:1,  }).populate("gps", { location: 1 });

    // Si la imagen no existe o está eliminada cargamos el image not found
    if (!image)
        return res.status(404).json({
            success: false,
            message: "Error: La imagen no existe"
        });
    else if (image.deleted)
        return res.status(404).json({
            success: false,
            message: "Error: La imagen no existe"
        });
    // Si existe la devolvemos
    else {
        return res.status(200).json({
            image,
            success: true,
            message: "Devolviendo datos de la imagen"
        });
    }
};

const thumbnails = require("../helpers/thumbnail");
const { Mongoose } = require("mongoose");
const { random } = require("faker");
const { findOneAndDelete } = require("../models/user.model");
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

    const nFiles = files.length;
    const step = 100.0 / nFiles;
    const socketid = Sockets.connectedUsers[req.user.id+":upload"].id;
    function emitStep(index) {
        req.app.io.to(socketid).emit("upload:step", { percentage: (index * step).toFixed(2) });
    }
    function emitSemiStep(index, percentage) {
        req.app.io.to(socketid).emit("upload:step", { percentage: ((index - 1) * step + percentage * step).toFixed(2) });
    }

    var index = 0;
    for (const file of files) {
        index++;
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

            const filetypes = /jpeg|jpg/;
            if (filetypes.test(file.mimetype) || filetypes.test(imgExt)) {

                // Movemos el archivo a la carpeta objetivo
                await fs.rename(imgTempPath, imgTargetPath);

                // Extraemos metadatos del archivo
                var buffer = fs.readFileSync(imgTargetPath);
                const stats = fs.statSync(imgTargetPath);
                if (!buffer || !stats) {
                    errores.push(`No se han podido extraer los metadatos de ${file.originalname}, imagen no almacenada.`);
                    fileErr.push(file.originalname);
                    success = false;
                    message = "Fallo al obtener metadatos de imagen";
                    console.error("Error al extraer metadatos: ", message);
                    await fs.unlink(imgTargetPath);
                    emitStep(index);
                    continue;
                }
                emitSemiStep(index, 0.25);

                const rotated = thumbnails.rotate(buffer, stats.size > 1024 * 1024 ? 20 : 80);
                if (rotated) {
                    buffer = rotated;
                } else {
                    //console.error("no rotado");
                }
                emitSemiStep(index, 0.5);
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
                        //console.error("Imagen demasiado pequeña como para usar su thumbnail")
                        thumbnail = await imageThumbnail(buffer, { percentage: 70 });
                    } else {
                        thumbnail = await imageThumbnail(buffer);
                    }
                }
                var dateTimeOriginal = null;
                if (meta.DateTimeOriginal) {
                    dateTimeOriginal = meta.DateTimeOriginal;
                } else {
                    dateTimeOriginal = Date.now();
                }
                emitSemiStep(index, 0.7);

                const image = new Grafiti({
                    originalName: file.originalname,
                    user: req.user._id,
                    serverName: imgUniqueName + imgExt,
                    relativePath: imgRelativePath,
                    absolutePath: imgTargetPath,
                    description,
                    orientation,
                    rotation,
                    thumbnail,
                    //metadata: meta,
                    dateTimeOriginal,
                    featureMap: RNA.grafitiFeatureExtraction(imgRelativePath)
                });

                const imageSaved = await image.save();

                if (!imageSaved) {
                    errores.push(`La imagen ${file.originalname} no se ha podido almacenar en la base de datos.`);
                    fileErr.push(file.originalName);
                    success = false;
                    message = "Error al subir las imágenes a la base: imagen no almacenada";
                    console.error(message);
                    await fs.unlink(imgTargetPath);
                    emitStep(index);
                    continue;
                }
                emitSemiStep(index, 0.9);

                if (gps) {
                    const location = new Location({
                        grafiti: imageSaved._id,
                        location: gps,
                    });
                    const locationSaved = await location.save();
                    if (!locationSaved) {
                        errores.push(`La ubicación de la imagen ${file.originalname} no se ha podido almacenar en la base de datos.`);
                        fileErr.push(file.originalname);
                        success = false;
                        message = "Error al subir las imágenes a la base: ubicación de la imagen no almacenada";
                        console.error(message);
                        emitStep(index);
                        continue;
                    }

                    imageSaved["gps"] = locationSaved._id;
                    const imageUpdated = await imageSaved.save();
                    if (!imageUpdated) {
                        errores.push(`La ubicación de la imagen ${file.originalname} no se ha podido almacenar en la base de datos.`);
                        fileErr.push(file.originalName);
                        success = false;
                        message = "Error al subir las imágenes a la base: ubicación de la imagen no almacenada";
                        console.error(message);
                        await locationSaved.delete();
                        emitStep(index);
                        continue;
                    }
                } else {
                    const notificacion = new Notification({
                        user: req.user._id,
                        type: "Ubicación no establecida",
                        grafiti: imageSaved._id,
                        seen: false,
                    });
                    const notificacionSaved = await notificacion.save();
                    if (!notificacionSaved) {
                        await fs.unlink(imgTempPath);
                        errores.push("No se ha podido  notificación al usuario");
                        fileErr.push(file.originalName);
                        success = false;
                        await fs.unlink(imgTargetPath);
                        emitStep(index);
                        continue;
                    }
                }

            } else {
                await fs.unlink(imgTempPath);
                errores.push(`La imagen ${file.originalname} no tiene un formato de archivo aceptado.`);
                fileErr.push(file.originalName);
                success = false;
                message = "Solo puede subir imágenes del tipo especificado";
                console.error("Error: ", message);
                await fs.unlink(imgTargetPath);
                emitStep(index);
                continue;
            }

        } catch (error) {
            errores.push(`Error al tratar de subir ${file.originalname}: ${error}`);
            fileErr.push(file.originalname);
            success = false;
            message = "Error al subir las imágenes a la base => " + error;
            console.error(message);
            await fs.unlink(imgTargetPath).catch(null);
            await fs.unlink(imgTempPath).catch(null);
            emitStep(index);
            continue;
        }
        emitStep(index);

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
        console.error("No grafiti")
        return res.status(400).json({
            success: false,
            message: "Error: el grafiti no existe"
        });
    }
    else if (grafiti.deleted) {
        console.error("Grafiti deleted")
        return res.status(400).json({
            success: false,
            message: "Error: el grafiti ha sido borrado"
        });
    }
    else if (!grafiti.user.equals(req.user._id)) {
        console.error("Not user")
        return res.status(400).json({
            success: false,
            message: "Error: solo el usuario que ha subido el grafiti puede modificarlo"
        });
    } else {

        let resultado;

        switch (req.body.cambio) {

            case "ubicacion":
                try {

                    // Buscamos si el grafiti tiene ubicación
                    const ubicacion = await Location.findOne({ grafiti: req.params.grafiti_id });
                    if (!ubicacion) {

                        const nuevaLocation = new Location({
                            grafiti: req.params.grafiti_id,
                            location: {
                                type: "Point",
                                coordinates: [req.body.atributo.lng, req.body.atributo.lat]
                            }
                        });
                        resultado = await nuevaLocation.save();
                        resultado = await Grafiti.updateOne({ _id: req.params.grafiti_id }, {
                            $set: {
                                gps: resultado._id
                            },
                        });
                        const removal = await Notification.deleteOne({
                            type: "Ubicación no establecida",
                            grafiti: req.params.grafiti_id
                        });
                        const decrement = await User.updateOne({ _id: req.user._id }, {
                            $inc: { notifications: -1 },
                        })
                        if (!removal ||
                            !decrement) {
                            console.error("No se ha podido eliminar la notificación");
                        }

                    } else {

                        resultado = await Location.updateOne({ grafiti: req.params.grafiti_id }, {
                            $set: {
                                location: {
                                    type: "Point",
                                    coordinates: [req.body.atributo.lng, req.body.atributo.lat],
                                }
                            },
                        });

                    }

                    if (resultado.nModified < 1 || resultado.nModified > 1) {
                        console.error("Error en la actualización de la ubicación de " + req.params.grafiti_id + ": ", resultado);
                        return res.status(400).json({
                            success: false,
                            message: "Error (1): no se ha podido modificar el dato"
                        });
                    } else {

                        await Grafiti.updateOne({ id: req.params.grafiti_id }, {
                            $currentDate: { lastModified: 1 },
                        });

                        return res.status(200).json({
                            success: true,
                            message: `Ubicación actualizada a: ${req.body.atributo.lat}, ${req.body.atributo.lng}`
                        });

                    }

                } catch (error) {
                    console.error("Error al actualizar: ", error);
                    return res.status(400).json({
                        success: false,
                        message: "Error (2): no se ha podido modificar el dato => " + error
                    });
                }
                break;

            case "eliminar_ubicacion":
                try {
                    resultado = await Grafiti.updateOne({ _id: req.params.grafiti_id }, {
                        $unset: {
                            gps: 1
                        },
                        $currentDate: { lastModified: 1 }
                    });
                    if (resultado.nModified < 1 || resultado.nModified > 1) {
                        return res.status(400).json({
                            success: false,
                            message: "Error: no se ha podido modificar el dato"
                        });
                    } else {
                        const eliminacion = await Location.deleteOne({ grafiti: req.params.grafiti_id });
                        if (eliminacion.deletedCount == 1 && eliminacion.ok == 1) {

                            const notificacion = new Notification({
                                user: req.user.id,
                                type: "Ubicación no establecida",
                                grafiti: req.params.grafiti_id,
                                seen: false,
                            });

                            const notificacionSaved = await notificacion.save();
                            if (!notificacionSaved) {
                                console.error("Error, no se ha podido  notificación al usuario");
                                return res.status(400).json({
                                    success: false,
                                    message: "Error: no se ha podido añadir notificación al usuario"
                                });
                            }
                            // Si todo ha ido bien
                            return res.status(200).json({
                                success: true,
                                message: `Ubicación eliminada`
                            });

                        } else {
                            console.error("Error, no se ha podido eliminar el documento Location");
                            return res.status(400).json({
                                success: false,
                                message: "Error: no se ha podido modificar el dato"
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error al actualizar: ", error);
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
                    console.error("Error al actualizar: ", error);
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
        throw "El grafiti no existe";
    }
    else if (grafiti.deleted) {
        throw "El grafiti ha sido borrado";
    }
    else if (!grafiti.user.equals(req.user._id)) {
        throw "Solo el usuario que ha subido el grafiti puede eliminarlo";
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
                throw "No se ha podido eliminar la imagen, " + resultado;
            } else {

                // Eliminamos todas las notificaciones relativas a la imagen
                await Notification.deleteMany({ grafiti: req.params.grafiti_id });

                // Eliminamos los matches del grafiti
                await Match.deleteMany({ $or: [
                    { grafiti_1: req.params.grafiti_id },
                    { grafiti_2: req.params.grafiti_id }
                ] });

                return res.status(200).json({
                    success: true,
                    message: "Grafiti eliminado"
                });

            }

        } catch (error) {
            console.error("No se ha podido eliminar el grafiti: ", error);
            return res.status(400).json({
                success: false,
                message: "No se ha podido eliminar el grafiti: " + error
            });
        }

    }
};

/**
 * Elimina un conjunto de documentos de la base
 */
const removeBatch = async (req, res) => {

    // Obtenemos el body de la consulta
    const { ids } = req.body;
    try {
        
        // Obtenemos los ids de aquellos que cumplan requisitos
        const matches = await Grafiti.find({
            _id: { $in: ids },
            user: req.user._id,
        },  { _id: 1 });
        const matchesIds = matches.map(function (obj) {
            return `${obj._id}`;
        });
        
        // Eliminamos también de matches
        await Match.deleteMany({
            $or: [
                { grafiti_1: { $in: matchesIds } },
                { grafiti_2: { $in: matchesIds } },
            ],
        });
        
        // Eliminamos también las notificaciones
        await Notification.deleteMany({
            grafiti: { $in: matchesIds },
            user: req.user._id,
        });
        
        // Actualizamos los grafitis a eliminados
        const result = await Grafiti.updateMany({
            _id: { $in: matchesIds },
            deleted: false,
            user: req.user._id,
        }, { $set: { deleted: true }});
        if(!result) {
            throw "La eliminación no tuvo resultado";
        }

        return res.status(200).json({
            success: true,
            message: "Grafitis eliminados"
        });

    } catch (error) {
        console.error("No se han podido eliminar los grafitis: ", error);
        return res.status(400).json({
            success: false,
            message: "No se han podido eliminar los grafitis: " + error,
        });
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
        console.error("Error al contar grafitis: ", error);
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
                console.error("Debe proporcionar el id del usuario community para poder reasignar los grafitis");
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
        console.error("Error al contar grafitis: ", error);
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

        return await Grafiti.find({ user: user, deleted: getDeleted }, { _id: 1, relativePath: 1, serverName: 1, uniqueId: 1 })
            .limit(limit)
            .sort({ uploadedAt: -1 });

    } catch (error) {
        console.error("Error en getIndexGrafitis: ", error);
        return null;
    }

};

/**
 * Busca y devuelve las estadísticas que se mostrarán en el dashboard
 * @param {mongoose.Types.ObjectId} user - ObjectId del usuario
 */
const getIndexStats = async (user) => {

    try {

        const stats = {};

        // Recogemos el nº de grafitis del usuario
        const nUserGrafitis = await Grafiti.countDocuments({ user, deleted: false });
        stats.nUserGrafitis = nUserGrafitis ? nUserGrafitis : 0;
        // Recogemos el nº de grafitis de la base
        const nGrafitis = await Grafiti.countDocuments({ deleted: false });
        stats.nGrafitis = nGrafitis ? nGrafitis : 0;
        // Recogemos el nº de grafitis del usuario con gps
        const nGPSUserGrafitis = await Grafiti.countDocuments({ deleted: false, user, gps: { $ne: null } });
        stats.nGPSUserGrafitis = nGPSUserGrafitis ? nGPSUserGrafitis : 0;
        // Recogemos el nº de grafitis del usuario con gps
        const nUserMatches = await Match.countDocuments({ establishedBy: user });
        stats.nUserMatches = nUserMatches ? nUserMatches : 0;
        const nOthers = await Match.countDocuments({ otherUser: user });
        if(nOthers) {
            stats.nUserMatches += nOthers;
        }

        return stats;

    } catch (error) {
        console.error("Error en getIndexStats: ", error);
        return null;
    }

};

/**
 * Busca y devuelve el grafiti especificado por id
 * @param {mongoose.Types.ObjectId} grafitiId - ObjectId del grafiti a buscar en la BD
 */
const getGrafitiById = async (grafitiId) => {

    try {

        var grafiti = await Grafiti.findOne({ _id: grafitiId, deleted: false });

        if (grafiti) {
            if (grafiti.gps) {
                grafiti = await grafiti.populate("gps", { location: 1 }).execPopulate();
            }
        }

        return grafiti;

    } catch (error) {
        console.error("Error en getGrafitiById: ", error);
        return null;
    }

};

/**
 * Devuelve todos los grafitis con su ubicación definida
 * @returns Grafitis con ubicación
 */
const getGrafitisWithGPS = async (req, res) => {

    try {

        const grafitis = await Grafiti.find({
            deleted: false,
            gps: { $ne: null }
        },
            { gps: 1, user: 1 })
            .populate("gps", { location: 1 });

        if (!grafitis) {
            console.error("Error al consultar el número de grafitis");
            return res.status(400).json({
                success: false,
                message: "Error al consultar el número de grafitis"
            });
        } else {
            if (grafitis.length == 0) {
                return res.status(400).json({
                    success: false,
                    message: "Se obtuvieron 0 grafitis en la consulta"
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Se obtuvieron ${grafitis.length} grafitis en la consulta`,
            grafitis: grafitis
        });

    } catch (error) {
        console.error("Error en getGrafitisWithGPS: ", error);
        return res.status(400).json({
            success: false,
            message: "Error en getGrafitisWithGPS: " + error
        });
    }

};

/**
 * Devuelve los matches del grafiti indicado como parámetro en la URI y el número total de matches del grafiti
 */
const getMatches = async (req, res) => {
    try {

        const grafitiId = req.params.grafiti_id;
        const coincidencias = await Match.countDocuments({
            $or: [{ grafiti_1: grafitiId }, { grafiti_2: grafitiId }],
        });

        const query = req.query;
        var matches = Match.find({
            $or: [{ grafiti_1: grafitiId }, { grafiti_2: grafitiId }],
        });
        // Si no hay parámetros de búsqueda
        if (!req.query) {
            // Consulta por defecto
            matches = matches.sort({ similarity: -1 });
        } else {
            // Ordenamos los resultados, default: similaridad descendente
            matches = matches.sort({ similarity: query.order ? Number.parseInt(query.order) : -1 });
            //// Seleccionamos los grafitis correspondientes a la página
            // Saltamos las páginas anteriores, default: es la primera página
            const page = query.page ? Number.parseInt(query.page) - 1 : 0;
            // Limitamos los resultados a un número, default: sin límite = 0
            const limPage = query.docsppage ? Number.parseInt(query.docsppage) : 0;
            matches = matches
                .skip(page * limPage) // Si limPage es 0, skip no tendrá efecto
                .limit(limPage);
        }
        // Ejecutamos la consulta
        matches = await matches.exec();

        const message = `Se han encontrado ${coincidencias} coincidencias`;
        const ret = {
            success: true,
            message,
            matches,
            nMatches: coincidencias,
        };

        return res.status(200).json(ret);

    } catch (error) {
        console.error("Ha habido un error en getMatches: ", error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }
};

/**
 * Crea un match entre dos grafitis
 */
 const setMatch = async (req, res) => {

    try {
        
        const user = req.user;
        const { grafiti_1, grafiti_2/*, percentage*/ } = req.body;
        //TODO usar percentage original
        const percentage = Math.random() * 100;
        
        if(!user || !grafiti_1 || !grafiti_2 || !percentage) {
            throw "Error: el formato recibido es incorrecto";
        }
        if(percentage < 0 || percentage > 100) {
            throw "Error: la similitud indicada no es porcentual";
        }
        
        const grafiti1 = await Grafiti.findById(grafiti_1);
        const grafiti2 = await Grafiti.findById(grafiti_2);
        if(!grafiti1 || !grafiti2) {
            throw "Error, el grafiti no está en la base de datos";
        }
        const user1 = grafiti1.user;
        const user2 = grafiti2.user;
        
        // Comprobamos que no exista ya un match entre ambas imágenes
        const queryMatch1 = await Match.findOne({ 
            grafiti_1, grafiti_2
        });
        const queryMatch2 = await Match.findOne({ 
            grafiti_1: grafiti_2, grafiti_2: grafiti_1
        });
        if(queryMatch1 || queryMatch2){
            throw "Error: ya existe un match entre ambas imágenes";
        }
        
        if(!user1.equals(user._id)) {
            throw "Error, el usuario no corresponde con el propietario de la imagen";
        }
        
        // Si el propietario de ambas imágenes es el mismo
        if(user1.equals(user2)) {
            
            const create = new Match({
                grafiti_1: grafiti1._id,
                grafiti_2: grafiti2._id,
                similarity: percentage.toFixed(2),
                sameUser: true,
                establishedBy: user1,
                confirmed: true,
            });
            
            const matchSaved = await create.save();
            if(!matchSaved) {
                throw "Error: no se ha podido insertar el match en la base de datos";
            }
            
        } // Si la imagen pertenece a otro
        else {
            
            const createMatch = new Match({
                grafiti_1: grafiti1._id,
                grafiti_2: grafiti2._id,
                similarity: percentage,
                sameUser: false,
                establishedBy: user1,
                confirmed: false,
            })
            
            const matchSaved = await createMatch.save();
            if(!matchSaved) {
                throw "Error: no se ha podido insertar el match en la base de datos";
            }
            
            const notificacion = new Notification({
                user: user2,
                type: "Grafiti similar detectado",
                grafiti: grafiti2._id,
                grafiti_2: grafiti1._id,
                seen: false,
            });

            const notificacionSaved = await notificacion.save();
            if (!notificacionSaved) {
                throw "Se ha podido guardar el match, pero no se ha podido  notificación al usuario";
            }
            
        }
        
        console.error("Listo");
        return res.status(200).json({
            success: true,
            message: "Se ha creado el match exitosamente",
        });
        
    } catch (error) {
        console.error("Error en setMatch: " + error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }

};

/**
 * Confirma el match indicado
 */
 const confirmMatch = async (req, res) => {

    try {
        
        const user = req.user;
        const { grafiti_1, grafiti_2 } = req.body;
        
        if(!user || !grafiti_1 || !grafiti_2) {
            throw "Error: el formato recibido es incorrecto";
        }
        
        const grafiti1 = await Grafiti.findById(grafiti_1);
        const grafiti2 = await Grafiti.findById(grafiti_2);
        if(!grafiti1 || !grafiti2) {
            throw "Error: el grafiti no está en la base de datos";
        }
        const user1 = grafiti1.user;
        const user2 = grafiti2.user;
        
        // Comprobamos que el usuario que confirma el match sea el propietario de la imagen a confirmar
        if(!user1.equals(user._id)) {
            throw "Error: el usuario no corresponde con el propietario de la imagen";
        }
        
        // Actualizamos el match
        const match = await Match.updateOne({ // Filtro de búsqueda 
            grafiti_1: grafiti2._id,
            grafiti_2: grafiti1._id,
            sameUser: false,
            establishedBy: user2._id,
            confirmed: false,
        }, { // Actualizaciones
            confirmed: true,
        });
        if (!match || match.nModified != 1) {
            throw "No se ha modificado ningún match";
        }
        
        // Eliminamos la notificación
        const removal = await Notification.deleteOne({
            type: "Grafiti similar detectado",
            grafiti: grafiti1._id,
            grafiti_2: grafiti2._id
        });
        const decrement = await User.updateOne({ _id: user._id }, {
            $inc: { notifications: -1 },
        })
        if (!removal ||
            !decrement) {
            console.error("No se ha podido eliminar la notificación");
        }
        
        return res.status(200).json({
            success: true,
            message: "Se ha confirmado el match exitosamente",
        });
        
    } catch (error) {
        console.error("Error en setMatch: " + error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }

};


/**
 * Elimina el match sin confirmar
 */
 const notConfirmMatch = async (req, res) => {

    try {
        
        const user = req.user;
        const { grafiti_1, grafiti_2 } = req.body;
        
        if(!user || !grafiti_1 || !grafiti_2) {
            throw "Error: el formato recibido es incorrecto";
        }
        
        const grafiti1 = await Grafiti.findById(grafiti_1);
        const grafiti2 = await Grafiti.findById(grafiti_2);
        if(!grafiti1 || !grafiti2) {
            throw "Error: el grafiti no está en la base de datos";
        }
        const user1 = grafiti1.user;
        const user2 = grafiti2.user;
        
        // Comprobamos que el usuario que confirma el match sea el propietario de la imagen a confirmar
        if(!user1.equals(user._id)) {
            throw "Error: el usuario no corresponde con el propietario de la imagen";
        }
        
        // Eliminamos el match
        const match = await Match.deleteOne({ // Filtro de búsqueda 
            grafiti_1: grafiti2._id,
            grafiti_2: grafiti1._id,
            sameUser: false,
            establishedBy: user2._id,
            confirmed: false,
        });
        if (!match) {
            throw "Error: No se ha podido eliminar ningún match";
        }
        
        // Eliminamos la notificación
        const removal = await Notification.deleteOne({
            type: "Grafiti similar detectado",
            grafiti: grafiti1._id,
            grafiti_2: grafiti2._id
        });
        const decrement = await User.updateOne({ _id: user._id }, {
            $inc: { notifications: -1 },
        })
        if (!removal ||
            !decrement) {
            console.error("No se ha podido eliminar la notificación");
        }
        
        console.error("Listo");
        return res.status(200).json({
            success: true,
            message: "Se ha eliminado el match exitosamente",
        });
        
    } catch (error) {
        console.error("Error en notConfirmMatch: " + error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }

};


/**
 * Elimina un match
 */
 const removeMatch = async (req, res) => {

    try {
        
        const user = req.user;
        const { match_id } = req.params;
        
        if(!user || !match_id) {
            throw "Error: el formato recibido es incorrecto";
        }
        
        const match = await Match.findById(match_id);
        if(!match) {
            throw "Error: el match no está en la base de datos";
        }
        const user1 = match.establishedBy;
        const user2 = match.otherUser;
        
        // Comprobamos que el usuario que elimina el match sea un propietario del match
        if(!user1.equals(user._id) && !user2.equals(user._id)) {
            throw "Error: el usuario no corresponde con ningun participante del match";
        }
        
        // Eliminamos el match
        const matchRemoved = await Match.findByIdAndDelete(match_id);
        if (!matchRemoved) {
            throw "Error: No se ha podido eliminar ningún match";
        }
        
        if(!match.confirmed) {
            console.log("Eliminamos la notificacion 0")
            // Eliminamos la notificación
            console.log(match.grafiti_2);
            console.log(match.grafiti_1);
            const removal = await Notification.deleteOne({
                type: "Grafiti similar detectado",
                grafiti: match.grafiti_2,
                grafiti_2: match.grafiti_1
            });
            const decrement = await User.updateOne({ _id: user._id }, {
                $inc: { notifications: -1 },
            });
            console.log("Eliminada la notificacion 1");
            if (!removal ||
                !decrement) {
                console.error("NO SE HA ELIMINADO")
                throw "No se ha podido eliminar la notificación";
            }
            console.log(removal);
            console.log(decrement);
        }
        
        console.error("Listo");
        return res.status(200).json({
            success: true,
            message: "Se ha eliminado el match exitosamente",
        });
        
    } catch (error) {
        console.error("Error en removeMatch: " + error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }

};

/**
 * Ejecuta la búsqueda inversa y almacena los resultados
 * @param {*} grafiti 
 */
const execReverseSearch = async (grafiti) => {
    
};

/**
 * Devuelve un lote de imágenes
 */
const getSearchBatch = async (req, res) => {
    try {

        // Recogemos los parámetros de la consulta
        const body = req.body;
        const { minDate, maxDate, searchZone, skip, limit } = body;
        const userId = body.self ? req.user._id : null;
        
        // Obtenemos los grafitis
        const grafitis = await getFilteredGrafitis(minDate, maxDate, searchZone, userId, skip, limit);
        
        // Devolvemos los resultados
        return res.status(201).json({
            success: true,
            message: "Consulta exitosa",
            images: grafitis.grafitis,
            nGrafitis: grafitis.nGrafitis,
            limitReached: grafitis.limitReached,
        });

    } catch (error) {
        console.error("Error en getBatch: " + error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }
};

/**
 * Devuelve un lote de imágenes
 */
const getBatch = async (req, res) => {
    try {

        // Recogemos los parámetros de la consulta
        const body = req.body;
        const { minDate, maxDate, searchZone, skip, limit } = body;
        const userId = body.self ? req.user._id : null;
        
        // Obtenemos los grafitis
        const grafitis = await getFilteredGrafitis(minDate, maxDate, searchZone, userId, skip, limit);
        
        // Devolvemos los resultados
        return res.status(201).json({
            success: true,
            message: "Consulta exitosa",
            images: grafitis.grafitis,
            nGrafitis: grafitis.nGrafitis,
            limitReached: grafitis.limitReached,
        });

    } catch (error) {
        console.error("Error en getBatch: " + error);
        return res.status(400).json({
            success: false,
            message: error,
        });
    }
};

/**
 * Devuelve un lote de imágenes
 * @param {String|Date} minDate - Límite inferior de fecha de captura, puede estar a null.
 * @param {String|Date} maxDate - Límite superior de fecha de captura, puede estar a null.
 * @param {Object} searchZone - Objeto que incluye los atributos lng, lat y radio (kms), puede estar a null.
 * @param {String|Mongoose.Schema.ObjectId} userId - Usuario del que recoger los grafitis, si es null, se recogerán de toda la BD.
 * @param {Number} skp - Cuántos grafitis saltarnos, 0 o null para ninguno.
 * @param {Number} lim - Límite de grafitis a devolver, 0 o null para devolver los restantes.
 * @returns Objeto con los atributos grafitis y nGrafitis
 */
const getFilteredGrafitis = async (minDate, maxDate, searchZone, userId, skp, lim) => {
    const skip = skp? skp : 0;
    const limit = lim? lim : 0;
    try {

        // Creamos la pipeline para la aggregation
        const pipeline = [];
        
        const match_filter = {};
        match_filter["$match"] = { "deleted": false };
        
        // Si el grafiti debe ser del propio usuario
        if(userId) {
            match_filter["$match"]["user"] = userId;
        }
        // Si se filtra por fecha minima
        if(minDate) {
            match_filter["$match"]["uploadedAt"] = { $gte: new Date(minDate) };
        }
        // Si se filtra por fecha máxima
        if(maxDate) {
            if(match_filter["$match"]["uploadedAt"]) {
                match_filter["$match"]["uploadedAt"]["$lt"] = new Date(maxDate);
            } else {
                match_filter["$match"]["uploadedAt"] = { $lt: new Date(maxDate) };
            }
        }
        // Añadimos los filtros
        pipeline.push(match_filter);
        
        // Descartamos los atributos irrelevantes
        pipeline.push({ 
            "$unset" : [ "featureMap", "serverName", "deleted", "lastModified", "relativePath", "absolutePath", "orientation", "rotation", "thumbnail", "__v" ]
        });
        
        // Si se filtra por zona
        if (searchZone) {
            // Hacemos el left join
            pipeline.push({ 
                "$lookup" : { 
                    "from" : "locations", 
                    "let" : { 
                        "locationId" : "$gps"
                    }, 
                    "pipeline" : [
                        { 
                            "$geoNear" : { 
                                "near" : { 
                                    "type" : "Point", 
                                    "coordinates" : [
                                        searchZone.lng, 
                                        searchZone.lat
                                    ]
                                }, 
                                "distanceField" : "distance.calculated", 
                                "spherical" : true, 
                                "maxDistance" : (searchZone.radio * 1000), 
                                "key" : "location", 
                                "includeLocs" : "distance.point", 
                                "uniqueDocs" : false
                            }
                        }, 
                        { 
                            "$match" : { 
                                "$expr" : { 
                                    "$eq" : [
                                        "$_id", 
                                        "$$locationId"
                                    ]
                                }
                            }
                        }
                    ], 
                    "as" : "position"
                }
            });
            // Desplegamos el array
            pipeline.push({ 
                "$unwind" : { 
                    "path" : "$position", 
                    "preserveNullAndEmptyArrays" : false
                }
            });
            // Desechamos los atributos irrelevantes
            pipeline.push({ 
                "$unset" : [ "position._id", "position.location.type", "position.grafiti", "position.__v", "position.createdAt" ]
            });
        }
        
        // Desechamos atributos irrelevantes
        pipeline.push({ 
            "$unset" : [ "gps" ]
        });
        
        // Ordenamos por fecha de captura/subida
        pipeline.push({ 
            "$sort" : { "dateTimeOriginal" : -1 }
        });
        
        const skip_limit = [{ "$skip": skip }];
        if(limit > 0) {
            skip_limit.push({"$limit": limit})
        }
        // Generamos el resultado y el total
        pipeline.push({
            "$facet" : {
                "nGrafitis": [{ "$count": "count"}],
                "grafitis" : skip_limit,
            } 
        });
        
        // Ejecutamos la consulta
        const grafitis = await Grafiti.aggregate(pipeline);
        
        var results = null;
        if(!grafitis) {
            throw "Sin resultados";
        }
        if(grafitis.length == 1) {
            // Incluimos los grafitis en el resultado
            results = grafitis[0]; 
            // Incluimos el número total de grafitis que cumplen el filtro de búsqueda
            results.nGrafitis = results.nGrafitis.length == 1? results.nGrafitis[0].count : 0;
        }
        
        // Devolvemos los resultados
        return results;

    } catch (error) {
        console.error("Error en getFilteredGrafitis: " + error);
        return null;
    }
};

/** Función que empaqueta las imágenes seleccionadas y un archivo csv con sus datos y lo almacena temporalmente
*/ 
const prepareDownloadBatch = async (req, res) => {
    console.log("Prepara descarga");
    
    try {
    
        // Comprobamos la información recibida
        const body = req.body;
        if(!body) {
            throw "Falta el cuerpo del mensaje";
        }
        if(!body.ids) {
            throw "No se han especificado los archivos a descargar";
        }
        const ids = body.ids;
        if(ids.length < 1) {
            throw "El array de ids no puede estar vacío";
        }
        
        // Preparamos las variables del socket
        const prevPerc = 10.0;
        const step = 90.0 / (ids.length); // Sumamos los pasos extra
        var index = 1;
        // Iniciamos el socket
        console.log("USER: ", req.user);
        const socketid = Sockets.connectedUsers[req.user.id+":download-batch"].id;
        function emitStep(index, info = null) {
            req.app.io.to(socketid).emit("download-batch:step", 
            { 
                percentage: ((index * step)+prevPerc).toFixed(2),
                info
            });
        }
        function emitSemiStep(index, percentage, info = null) {
            req.app.io.to(socketid).emit("download-batch:step", 
            { 
                percentage: (((index - 1) * step + percentage * step)+prevPerc).toFixed(2),
                info,
            });
        }
        function emitPercentage(percentage, info = null) {
            req.app.io.to(socketid).emit("download-batch:step", 
            { 
                percentage: (percentage).toFixed(2),
                info,
            });
        }
        
        emitPercentage(5, "Recopilando información");
        
        // Obtenemos los grafitis de la BD
        const files = await Grafiti.find({
            deleted: false,
            _id: { $in: ids },
        }, /*{ originalName: 1, absolutePath: 1, serverName: 1 }*/);
        if(!files) {
            throw "No se han encontrado";
        }
        
        // Creamos un nombre temporal para el archivo
        var fileName, fileTmpPath, filePath;
        do {
            fileName = uuidv4();
            fileTmpPath = path.resolve(`src/tempfiles/downloads/temp/${fileName}`);
            filePath = path.resolve(`src/tempfiles/downloads/${fileName}.zip`);
            // Comprobamos que sea único
        } while (fs.existsSync(filePath) || fs.existsSync(fileTmpPath));
        
        // Iniciamos los objetos de compresión
        var output = fs.createWriteStream(filePath);
        var archive = archiver("zip", {
            gzip: true,
            zlib: { level: 9 } // Nivel de compresión
        });
        archive.on("error", function(error) {
            output.end
            fs.removeSync(filePath);
            throw error;
        });
        // Conectamos la entrada al fichero de salida
        archive.pipe(output);
        
        // Cuando un archivo se agregue notificamos al usuario
        emitPercentage(9, "Comprimiendo archivos");
        archive.on("entry", (entry) => {
            emitStep(index, `Comprimiendo imagen ${index}/${ids.length}`);
            index++;
        });
        
        // Metemos todos los archivos en el paquete
        for(const file of files) {
            archive.file(file.absolutePath, { name: file.serverName });
        }
        
        /*
        // Añadimos el CSV con la información de los grafitis descargados
        const csv = new ObjectsToCsv(files);
        archive.append(await csv.toString(), { name: "info.csv" });
        */
        
        // Esperamos a que la compresión acabe
        await archive.finalize();
        
        // Establecemos el temporizador para eliminar los archivos temporales
        const timeOutHrs = 2; // Dos horas
        setTimeout(() => {
            console.log(`FS + Cron     => Fichero temporal ${fileName}.zip eliminado tras ${timeOutHrs} horas`)
            fs.removeSync(filePath);
        }, (1000 * 3600 * timeOutHrs));
        
        emitPercentage(100, "Finalizado");
        
        // Devolvemos el id del archivo generado
        return res.status(200).json({
            success: true,
            message: "Archivo listo",
            fileId: fileName,
        });
    
    } catch (error) {
        const message = `Error preparando la descarga: ` + error;
        console.error(message);
        return res.status(400).json({
            success: false,
            message,
        });
    }
};

/** Función que devuelve el paquete creado para que el usuario lo descargue
*/ 
const downloadBatch = (req, res) => {
    const filePath = path.resolve(`src/tempfiles/downloads/${req.params.file_id}.zip`);
    
    if(!fs.existsSync(filePath)){
        console.error("Archivo de descarga no encontrado");
        return res.status(404).render("404.ejs", { titulo: "Error 404", user: req.user? req.user : null, index: 0 });
    }
    
    return res.download(path.resolve(filePath));
};

/** 
 * Función que elimina los ficheros temporales de descargas
*/ 
const removeTemporaryDownloadFiles = () => {
    const tmpDownloadDir = path.resolve("src/tempfiles/downloads/");
    if (!fs.existsSync(tmpDownloadDir)){
        if(!fs.existsSync(path.resolve("src/tempfiles/"))) {
            fs.mkdirSync(path.resolve("src/tempfiles/"));
        }
        fs.mkdirSync(tmpDownloadDir);
    }
    const files = fs.readdirSync(tmpDownloadDir);
    
    for(const file of files) {
        const filePath = path.join(tmpDownloadDir, file);
        console.log("=> Eliminando fichero temporal ", file, " ["+filePath+"]");
        fs.removeSync(filePath);
    }
};

/** 
 * Función que elimina los ficheros temporales de búsqueda
 */
const removeTemporarySearchFiles = () => {
    const tmpSearchesDir = path.resolve("src/tempfiles/searches/");
    if (!fs.existsSync(tmpSearchesDir)){
        if(!fs.existsSync(path.resolve("src/tempfiles/"))) {
            fs.mkdirSync(path.resolve("src/tempfiles/"));
        }
        fs.mkdirSync(tmpSearchesDir);
    }
    const files = fs.readdirSync(tmpSearchesDir);
    
    for(const file of files) {
        const filePath = path.join(tmpSearchesDir, file);
        console.log("=> Eliminando fichero temporal ", file, " ["+filePath+"]");
        fs.removeSync(filePath);
    }
};


module.exports = {
    get,
    getThumbnail,
    getInfo,
    upload,
    update,
    remove,
    removeBatch,
    countOf,
    deleteUserGrafitis,
    getIndexGrafitis,
    getIndexStats,
    getGrafitiById,
    getGrafitisWithGPS,
    getMatches,
    setMatch,
    confirmMatch,
    notConfirmMatch,
    removeMatch,
    getSearchBatch,
    execReverseSearch,
    getBatch,
    getFilteredGrafitis,
    prepareDownloadBatch,
    downloadBatch,
    removeTemporaryDownloadFiles,
    removeTemporarySearchFiles
};