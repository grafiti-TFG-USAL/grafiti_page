const express = require("express");
const app = express();

// Gestión de sesiones
const session = require('express-session');

// Almacenamiento de sesiones en la bd
const MongoStore = require("connect-mongo");

// Gestión de acceso a recursos restringidos
const passport = require("passport");

// Gestión de directorios
const path = require("path");

// Visualización de rutas
const morgan = require("morgan");

//TODO: configurar cors

// Parsea application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Configuración de las variables de entorno
require("dotenv").config();

// Configuramos las sesiones
const { DB_uri } = require("./config/db.config.js");
app.use(session({
  secret: process.env.SESSION_SECRET, //salt del algoritmo de cifrado
  resave: true, //fuerza que cada llamada al servidor guarde la info de sesión sin importar si hubieron cambios
  saveUninitialized: true, //guarda en la bd el objeto vacío aunque no hubiera info en el principio
  store: MongoStore.create({ //bd para almacenar sesiones
    mongoUrl: DB_uri,
    collectionName: "sessions",
    ttl: 30 * 24 * 60 * 60, //30 días
    autoReconnect: true,
    crypto: { secret: process.env.MONGO_SESSION_SECRET },
    autoRemove: 'interval',
    autoRemoveInterval: 10 //borrar sesiones expiradas cada 10 minutos
  })
}));

app.use(passport.initialize());
app.use(passport.session());

// Visualización de peticiones
app.use(morgan("dev")); //TODO: borrar morgan al final

// Parsea application/json
app.use(express.json()) // Lo que antes se hacía con body-parser

// Si el hosting no lo asigna, se usa la variable de entorno
const port = process.env.PORT;

// Conexión con la base de datos MongoDB
const { connectDB } = require("./config/db.config.js");
connectDB();

// Motor de plantillas
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Establecemos la ruta estática (middleware) //TODO: si al final no lo uso, borrar
app.use(express.static(__dirname + "/public")); // Al ir a localhost, iremos directamente a buscar el archivo index de la carpeta public

// Establecemos el motor de rutas
app.use("/", require("./routes/RutasWeb.js")); // Paginación pública
app.use("/api/users", require("./routes/GestionUsuarios.js")); // Api de gestión de usuarios
app.use("/usuario", require("./routes/Usuario.js")); // Paginación de usuarios
//TODO: app.use("/grafitis", require("./router/Grafitis"));

// Establecemos la página 404
app.use((req, res) => {
    res.status(404).render("404.ejs", { titulo: "Error 404" });
});

// Iniciamos la escucha del servidor en el puerto designado
app.listen(port, () => {
    console.log(`Servidor      => OK (puerto ${process.env.PORT})`);
});