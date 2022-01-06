const Grafiti = require("../models/grafiti.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const {
    getIndexGrafitis,
    getIndexStats,
    getGrafitiById,
    getGrafitiPage,
    getNumberOfPages,
    getFilteredGrafitis,
    getBatch
} = require("./grafiti.controller");
const { timeAgo } = require("../helpers/moment");

// Renderiza el índice/dashboard del usuario
const index = async (req, res) => {

    // Obtenemos las 20 imagenes más recientemente subidas
    const images = await getIndexGrafitis(req.user._id, 12);

    const stats = await getIndexStats(req.user._id);
    console.log("STATS: ", stats);
    res.render("user/index.ejs", { titulo: "Bienvenido", user: req.user, images, stats });

};

// Lleva al usuario a la página de edición del grafiti seleccionado
const grafitiEdit = async (req, res) => {

    // Obtenemos el id de los parámetros
    const { grafiti_id } = req.params;

    // Obtenemos el grafiti correspondiente a la id
    const grafiti = await getGrafitiById(grafiti_id);

    // Si no existe el grafiti cargamos la 404
    if (!grafiti)
        res.render("../views/404.ejs", { title: "Página 404", user: req.user? req.user : null, index: 0 });
    else if (grafiti.deleted)
        res.render("../views/404.ejs", { title: "Página 404", user: req.user? req.user : null, index: 0 });
    // Si existe cargamos la página descriptiva
    else {
        const time = timeAgo(grafiti.uploadedAt < grafiti.dateTimeOriginal ? grafiti.uploadedAt : grafiti.dateTimeOriginal);
        res.render("../views/user/grafiti-edit.ejs", { user: req.user, timeAgo: time, grafiti, maps_key: process.env.GMAPS_API_KEY });
    }

};

// Lleva al usuario a la página descriptiva del grafiti seleccionado
const grafitiDesc = async (req, res) => {

    // Obtenemos el id de los parámetros
    const { grafiti_id } = req.params;

    // Obtenemos el grafiti correspondiente a la id
    const grafiti = await getGrafitiById(grafiti_id);

    // Si no existe el grafiti cargamos la 404
    if (!grafiti)
        res.render("../views/404.ejs", { title: "Página 404", user: req.user? req.user : null, index: 0 });
    else if (grafiti.deleted)
        res.render("../views/404.ejs", { title: "Página 404", user: req.user? req.user : null, index: 0 });
    // Si existe cargamos la página descriptiva
    else {
        const time = timeAgo(grafiti.uploadedAt < grafiti.dateTimeOriginal ? grafiti.uploadedAt : grafiti.dateTimeOriginal);
        res.render("../views/user/grafiti-desc.ejs", { user: req.user, timeAgo: time, grafiti, maps_key: process.env.GMAPS_API_KEY });
    }

};

/**
 * Si hay un grafiti_id en req.params, busca que el grafiti se corresponda con el usuario que tiene la sesión loggeada.
 */
const showGrafiti = async (req, res) => {

    try {
        // Buscamos el grafiti en la base
        var grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id }).populate("gps", { location: 1 });

        // Si el grafiti no existe, está borrado o no pertenece al usuario
        if (!grafiti) {
            console.error("No grafiti");
            return res.render("../views/404", { title: "Página 404", user: req.user? req.user : null, index: 0 });
        }
        else if (grafiti.deleted) {
            console.error("Grafiti deleted");
            return res.render("../views/404", { title: "Página 404", user: req.user? req.user : null, index: 0 });
        }
        else {

            // Si el grafiti no es suyo, cargamos la página de descripción
            if (!grafiti.user.equals(req.user._id)) {
                grafitiDesc(req, res);
            }
            // Si el grafiti es suyo, cargamos la página de edición
            else {
                grafitiEdit(req, res);
            }
        }

    } catch (error) {
        console.error("Error en showGrafiti: ", error);
        return null;
    }

};

