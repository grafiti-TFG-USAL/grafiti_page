const { Mongoose } = require("mongoose");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const exif = require("exif-parser");
//const getStream = require("get-stream");

const Grafiti = require("../models/grafiti.model");

const index = (req, res) => {

};

const upload = (req, res) => {
    
    const files = req.files;

    const response = {
        success: true,
        message: "Subido con éxito"
    };

    files.forEach(async file => {

        const imgExt = path.extname(file.originalname).toLowerCase();
        const imgTempPath = file.path;
        const imgTargetPath = path.resolve(`src/public/uploads/${uuidv4()}${imgExt}`);

        const filetypes = /jpeg|jpg|png/; 
        if (filetypes.test(file.mimetype) || filetypes.test(imgExt)) {

            try {
                    
                // Movemos el archivo a la carpeta objetivo
                const fs_response = await fs.rename(imgTempPath, imgTargetPath);

                const img = await fs.readFile(imgTargetPath);
                const exifParser = exif.create(img);

                const image = new Grafiti({
                    originalname: file.originalname,
                    path: imgTargetPath,
                    metadata: exifParser.parse().tags
                });

                const imageSaved = await image.save();

                if(!imageSaved){
                    response.success = false;
                    response.message = "Error al subir las imágenes a la base: imagen no almacenada";
                    //TODO: eliminar las anteriores
                    return;
                }

            } catch (error) {
                console.log(error);
                //TODO: eliminar todas las que se hayan guardado
                response.success = false;
                response.message = "Error al subir las imágenes a la base => " + error;
            }

        }
    });
    console.log(response)
    res.status(response.success? 200 : 400).json(response);

};

const remove = (req, res) => {

};

const postComment = (req, res) => {

}

const deleteComment = (req, res) => {

}

module.exports = {
    index,
    upload,
    remove,
    postComment,
    deleteComment,
};