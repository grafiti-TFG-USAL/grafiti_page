const multer = require("multer");

// path para extraer la extensión del archivo
const path = require("path");

// uuid para generar un código aleatorio
const { v4: uuidv4 } = require("uuid");

const fs = require("fs-extra");
if(!fs.existsSync(path.resolve("src/public/uploads/temp/"))){
    if(!fs.existsSync(path.resolve("src/public/uploads/"))){
        fs.mkdirSync(path.resolve("src/public/uploads/"));
    }
    fs.mkdirSync(path.resolve("src/public/uploads/temp/"));
}

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        // Los archivos se subirán a la carpeta temporal
        cb(null, "src/public/uploads/temp");
    },
    filename: function (req, file, cb) {
        // Creamos un identificador único para el nombre del archivo
        //const uniquePreffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const uniquePreffix = uuidv4();
        cb(null, uniquePreffix + '--' +  file.originalname.toLowerCase());
    }
});

const upload = multer({
    storage: storage,
    // Descomentar para Ponemos el límite de subida a 16 MB
    //limits: { fileSize: 1024 * 1024 * 16 },
    fileFilter: (req, file, cb) => {
        //Expresión regular
        const filetypes = /jpeg|jpg/; 
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if(mimetype && extname){
            return cb(null, true);
        }
        console.error("Mime: ", mimetype);
        console.error("Ext : ", extname);
        cb("Error: Formato de archivo no soportado");
    }
})


module.exports = upload;