const Grafiti = require("../models/grafiti.model");
const { getIndexGrafitis, getGrafitiById, getGrafitiPage, getNumberOfPages } = require("./grafiti.controller");

// Renderiza el índice/dashboard del usuario
const index = async (req, res) => {

    // Obtenemos las 20 imagenes más recientemente subidas
    const images = await getIndexGrafitis(req.user._id, 24);

    res.render("user/index.ejs", { titulo: "Bienvenido", user: req.user, images });

};

// Lleva al usuario a la página descriptiva del grafiti seleccionado
const grafitiEdit = async (req, res) => {

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
        res.render("../views/user/grafiti-desc.ejs", { user: req.user, grafiti, maps_key: process.env.GMAPS_API_KEY });

};

/**
 * Si hay un grafiti_id en req.params, busca que el grafiti se corresponda con el usuario que tiene la sesión loggeada.
 */
const showGrafiti = async (req, res, next) => {

    try {

        // Buscamos el grafiti en la base
        const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id });

        // Si el grafiti no existe, está borrado o no pertenece al usuario
        if (!grafiti) {
            console.log("No grafiti")
            return res.render("../views/404");
        }
        else if (grafiti.deleted) {
            console.log("Grafiti deleted")
            return res.render("../views/404");
        }
        // Si el grafiti no es suyo, cargamos la página de descripción
        else if (!grafiti.user.equals(req.user._id)) {
            grafitiDesc(req, res);
        }
        // Si el grafiti es suyo, cargamos la página de edición
        else {
            grafitiEdit(req, res); //TODO: falta el await?
        }

    } catch (error) {
        console.log("Error en showGrafiti: ", error);
        return null;
    }

};

/**
 * Muestra la Base de Datos de grafitis de todos los usuarios
 */
const grafitiDB = async (req, res) => {

    const resultsPerPage = 12;

    try {

        // Recogemos el número de página
        var pagina;
        if (!req.query.page){
            pagina = 1;
        }
        else{
            pagina = Number(req.query.page);
        }

        console.time("Total consulta");
        console.time("Recogida de grafitis");

        // Pedimos los grafitis de la página
        const grafitis = await getGrafitiPage(pagina, resultsPerPage);
        if(!grafitis){
            console.log("No se han podido recuperar los grafitis");
            return res.status(400).redirect("../usuario");
        }

        console.timeEnd("Recogida de grafitis");
        console.time("Calculo de páginas");

        // Pedimos el paginas que podemos mostrar
        const limPages = await getNumberOfPages(resultsPerPage);
        if(!limPages){
            console.log("No se han podido contar los grafitis");
            return res.status(400).redirect("../usuario");
        }

        console.timeEnd("Calculo de páginas");
        console.timeEnd("Total consulta");

        console.log("Pagina ", pagina, " de ", limPages);
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
    showGrafiti,
    grafitiEdit,
    grafitiDesc,
    grafitiDB,
    grafitiMap,
};