/**
* Si hay un grafiti_id en req.params, busca que el grafiti se corresponda con el usuario que tiene la sesión loggeada.
*/
const reverseSearch = async (req, res) => {
    
    try {
        
        // Buscamos el grafiti en la base
        const grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id }).populate("gps", { location: 1 });
        
        // Si el grafiti no existe, está borrado o no pertenece al usuario
        if (!grafiti) {
            console.error("No grafiti");
            return res.render("../views/404", { title: "Página 404", user: req.user? req.user : null, index: 0 });
        }
        else if (grafiti.deleted) {
            console.error("Grafiti deleted");
            return res.render("../views/404", { title: "Página 404", user: req.user? req.user : null, index: 0 });
        }
        else if (!grafiti.user.equals(req.user._id)) {
            console.error("Not user");
            return res.render("../views/404", { title: "Página 404", user: req.user? req.user : null, index: 0 });
        } else {
            // Renderizamos la página de búsqueda inversa de grafitis
            const time = timeAgo(grafiti.uploadedAt < grafiti.dateTimeOriginal ? grafiti.uploadedAt : grafiti.dateTimeOriginal);
            return res.status(200).render("user/reverseSearch.ejs", { titulo: "Grafiti Reverse Search", timeAgo: time, grafiti: grafiti, grafitisFetchLimit: 25, user: req.user, maps_key: process.env.GMAPS_API_KEY });
        }
        
    } catch (error) {
        console.error("Error en image reverse search: ", error);
        return null;
    }

}
    
/**
 * Si hay un grafiti_id en req.params, busca los matches que se hayan detectado
 */
const showMatches = async (req, res) => {

    try {

        // Buscamos el grafiti en la base
        var grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id });

        // Si el grafiti no existe, está borrado o no pertenece al usuario
        if (!grafiti) {
            throw "El grafiti no existe";
        }
        else if (grafiti.deleted) {
            throw "El grafiti fue borrado";
        }
        else {

            return res.status(200).render("user/matches.ejs", { titulo: "Matches", grafiti: req.params.grafiti_id, user: req.user });
            
        }

    } catch (error) {
        console.error("Error en showMatches: ", error);
        return res.status(404).render("../views/404", { title: "Página 404", user: req.user? req.user : null, index: 0 });
    }

};

/**
 * Muestra los grafitis del usuario
 */
const userGrafitis = async (req, res) => {

    const resultsPerPage = 20;

    // Recogemos el número de página
    var pagina;
    if (!req.query.page) {
        pagina = 1;
    }
    else {
        pagina = parseInt(req.query.page);
    }

    // Recogemos el resto de elementos de la consulta para mantenerlo en la paginación
    const query = req.query;
    if (query.page) {
        delete query.page;
    }
    const queryKeys = Object.keys(query);
    var queryString = "";
    for (let index = 0; index < queryKeys.length; index++) {
        const key = queryKeys[index];
        const element = query[key];
        if (index == 0) {
            queryString = "?";
        } else {
            queryString += "&";
        }
        queryString += `${key}=${element}`;
    }

    try {
        
        var searchZone = null;
        if(query.lng && query.lat && query.radio) {
            searchZone = {
                lng: Number.parseFloat(query.lng),
                lat: Number.parseFloat(query.lat),
                radio: Number.parseFloat(query.radio),  
            };
        }
        
        const grafitis = await getFilteredGrafitis(
            query.minDate? query.minDate : null, 
            query.maxDate? query.maxDate : null, 
            searchZone, req.user._id, resultsPerPage*(pagina-1), resultsPerPage);
        
        const aux = Math.ceil(grafitis.nGrafitis / resultsPerPage);
        const limPages = aux? (aux>=0? aux : 0) : 0;
        
        return res.status(201).render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: grafitis.grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString })
            
            
    } catch (error) {
        console.error("Ha habido un error en GrafitiDB: ", error);
        return res.redirect("../usuario");
    }

};

/**
 * Muestra los grafitis del usuario, permite seleccionarlos
 */
