// Conexión con la base de datos MongoDB
const mongoose = require("mongoose");

const { scheduleUnverifiedUsersRemover } = require("./cron.config.js");
const { eliminarUsuariosSinVerificar } = require("../controllers/user.controller.js");

const DB_uri = process.env.DB_URI;

const connectDB = async () => {

    try {

        const connection = await mongoose.connect(DB_uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
        });

        if (connection.STATES.connected) {
            scheduleUnverifiedUsersRemover(eliminarUsuariosSinVerificar);

            await inicializarBase();
            
            console.log("Base de Datos => OK");

        } else {
            console.log("Base de Datos => Error desconocido");
            process.exit(1);
        }

    } catch (error) {
        console.log("Base de Datos => " + error);
        process.exit(1);
    }

}

const inicializarBase = async () => {

    try {
        
        const User = require("../models/user.model");

        const userCommunity = await User.findOne({ email: process.env.MAIL_USER });
        
        // Comprobamos que el usuario comunidad exista
        if (!userCommunity) {
            console.log("Base de Datos => No existe usuario comunidad, lo creamos");
            const bcrypt = require("bcrypt");
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash(process.env.COMMUNITY_PASSWORD, salt);
            const community = new User({
                name: "Community",
                surname: "DB",
                email: process.env.MAIL_USER,
                password,
                account_status: "VERIFIED"
            });
            const creado = await community.save();
            if (!creado) {
                console.error("No se ha podido crear el usuario comunidad, finalizando servicio...")
                process.exit(1);
            } else {
                console.log("Base de Datos => Usuario comunidad creado");
            }
            
            //TODO borrar lo de abajo console.log()
            const bcrypt2 = require("bcrypt");
            const salt2 = await bcrypt2.genSalt(10);
            const password2 = await bcrypt2.hash("holaholahola", salt);
            const antoni = new User({
                name: "Antoni",
                surname: "Tur",
                email: "lluquino@gmail.com",
                password: password2,
                account_status: "VERIFIED"
            });
            await antoni.save();
        }
        
        const Grafiti = require("../models/grafiti.model");

        const nGrafitis = await Grafiti.countDocuments();
        console.log("Base de Datos => Hay " + nGrafitis + " grafitis en la base de datos");
        
        // Comprobación necesaria para el funcionamiento del PCA
        if (nGrafitis<50) {
            console.log("Base de Datos => Cargando primeras instancias...");
            await initUpload();
            console.log("Base de Datos => Primeras instacias cargadas");
        }
        

    } catch (error) {
        console.error("Se ha producido un error al inicializar la base de datos: ", error);
        console.error("Finalizando servicio...");
        process.exit(1);
    }

};

const Grafiti = require("../models/grafiti.model");
const Location = require("../models/location.model");
const User = require("../models/user.model");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const exifr = require("exifr");
const imageThumbnail = require("image-thumbnail");
const { system } = require("faker");
/**
 * Subida de un conjunto de imágenes al servidor
 */
const initUpload = async () => {

    const user = await User.findOne({ email: process.env.MAIL_USER });
    
    if(fs.existsSync(path.resolve("src/models/ML/features.pkl"))) {
        await fs.removeSync("src/models/ML/features.pkl");
    }
    if(fs.existsSync(path.resolve("src/models/ML/images.pkl"))) {
        await fs.removeSync("src/models/ML/images.pkl");
    }
    if(fs.existsSync(path.resolve("src/models/ML/pca.pkl"))) {
        await fs.removeSync("src/models/ML/pca.pkl");
    }
    if(fs.existsSync(path.resolve("src/models/ML/pca_features.pkl"))) {
        await fs.removeSync("src/models/ML/pca_features.pkl");
    }
    
    const files_fs = fs.readdirSync("src/models/ML/firstInstances");
    const files = [];
    
    for(const file of files_fs) {
        files.push({
            mimetype: "image/jpeg",
            originalname: file,
            path: "src/public/uploads/temp/" + file,
        });
        await fs.copyFileSync("src/models/ML/firstInstances/" + file, "src/public/uploads/temp/" + file);
    }
    
    const py_args = ["run", "-n", process.env.CONDA_ENV, "python", "src/controllers/python/feature-extraction.py", "vgg16"];
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
                await fs.renameSync(imgTempPath, imgTargetPath);

                // Extraemos metadatos del archivo
                var buffer = fs.readFileSync(imgTargetPath);
                const stats = fs.statSync(imgTargetPath);
                if (!buffer || !stats) {
                    message = "Fallo al obtener metadatos de imagen";
                    console.error("Error al extraer metadatos: ", message);
                    await fs.unlink(imgTargetPath);
                    break;
                }

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

                const image = new Grafiti({
                    originalName: file.originalname,
                    user: user._id,
                    serverName: imgUniqueName + imgExt,
                    relativePath: imgRelativePath,
                    absolutePath: imgTargetPath,
                    description,
                    orientation,
                    rotation,
                    thumbnail,
                    dateTimeOriginal,
                });

                const imageSaved = await image.save();

                if (!imageSaved) {
                    message = "Error al subir las imágenes a la base: imagen no almacenada";
                    console.error(message);
                    break;
                }

                if (gps) {
                    const location = new Location({
                        grafiti: imageSaved._id,
                        location: gps,
                    });
                    const locationSaved = await location.save();
                    if (!locationSaved) {
                        message = "Error al subir las imágenes a la base: ubicación de la imagen no almacenada";
                        console.error(message);
                        break;
                    }

                    imageSaved["gps"] = locationSaved._id;
                    const imageUpdated = await imageSaved.save();
                    if (!imageUpdated) {
                        message = "Error al subir las imágenes a la base: ubicación de la imagen no almacenada";
                        console.error(message);
                        await fs.unlink(imgTargetPath);
                        await locationSaved.delete();
                        break;
                    }
                }
                
                py_args.push(imgUniqueName + imgExt);

            } else {
                message = "Solo puede subir imágenes del tipo especificado";
                console.error("Error: ", message);
                await fs.unlink(imgTargetPath);
                break;
            }

        } catch (error) {
            message = "Error al subir las imágenes a la base => " + error;
            console.error(message);
            await fs.unlink(imgTargetPath);
            break;
        }
    } // Hasta aquí el for()

    try {
        // VERSIÓN SÍNCRONA
        const spawn = require("child_process").spawnSync;
        const pythonProcess = await spawn("conda", py_args);
        if(pythonProcess.status == 1){
            console.error(pythonProcess.stderr.toString());
            console.log(pythonProcess.stdout.toString());
            throw "fallo en la IA, compruebe que existe el fichero vgg16.h5 con el modelo ImageNet"
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
    
};

module.exports = {
    connectDB,
    DB_uri,
};