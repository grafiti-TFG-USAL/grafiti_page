const express = require("express");
const app = express();

// Gestión de sesiones
const session = require('express-session');

// Gestión de directorios
const path = require("path");

// Visualización de rutas
const morgan = require("morgan");

// Subida de imágenes al servidor
const multer = require("multer");

//TODO: configurar cors (?)

// Parsea application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Configuración de las variables de entorno
const dotenv = require("dotenv");
dotenv.config();

// Configuramos las sesiones
const passportSessions = require("./config/sessions.config.js");
passportSessions(app, session);

// Visualización de peticiones
if(process.env.MORGAN)
  app.use(morgan("dev"));

// Subida de imágenes
app.use(multer({dest: path.join(__dirname, "./public/upload/temp"), }).single("image"));
// Cuando suban una imagen se almacenará en temp

// Parsea application/json
app.use(express.json()) // Lo que antes se hacía con body-parser

// Conexión con la base de datos MongoDB
const { connectDB } = require("./config/db.config.js");
connectDB();

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
    res.status(404).render("404.ejs", { titulo: "Error 404" });
});

// Si el hosting no lo asigna, se usa la variable de entorno
const port = process.env.PORT;
// Iniciamos la escucha del servidor en el puerto designado
app.listen(port, () => {
    console.log(`Servidor      => OK (puerto ${process.env.PORT})`);
});