const userGrafitis_selection = async (req, res) => {
    
    // Recogemos los parámetros de la consulta
    const queryParams = req.query;
    // Establecemos las variables del filtro
    var searchZone = null;
    if (queryParams.lat && queryParams.lng && queryParams.radio) {
        searchZone = {
            lng: Number.parseFloat(query.lng),
            lat: Number.parseFloat(query.lat),
            radio: Number.parseFloat(query.radio),  
        };
    }
    const minDate = queryParams.minDate ? queryParams.minDate : null;
    const maxDate = queryParams.maxDate ? queryParams.maxDate : null;
    // Como estamos en mis grafitis, solo buscaremos los del usuario
    const userId = req.user._id;
    
    // De cuántos en cuántos grafitis cargará la página
    const grafitisFetchLimit = 25;
    try {
        
        const grafitis = await getFilteredGrafitis(minDate, maxDate, searchZone, userId, 0, grafitisFetchLimit);
        if(!grafitis) {
            throw "No se han encontrado grafitis";
        }
        
        return res.render("user/mis-grafitis-selectable.ejs", { 
            titulo: "Mis Grafitis", 
            user: req.user, 
            grafitis: grafitis.grafitis,
            nGrafitis: grafitis.nGrafitis,
            grafitisFetchLimit
        });
    
    } catch (error) {
        console.error("Error: " + error);
        return;
    }
};

/**
 * Recoge los parámetros del usuario para mostrarlos en la página 
 */
const userProfile = async (req, res) => {

    try {

        const usuario = await User.findOne({ _id: req.user._id }, { email_notifications: 1 });
        if (!usuario) {
            throw "No se ha encontrado al usuario en la base de datos";
        } else {
            if (!usuario.email_notifications) {
                throw "El usuario no tiene establecidas las notificaciones";
            }
        }

        return res.status(200).render("user/user-profile.ejs", {
            titulo: "Perfil de usuario",
            user: req.user,
            notification_config: usuario.email_notifications
        });

    } catch (error) {
        console.error("Error al cargar la página de usuario: " + error);
        return res.status(400).json({
            success: false,
            message: "Error al cargar la página de usuario: " + error,
        });
    }
}

/**
 * Muestra la Base de Datos de grafitis de todos los usuarios
 */
const grafitiDB = async (req, res) => {

    const resultsPerPage = 20;

    // Recogemos el número de página
    var pagina;
    if (!req.query.page) {
        pagina = 1;
    }
    else {
        pagina = parseInt(req.query.page);
    }

    // Recogemos el resto de elementos de la consulta para mantenerlo en la paginación
    const query = req.query;
    if (query.page) delete query.page;
    const queryKeys = Object.keys(query);
    var queryString = "";
    for (let index = 0; index < queryKeys.length; index++) {
        const key = queryKeys[index];
        const element = query[key];
        if (index == 0) {
            queryString = "?";
        } else {
            queryString += "&";
        }
        queryString += `${key}=${element}`;
    }
    
    // Establecemos las variables del filtro
    var searchZone = null;
    if (query.lat && query.lng && query.radio) {
        searchZone = {
            lng: Number.parseFloat(query.lng),
            lat: Number.parseFloat(query.lat),
            radio: Number.parseFloat(query.radio),  
        };
    }
    const minDate = query.minDate ? query.minDate : null;
    const maxDate = query.maxDate ? query.maxDate : null;

    try {

        // Resultados filtrados por zona y fecha
        const grafitis = await getFilteredGrafitis(minDate, maxDate, searchZone, null, (pagina-1)*resultsPerPage, resultsPerPage);
        
        return res.render("user/grafiti-db.ejs", { 
            titulo: "Grafiti DB", 
            pagina, grafitis: grafitis.grafitis, 
            limPages: Math.ceil(grafitis.nGrafitis / resultsPerPage), 
            user: req.user, 
            maps_key: process.env.GMAPS_API_KEY, 
            query: queryString });

    } catch (error) {
        console.error("Ha habido un error en GrafitiDB: ", error);
        return res.redirect("../usuario");
    }

};

/**
 * Muestra la Base de Datos de grafitis de todos los usuarios, permite seleccionarlos
 */
