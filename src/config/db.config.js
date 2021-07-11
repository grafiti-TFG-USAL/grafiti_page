// Conexión con la base de datos MongoDB
const mongoose = require("mongoose");
/* 
const Grid = require("gridfs-stream");
const GridFsStorage = require("multer-gridfs-storage");

const crypto = require("crypto");
const path = require("path");
const multer = require("multer"); */

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
                console.log("No se ha podido crear el usuario comunidad, finalizando servicio...")
                process.exit(1);
            } else {
                console.log("Base de Datos => Usuario comunidad creado");
            }
        }

    } catch (error) {
        console.log("Se ha producido un error al inicializar la base de datos: ", error);
        console.log("Finalizando servicio...");
        process.exit(1);
    }

};

module.exports = {
    connectDB,
    DB_uri,
};