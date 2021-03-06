const express = require("express");
const app = express();

// Gestión de sesiones
const session = require('express-session');

// Gestión de directorios
const path = require("path");

// Visualización de rutas
const morgan = require("morgan");

// Control de origenes cruzados
const cors = require("cors");

// Parsea application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Configuración de las variables de entorno
const dotenv = require("dotenv");
dotenv.config();

// Configuramos las sesiones
const passportSessions = require("./config/sessions.config.js");
passportSessions(app, session);

const { envBoolean } = require("./helpers/env-bool");
// Visualización de peticiones
if(envBoolean("MORGAN")){
    console.log("Morgan        => ON")
    app.use(morgan("dev"));
}

// Parsea application/json
app.use(express.json()) // Lo que antes se hacía con body-parser

const { 
    removeTemporaryUploadFiles, 
    removeTemporaryDownloadFiles, 
    removeTemporarySearchFiles 
} = require("./controllers/grafiti.controller");

// Conexión con la base de datos MongoDB
removeTemporaryUploadFiles("src/public/uploads/temp");
const { connectDB } = require("./config/db.config.js");
connectDB();

// Comprobar el sistema de archivos
const { initFS } = require("./config/fs.config.js");
initFS();

// Configuramos los cors
const allowedOrigins = [`http://localhost:${process.env.PORT}`, 'https://grafiti-page.herokuapp.com'];

// Motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Establecemos la ruta estática
app.use(express.static(path.join(__dirname, "public")));

// Establecemos el motor de rutas
const routes = require("./config/router.config.js");
// En router.config hemos establecido los routers
routes(app);

// Configuramos la página 404
app.use((req, res) => {
    return res.status(404).render("404.ejs", { titulo: "Error 404", user: req.user? req.user : null, index: 0 });
});

// Comprobamos que no haya archivos temporales en el directorio de archivos temporales
removeTemporaryDownloadFiles();
removeTemporarySearchFiles();

// Si el hosting no lo asigna, se usa la variable de entorno
const port = process.env.PORT || 3000;
// Iniciamos la escucha del servidor en el puerto designado
const server = app.listen(port, () => {
    console.log(`Servidor      => OK (puerto ${port})`);
});

// Sockets para permitir conexiones e intercambio de eventos entre navegador y servidor
const sockets = require("./config/sockets.config.js");
sockets.init(server, app);