const grafitiDB_selection = async (req, res) => {
    
    // Recogemos los parámetros de la consulta
    const queryParams = req.query;
    // Establecemos las variables del filtro
    var searchZone = null;
    if (queryParams.lat && queryParams.lng && queryParams.radio) {
        searchZone = {
            lng: Number.parseFloat(queryParams.lng),
            lat: Number.parseFloat(queryParams.lat),
            radio: Number.parseFloat(queryParams.radio),   
        };
    }
    const minDate = queryParams.minDate ? queryParams.minDate : null;
    const maxDate = queryParams.maxDate ? queryParams.maxDate : null;
    
    // De cuántos en cuántos grafitis cargará la página
    const grafitisFetchLimit = 25;
    try {
        
        const grafitis = await getFilteredGrafitis(minDate, maxDate, searchZone, null, 0, grafitisFetchLimit);
        if(!grafitis) {
            throw "No se han encontrado grafitis";
        }
        
        return res.render("user/grafiti-db-selectable.ejs", { 
            titulo: "Grafiti DB", 
            user: req.user, 
            grafitis: grafitis.grafitis,
            nGrafitis: grafitis.nGrafitis,
            grafitisFetchLimit,
        });
    
    } catch (error) {
        console.error("Error: " + error);
        return;
    }
};

/**
 * Muestra el mapa de los grafitis con ubicación
 */
const grafitiMap = async (req, res) => {

    return res.render("user/grafiti-map", { user: req.user, maps_key: process.env.GMAPS_API_KEY });

};

/**
 * Recoge las notificaciones del usuario y se las muestra
 */
const notifications = async (req, res) => {

    try {

        return res.render("user/user-notifications.ejs", { titulo: "Notificaciones", user: req.user });

    } catch (error) {
        console.error("Error al recoger las notificaciones");
    }

};

/**
 * Alterna el estado visto de la notificación
 */
const switchNotificationSeenState = async (req, res) => {

    const notificationId = req.params.notification_id;
    try {

        const notification = await Notification.findOne({ _id: notificationId }, { _id: 1, seen: 1, user: 1 });
        if (!notification) {
            throw "No se ha encontrado la notificación";
        }
        notification.seen = !notification.seen;
        const notificationUpdated = await notification.save();

        // Si falla la operación lanzamos la excepción
        if (!notificationUpdated) {
            throw "No se ha podido llevar a cabo la modificacion";
        }

        return res.status(200).json({
            success: true,
            message: "El estado seen se ha invertido",
        });

    } catch (error) {
        console.error("Error al alternar el estado: " + error);
        return res.status(400).json({
            success: false,
            message: "Error al alternar el estado: " + error,
        });
    }

};

/**
 * Cambia el estado de todas las notificaciones a visto
 */
const switchAllNotificationsSeenState = async (req, res) => {

    try {

        const notification = await Notification.updateMany({ user: req.user._id }, {
            seen: true,
        });
        //console.log("Notification: ", notification);
        if (!notification || notification.nModified < 1) {
            throw "No se ha modificado ninguna notificación";
        }

        const user = await User.findOneAndUpdate({ _id: req.user._id }, {
            $set: { notifications: 0 },
        });
        if (!user || user.notifications == 0) {
            throw "No se ha modificado el conteo del usuario";
        }

        return res.status(200).json({
            success: true,
            message: "El estado seen se ha invertido en todas las notificaciones del usuario",
        });

    } catch (error) {
        console.error("Error al alternar el estado: " + error);
        return res.status(400).json({
            success: false,
            message: "Error al alternar el estado: " + error,
        });
    }

};

module.exports = {
    index,
    showGrafiti,
    reverseSearch,
    showMatches,
    grafitiEdit,
    grafitiDesc,
    userProfile,
    userGrafitis,
    userGrafitis_selection,
    grafitiDB,
    grafitiDB_selection,
    grafitiMap,
    notifications,
    switchNotificationSeenState,
    switchAllNotificationsSeenState,
};