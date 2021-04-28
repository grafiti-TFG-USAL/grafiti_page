const express = require("express");
const app = express();

// Configuración de las variables de entorno
require("dotenv").config();

// Si el hosting no lo asigna, se usa la variable de entorno
const port = process.env.PORT;

// Conexión con la base de datos MongoDB
const mongoose = require("mongoose");
const DB_uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster.mfvvi.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(DB_uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Base de Datos => OK"))
.catch(err => console.log("Base de Datos => " + err));

// Motor de plantillas
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Establecemos la ruta estática (middleware)
app.use(express.static(__dirname + "/public"));

// Establecemos el motor de rutas
app.use("/", require("./routes/RutasWeb"));
//app.use("/grafitis", require("./router/Grafitis"));

// Establecemos la página 404
app.use((req, res, next) => {
    res.status(404).render("404", { titulo: "Error 404" });
});

// Iniciamos la escucha del servidor en el puerto designado
app.listen(port, () => {
    console.log(`Servidor      => OK (puerto ${process.env.PORT})`);
});