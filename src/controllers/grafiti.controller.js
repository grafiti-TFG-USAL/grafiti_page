const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const exifr = require("exifr");
const imageThumbnail = require("image-thumbnail");

const Grafiti = require("../models/grafiti.model");
//const User = require("../models/user.model");
const Location = require("../models/location.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");

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

const thumbnails = require("../helpers/thumbnail");
const notificationModel = require("../models/notification.model");
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

    //
    const nFiles = files.length;
    const step = 100.0 / nFiles;
    const socketid = Sockets.connectedUsers[req.user.id].id;
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
                    emitStep(index);
                    continue;
                }
                emitSemiStep(index, 0.25);

                const rotated = thumbnails.rotate(buffer, stats.size > 1024 * 1024 ? 20 : 80);
                if (rotated) {
                    buffer = rotated;
                } else {
                    //console.log("no rotado");
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
                //console.log("GPS: ", gps);
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
                        //console.log("Imagen demasiado pequeña como para usar su thumbnail")
                        thumbnail = await imageThumbnail(buffer, { percentage: 70 });
                    } else {
                        thumbnail = await imageThumbnail(buffer);
                    }
                }
                var dateTimeOriginal = null;
                if (meta.DateTimeOriginal) {
                    dateTimeOriginal = meta.DateTimeOriginal;
                }
                emitSemiStep(index, 0.7);

                const image = new Grafiti({
                    originalname: file.originalname,
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
                    console.log(message);
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
                        fileErr.push(file.originalName);
                        success = false;
                        message = "Error al subir las imágenes a la base: ubicación de la imagen no almacenada";
                        console.log(message);
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
                        console.log(message);
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
                    if(!notificacionSaved){
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
                console.log("Error: ", message);
                await fs.unlink(imgTargetPath);
                emitStep(index);
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
                        if(!removal || 
                        !decrement){
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
                        console.log("Error en la actualización de la ubicación de " + req.params.grafiti_id + ": ", resultado);
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
                    console.log("Error al actualizar: ", error);
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
                            console.log("Resultado data: ", resultado);
                            const notificacion = new Notification({
                                user: req.user.id,
                                type: "Ubicación no establecida",
                                grafiti: req.params.grafiti_id,
                                seen: false,
                            });
                            const notificacionSaved = await notificacion.save();
                            if(!notificacionSaved){
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

                // Eliminamos todas las notificaciones relativas a la imagen
                await Notification.deleteMany({ grafiti: req.params.grafiti_id });
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

        return await Grafiti.find({ user: user, deleted: getDeleted }, { _id: 1, relativePath: 1, serverName: 1, uniqueId: 1 })
            .limit(limit)
            .sort({ uploadedAt: -1 });

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

        var grafiti = await Grafiti.findOne({ _id: grafitiId, deleted: false });

        if (grafiti) {
            console.log("Hay grafiti")
            if (grafiti.gps) {
                console.log("Hay gps en grafiti");
                grafiti = await grafiti.populate("gps", { location: 1 }).execPopulate();
            }
        }

        return grafiti;

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
const getGrafitiPage = async (page, nGrafitis, user = null) => {

    try {

        var grafitis = null;
        if (!user) {
            grafitis = await Grafiti.find({ deleted: false })
                .sort({ uploadedAt: -1 })
                .skip((page - 1) * nGrafitis).limit(nGrafitis)
                .populate("user", { name: 1, surname: 1, email: 1 })
                .populate("gps", { location: 1 });
        } else {
            grafitis = await Grafiti.find({
                deleted: false,
                user
            })
                .sort({ uploadedAt: -1 })
                .skip((page - 1) * nGrafitis).limit(nGrafitis)
                .populate("user", { name: 1, surname: 1, email: 1 })
                .populate("gps", { location: 1 });
        }

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
const getNumberOfPages = async (n, user = null) => {

    try {

        var nGrafitis = 0;
        if (!user) {
            nGrafitis = await Grafiti.countDocuments({ deleted: false });
        } else {
            nGrafitis = await Grafiti.countDocuments({
                deleted: false,
                user
            });
        }

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

/**
 * Devuelve los grafitis de la base filtrados por sus coordenadas en un radio
 * @returns Grafitis filtrados por ubicación
 */
const getGrafitisFilteredByGPS = async (lat, lng, radius, page, nGrafitis, user = null) => {

    try {

        const locations = await Location.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: radius * 1000,
                    $minDistance: 0,
                }
            }
        }, { grafiti: 1 })
            .populate({
                path: "grafiti",
                model: Grafiti,
                match: { deleted: false },
                select: { _id: 1, uploadedAt: 1 }
            })
            .sort({ uploadedAt: -1 })
            .skip((page - 1) * nGrafitis)
            .limit(nGrafitis);

        const grafitiIds = locations.map((location) => { return location.grafiti._id; });

        var grafitis = null;
        if (!user) {
            grafitis = await Grafiti.find({
                _id: {
                    $in: grafitiIds
                }
            });
        } else {
            grafitis = await Grafiti.find({
                _id: {
                    $in: grafitiIds
                },
                user
            });
        }

        if (!grafitis) {
            console.log("Sin grafitis");
            return null;
        }

        return grafitis;

    } catch (error) {
        console.log("Error en getGrafitisFilteredByGPS: ", error);
        return null;
    }

};

/**
 * Devuelve el número de grafitis totales dentro del radio de búsqueda
 * @returns Número de grafitis filtrados por ubicación
 */
const getNumberOfGrafitisFilteredByGPS = async (lat, lng, radius, user = null) => {

    try {

        const locations = await Location.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: radius * 1000,
                    $minDistance: 0,
                }
            }
        }, { grafiti: 1 })
            .populate({ path: "grafiti", model: Grafiti, select: { deleted: 1, user: 1 } });

        if (!locations) {
            console.log("Sin grafitis");
            return 0;
        }

        const nGrafitis = locations.filter((grafiti) => {
            if (!user) {
                return !grafiti.grafiti.deleted;
            } else {
                return (!grafiti.grafiti.deleted && user.equals(grafiti.grafiti.user));
            }
        });

        return nGrafitis.length;

    } catch (error) {
        console.log("Error en getNumberOfGrafitisFilteredByGPS: ", error);
        return 0;
    }

};

/**
 * Devuelve los grafitis de la base filtrados por fechas
 * @returns Grafitis filtrados por fecha
 */
const getGrafitisFilteredByDate = async (minDate, maxDate, page, nGrafitis, user = null) => {

    try {

        const min_date = minDate ? minDate : new Date(-8640000000000000);
        const max_date = maxDate ? maxDate : new Date(8640000000000000);

        var grafitis = null;
        if (!user) {
            grafitis = await Grafiti.find({
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                deleted: false
            })
                .sort({ uploadedAt: -1 })
                .skip((page - 1) * nGrafitis)
                .limit(nGrafitis);
        } else {
            grafitis = await Grafiti.find({
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                user,
                deleted: false
            })
                .sort({ uploadedAt: -1 })
                .skip((page - 1) * nGrafitis)
                .limit(nGrafitis);
        }

        if (!grafitis) {
            console.log("Sin grafitis");
            return null;
        }

        return grafitis;

    } catch (error) {
        console.log("Error en getGrafitisFilteredByDate: ", error);
        return null;
    }

};

/**
 * Devuelve el número de grafitis totales dentro del límite de fecha
 * @returns Número de grafitis filtrados por fecha
 */
const getNumberOfGrafitisFilteredByDate = async (minDate, maxDate, user = null) => {

    try {

        const min_date = minDate ? minDate : new Date(-8640000000000000);
        const max_date = maxDate ? maxDate : new Date(8640000000000000);

        var nGrafitis = 0;
        if (!user) {
            nGrafitis = await Grafiti.countDocuments({
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                deleted: false
            });
        } else {
            nGrafitis = await Grafiti.countDocuments({
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                user,
                deleted: false
            });
        }

        return nGrafitis ? nGrafitis : 0;

    } catch (error) {
        console.log("Error en getNumberOfGrafitisFilteredByDate: ", error);
        return 0;
    }

};

/**
 * Devuelve los grafitis de la base filtrados por sus coordenadas en un radio y por fecha
 * @returns Grafitis filtrados por ubicación y fecha
 */
const getGrafitisFilteredByGPSAndDate = async (lat, lng, radius, minDate, maxDate, page, nGrafitis, user = null) => {

    try {

        // Obtenemos todos los grafitis dentro del radio de búsqueda
        const locations = await Location.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: radius * 1000,
                    $minDistance: 0,
                }
            }
        }, { grafiti: 1 })
            .populate({
                path: "grafiti",
                model: Grafiti,
                match: { deleted: false },
                select: { _id: 1 }
            });

        const grafitiIds = locations.map((location) => { return location.grafiti._id; });

        // Filtramos a aquellos dentro del marco temporal
        const min_date = minDate ? minDate : new Date(-8640000000000000);
        const max_date = maxDate ? maxDate : new Date(8640000000000000);

        var grafitis = null;
        if (!user) {
            grafitis = await Grafiti.find({
                _id: {
                    $in: grafitiIds
                },
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                deleted: false
            })
                .sort({ uploadedAt: -1 })
                .skip((page - 1) * nGrafitis)
                .limit(nGrafitis);
        } else {
            grafitis = await Grafiti.find({
                _id: {
                    $in: grafitiIds
                },
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                user,
                deleted: false
            })
                .sort({ uploadedAt: -1 })
                .skip((page - 1) * nGrafitis)
                .limit(nGrafitis);
        }


        if (!grafitis) {
            console.log("Sin grafitis");
            return null;
        }

        return grafitis;

    } catch (error) {
        console.log("Error en getGrafitisFilteredByGPSAndDate: ", error);
        return null;
    }

};

