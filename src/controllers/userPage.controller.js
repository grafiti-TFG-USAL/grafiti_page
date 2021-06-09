const Grafiti = require("../models/grafiti.model");
const path = require("path");
const { getIndexGrafitis, getGrafitiById, getGrafitiPage, getNumberOfPages } = require("./grafiti.controller");
const { time } = require("console");

// Renderiza el índice/dashboard del usuario
const index = async (req, res) => {

    // Obtenemos las 20 imagenes más recientemente subidas
    const images = await getIndexGrafitis(req.user._id, 24);

    res.render("user/index.ejs", { titulo: "Bienvenido", user: req.user, images });

};

// Lleva al usuario a la página descriptiva del grafiti seleccionado
const grafitiDesc = async (req, res) => {

    // Obtenemos el id de los parámetros
    const { grafiti_id } = req.params;

    // Obtenemos el grafiti correspondiente a la id
    const grafiti = await getGrafitiById(grafiti_id);

    // Si no existe el grafiti cargamos la 404
    if (!grafiti)
        res.render("../views/404.ejs");
    else if (grafiti.deleted)
        res.render("../views/404.ejs");
    // Si existe cargamos la página descriptiva
    else
        res.render("../views/user/grafiti-edit.ejs", { user: req.user, grafiti, maps_key: process.env.GMAPS_API_KEY });

};

/**
 * Muestra la Base de Datos de grafitis de todos los usuarios
 */
const grafitiDB = async (req, res) => {

    const resultsPerPage = 10;

    try {

        // Recogemos el número de página
        var pagina;
        if (!req.query.page){
            pagina = 1;
        }
        else{
            pagina = Number(req.query.page);
        }

        console.time("pedirgrafitis");

        // Pedimos los grafitis de la página
        const grafitis = await getGrafitiPage(pagina, resultsPerPage);
        if(!grafitis){
            console.log("No se han podido recuperar los grafitis");
            return res.status(400).redirect("../usuario");
        }

        console.timeEnd("pedirgrafitis");
        console.time("pedirpaginas");

        // Pedimos el paginas que podemos mostrar
        const limPages = await getNumberOfPages(resultsPerPage);
        if(!limPages){
            console.log("No se han podido contar los grafitis");
            return res.status(400).redirect("../usuario");
        }

        console.timeEnd("pedirpaginas");

        return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis, limPages, user: req.user });

    } catch (error) {
        console.log("Ha habido un error en GrafitiDB: ", error);
        return res.redirect("../usuario");
    }

};

/**
 * Muestra el mapa de los grafitis con ubicación
 */
const grafitiMap = async (req, res) => {

};

module.exports = {
    index,
    grafitiDesc,
    grafitiDB,
    grafitiMap,
};