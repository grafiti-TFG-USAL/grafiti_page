const { Mongoose } = require("mongoose");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const exifr = require("exifr");
const imageThumbnail = require("image-thumbnail");

const Grafiti = require("../models/grafiti.model");

const RNA = require("../config/neuralnet.config");

const get = async (req, res) => {
    const { grafiti_id } = req.params;
    const image = await Grafiti.findOne({ _id: grafiti_id }, { serverName: 1 });
    console.log(path.join(__dirname,"../public/uploads" , image.serverName))
    if(!image)
        res.sendFile(path.join(__dirname, "../public/images/image_not_found.png"));
    else
        res.sendFile(path.join(__dirname,"../public/uploads" , image.serverName));
};

const upload = async (req, res) => {
    
    const files = req.files;

    // Iniciamos la respuesta afirmativa
    var success = true;
    var message = "Subido con éxito";

    var pathArray = [];

    for(const file of files){

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
                if(!buffer){
                    success = false;
                    message = "La imagen no se ha podido leer correctamente";
                    console.log(message);
                    //TODO: eliminar las anteriores
                    return;
                }
                var meta = await exifr.parse(buffer, true);
                if (!meta){
                    meta = null;
                }
                var gps = await exifr.gps(buffer);
                if (!gps){
                    gps = null;
                }else{
                    gps = {
                        latitude: gps.latitude,
                        longitude: gps.longitude,
                        altitude: meta.GPSAltitude ? meta.GPSAltitude : null
                    };
                }
                var orientation = await exifr.orientation(buffer); 
                if (!orientation){
                    orientation = null;
                }
                var rotation = await exifr.rotation(buffer);
                if (!rotation){
                    rotation = null;
                }
                var thumbnail = await exifr.thumbnail(buffer);
                if (!thumbnail){
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

                if(!imageSaved){
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
    res.status(success? 200 : 400).json({ success, message });

};

const remove = (req, res) => {

};

const postComment = (req, res) => {

}

const deleteComment = (req, res) => {

}

module.exports = {
    get,
    upload,
    remove,
    postComment,
    deleteComment,
};