const express = require("express");
const app = express();

// Parsea application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
// Parsea application/json
app.use(express.json()) // Lo que antes se hacía con body-parser

// Configuración de las variables de entorno
require("dotenv").config();

// Si el hosting no lo asigna, se usa la variable de entorno
const port = process.env.PORT;

// Conexión con la base de datos MongoDB
const connectDB = require("./config/db.config.js");
connectDB();

// Motor de plantillas
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Establecemos la ruta estática (middleware)
app.use(express.static(__dirname + "/public")); // Al ir a localhost, iremos directamente a buscar el archivo index de la carpeta public

// Establecemos el motor de rutas
app.use("/", require("./routes/RutasWeb.js"));
app.use("/api/users", require("./routes/GestionUsuarios.js"));
//TODO: app.use("/grafitis", require("./router/Grafitis"));

// Establecemos la página 404
app.use((req, res, next) => {
    res.status(404).render("404", { titulo: "Error 404" });
});

// Iniciamos la escucha del servidor en el puerto designado
app.listen(port, () => {
    console.log(`Servidor      => OK (puerto ${process.env.PORT})`);
});