/**
 * Devuelve el número de grafitis totales dentro del radio de búsqueda y un marco temporal
 * @returns Número de grafitis filtrados por ubicación y fecha
 */
const getNumberOfGrafitisFilteredByGPSAndDate = async (lat, lng, radius, minDate, maxDate, user = null) => {

    try {

        const locations = await Location.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: radius * 1000,
                    $minDistance: 0,
                }
            }
        }, { grafiti: 1 })
            .populate({ path: "grafiti", model: Grafiti, select: "deleted" });

        if (!locations) {
            console.log("Sin grafitis");
            return 0;
        }

        const grafitis = locations.filter((grafiti) => {
            return !grafiti.grafiti.deleted;
        });

        const grafitiIds = locations.map((location) => { return location.grafiti._id; });

        // Filtramos a aquellos dentro del marco temporal
        const min_date = minDate ? minDate : new Date(-8640000000000000);
        const max_date = maxDate ? maxDate : new Date(8640000000000000);

        var nGrafitis = null;
        if (!user) {
            nGrafitis = await Grafiti.countDocuments({
                _id: {
                    $in: grafitiIds
                },
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                deleted: false
            });
        } else {
            nGrafitis = await Grafiti.countDocuments({
                _id: {
                    $in: grafitiIds
                },
                uploadedAt: {
                    $gte: min_date,
                    $lte: max_date,
                },
                user,
                deleted: false
            });
        }


        return nGrafitis ? nGrafitis : 0;

    } catch (error) {
        console.log("Error en getNumberOfGrafitisFilteredByGPSAndDate: ", error);
        return 0;
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
    getGrafitisFilteredByGPS,
    getNumberOfGrafitisFilteredByGPS,
    getGrafitisFilteredByDate,
    getNumberOfGrafitisFilteredByDate,
    getGrafitisFilteredByGPSAndDate,
    getNumberOfGrafitisFilteredByGPSAndDate,
};