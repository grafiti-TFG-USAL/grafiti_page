// Conexión con la base de datos MongoDB
const mongoose = require("mongoose");

const Grid = require("gridfs-stream");
const GridFsStorage = require("multer-gridfs-storage");

const crypto = require("crypto");
const path = require("path");
const multer = require("multer");

const { scheduleUnverifiedUsersRemover } = require("./cron.config.js");
const { eliminarUsuariosSinVerificar } = require("../controllers/user.controller.js");

const DB_uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster.mfvvi.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const connectDB = async () => {

    try {
        
        const connection = await mongoose.connect(DB_uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
        });

        if(connection.STATES.connected){
            console.log("Base de Datos => OK");
            scheduleUnverifiedUsersRemover(eliminarUsuariosSinVerificar);
        }else{
            console.log("Base de Datos => Error desconocido");
            process.exit(1);
        }
        
    } catch (error) {
        console.log("Base de Datos => " + error);
        process.exit(1);
    }

}
/*
// Configuración del guardado de imágenes

let gfs;
const conn = mongoose.createConnection(DB_uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
});
conn.once("open", () => {
    // Inicialización del stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("grafitis");
})

const storage = new GridFsStorage({
    url: DB_uri,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if(err) {
                    return reject(err);
                }



                console.log("File db: ", file.buffer)
                let metaData;
                if(req.body && req.body.checked){
                  metaData = true
                }



                const fileName = buf.toString("hex") + path.extname(file.originalname);
                const fileInfo = {
                    filename: fileName,
                    bucketName: "grafitis",
                    metadata: req.body
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });*/

module.exports = { 
    connectDB,
    DB_uri,
    //upload
};