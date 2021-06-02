const Grafiti = require("../models/grafiti.model");
const path = require("path");

const index = async (req, res) => {
    // Obtenemos las 20 imagenes más recientemente subidas
    const images = await Grafiti.find({ userId: req.user._id, deleted: false }, { _id: 1, relativePath: 1 , serverName: 1 , uniqueId: 1}).sort({ uploadedAt: -1 }).limit(20);
    res.render("user/index.ejs", { titulo: "Bienvenido", user: req.user, images });
};

// Lleva al usuario a la página descriptiva del grafiti seleccionado
const grafitiDesc = async (req, res) => {

    // Obtenemos el id de los parámetros
    const { grafiti_id } = req.params;

    // Obtenemos el grafiti correspondiente a la id
    const grafiti = await Grafiti.findOne({ _id: grafiti_id });

    // Si no existe el grafiti cargamos la 404
    if (!grafiti)
        res.render("../views/404.ejs");
    else if (grafiti.deleted)
        res.render("../views/404.ejs");
    // Si existe cargamos la página descriptiva
    else
        res.render("../views/user/grafiti-edit.ejs", { user: req.user, grafiti, maps_key: process.env.GMAPS_API_KEY });

};

module.exports = {
    index,
    grafitiDesc
};