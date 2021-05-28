const Grafiti = require("../models/grafiti.model");
const path = require("path");

const index = async (req, res) => {
    // Obtenemos las 20 imagenes más recientemente subidas
    const images = await Grafiti.find({ userId: req.user._id }, { _id: 1, relativePath: 1 , serverName: 1 , uniqueId: 1}).sort({ uploadedAt: -1 }).limit(20);
    res.render("user/index.ejs", { titulo: "Bienvenido", user: req.user, images });
};

module.exports = {
    index
};