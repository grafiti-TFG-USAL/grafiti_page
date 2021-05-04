const express = require("express");
const app = express();

// Gestión de sesiones
const session = require('express-session');
const passport = require('passport');

// Gestión de directorios
const path = require("path");

// Visualización de rutas
const morgan = require("morgan");

// Flash para intercambio de mensajes
const flash = require('connect-flash');

//TODO: configurar cors

// Parsea application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Configuración de las variables de entorno
require("dotenv").config();

// Configuramos las sesiones
app.use(session({
  secret: process.env.TOKEN_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Iniciamos passport
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Visualización de peticiones
app.use(morgan("dev"));

// Definimos middleware para gestión de usuarios
app.use((req, res, next) => {
  app.locals.signupMessage = req.flash('signupMessage');
  app.locals.loginMessage = req.flash('loginMessage');
  app.locals.user = req.user;
  //console.log(app.locals); //TODO: borrar
  next();
});

// Parsea application/json
app.use(express.json()) // Lo que antes se hacía con body-parser

// Si el hosting no lo asigna, se usa la variable de entorno
const port = process.env.PORT;

// Conexión con la base de datos MongoDB
const connectDB = require("./config/db.config.js");
connectDB();

// Motor de plantillas
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Establecemos la ruta estática (middleware) //TODO: si al final no lo uso, borrar
app.use(express.static(__dirname + "/public")); // Al ir a localhost, iremos directamente a buscar el archivo index de la carpeta public

// Establecemos el motor de rutas
app.use("/", require("./routes/RutasWeb.js"));
app.use("/api/users", require("./routes/GestionUsuarios.js"));
app.use("/usuario", require("./routes/UsuariosAutenticados.js"));
//TODO: app.use("/grafitis", require("./router/Grafitis"));

// Establecemos la página 404
app.use((req, res) => {
    res.status(404).render("404", { titulo: "Error 404" });
});

// Iniciamos la escucha del servidor en el puerto designado
app.listen(port, () => {
    console.log(`Servidor      => OK (puerto ${process.env.PORT})`);
});