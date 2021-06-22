const Grafiti = require("../models/grafiti.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const { 
    getIndexGrafitis, 
    getGrafitiById, 
    getGrafitiPage, 
    getNumberOfPages,
    getGrafitisFilteredByGPS, 
    getNumberOfGrafitisFilteredByGPS,
    getGrafitisFilteredByDate,
    getNumberOfGrafitisFilteredByDate,
    getGrafitisFilteredByGPSAndDate,
    getNumberOfGrafitisFilteredByGPSAndDate
} = require("./grafiti.controller");
const { timeAgo } = require("../helpers/moment");

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
    else {
        const time = timeAgo(grafiti.uploadedAt);
        res.render("../views/user/grafiti-desc.ejs", { user: req.user, timeAgo: time, grafiti, maps_key: process.env.GMAPS_API_KEY });
    }

};

/**
 * Si hay un grafiti_id en req.params, busca que el grafiti se corresponda con el usuario que tiene la sesión loggeada.
 */
const showGrafiti = async (req, res, next) => {

    try {
        // Buscamos el grafiti en la base
        //var grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id });
        var grafiti = await Grafiti.findOne({ _id: req.params.grafiti_id }).populate("gps", { location: 1 });

        // Si el grafiti no existe, está borrado o no pertenece al usuario
        if (!grafiti) {
            console.log("No grafiti")
            return res.render("../views/404");
        }
        else if (grafiti.deleted) {
            console.log("Grafiti deleted")
            return res.render("../views/404");
        }
        else{
            
            /*if(grafiti.gps){
                const grafitiWithGPS = await grafiti.populate("gps", { location: 1 }).execPopulate();
                if(grafitiWithGPS){
                    grafiti = grafitiWithGPS;
                }
            }*/
            //console.log(grafiti);
            
            // Si el grafiti no es suyo, cargamos la página de descripción
            if (!grafiti.user.equals(req.user._id)) {
                grafitiDesc(req, res);
            }
            // Si el grafiti es suyo, cargamos la página de edición
            else {
                grafitiEdit(req, res); //TODO: falta el await?
            }
        } 

    } catch (error) {
        console.log("Error en showGrafiti: ", error);
        return null;
    }

};

/**
 * Muestra los grafitis del usuario
 */
const userGrafitis = async (req, res) => {

    const resultsPerPage = 12;
    
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
    console.log("Query: ", query);
    if (query.page) delete query.page;
    const queryKeys = Object.keys(query);
    var queryString = "";
    for (let index = 0; index < queryKeys.length; index++) {
        const key = queryKeys[index];
        const element = query[key];
        if(index == 0){
            queryString = "?";
        }else{
            queryString += "&";
        }
        queryString += `${key}=${element}`;
    }
    console.log("QueryLength: ", queryKeys.length);
    console.log("QueryString: ", queryString);

    try {

        // Resultados filtrados por zona y fecha
        if ((req.query.lat && req.query.lng && req.query.radio) && (req.query.minDate || req.query.maxDate)) {

            const lat = req.query.lat;
            const lng = req.query.lng;
            const radio = req.query.radio;
            
            const minDate = req.query.minDate? new Date(req.query.minDate) : null;
            const maxDate = req.query.maxDate? new Date(req.query.maxDate) : null;
            
            const grafitis = await getGrafitisFilteredByGPSAndDate(lat, lng, radio, minDate, maxDate, pagina, resultsPerPage, req.user._id);
            if(!grafitis) {
                return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const nGrafitis = await getNumberOfGrafitisFilteredByGPSAndDate(lat, lng, radio, minDate, maxDate, req.user._id);
            if(nGrafitis < 1) {
                return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const limPages = Math.ceil(nGrafitis / resultsPerPage);
            
            console.log("Pagina ", pagina, " de ", limPages, " - Hay ", nGrafitis, " grafitis");
            return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });

        } else
        // Resultados filtrados por zona
        if (req.query.lat && req.query.lng && req.query.radio) {

            const lat = req.query.lat;
            const lng = req.query.lng;
            const radio = req.query.radio;
            
            const grafitis = await getGrafitisFilteredByGPS(lat, lng, radio, pagina, resultsPerPage, req.user._id);
            if(!grafitis) {
                return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const nGrafitis = await getNumberOfGrafitisFilteredByGPS(lat, lng, radio, req.user._id);
            if(nGrafitis < 1) {
                return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const limPages = Math.ceil(nGrafitis / resultsPerPage);
            
            console.log("Pagina ", pagina, " de ", limPages, " - Hay ", nGrafitis, " grafitis");
            return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });

        } else
        // Resultados filtrados por fecha
        if (req.query.minDate || req.query.maxDate) {

            const minDate = req.query.minDate? new Date(req.query.minDate) : null;
            const maxDate = req.query.maxDate? new Date(req.query.maxDate) : null;
            
            const grafitis = await getGrafitisFilteredByDate(minDate, maxDate, pagina, resultsPerPage, req.user._id);
            if(!grafitis) {
                return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            console.log("Hay en el objeto", grafitis);
            
            const nGrafitis = await getNumberOfGrafitisFilteredByDate(minDate, maxDate, req.user._id);
            if(nGrafitis < 1) {
                return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const limPages = Math.ceil(nGrafitis / resultsPerPage);
            
            console.log("Pagina ", pagina, " de ", limPages, " - Hay ", nGrafitis, " grafitis");
            return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
        }
        // Resultados sin filtrar 
        else {

            // Pedimos los grafitis de la página
            const grafitis = await getGrafitiPage(pagina, resultsPerPage, req.user._id);
            if (!grafitis) {
                console.log("No se han podido recuperar los grafitis");
                return res.status(400).render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }

            // Pedimos el paginas que podemos mostrar
            const limPages = await getNumberOfPages(resultsPerPage, req.user._id);
            if (!limPages) {
                console.log("No se han podido contar los grafitis");
                return res.status(400).render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }

            console.log("Pagina ", pagina, " de ", limPages);
            return res.render("user/mis-grafitis.ejs", { titulo: "Mis Grafitis", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });

        }

    } catch (error) {
        console.log("Ha habido un error en GrafitiDB: ", error);
        return res.redirect("../usuario");
    }

};

/**
 * Muestra la Base de Datos de grafitis de todos los usuarios
 */
const grafitiDB = async (req, res) => {

    const resultsPerPage = 12;
    
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
    console.log("Query: ", query);
    if (query.page) delete query.page;
    const queryKeys = Object.keys(query);
    var queryString = "";
    for (let index = 0; index < queryKeys.length; index++) {
        const key = queryKeys[index];
        const element = query[key];
        if(index == 0){
            queryString = "?";
        }else{
            queryString += "&";
        }
        queryString += `${key}=${element}`;
    }
    console.log("QueryLength: ", queryKeys.length);
    console.log("QueryString: ", queryString);

    try {

        // Resultados filtrados por zona y fecha
        if ((req.query.lat && req.query.lng && req.query.radio) && (req.query.minDate || req.query.maxDate)) {

            const lat = req.query.lat;
            const lng = req.query.lng;
            const radio = req.query.radio;
            
            const minDate = req.query.minDate? new Date(req.query.minDate) : null;
            const maxDate = req.query.maxDate? new Date(req.query.maxDate) : null;
            
            const grafitis = await getGrafitisFilteredByGPSAndDate(lat, lng, radio, minDate, maxDate, pagina, resultsPerPage);
            if(!grafitis) {
                return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const nGrafitis = await getNumberOfGrafitisFilteredByGPSAndDate(lat, lng, radio, minDate, maxDate);
            if(nGrafitis < 1) {
                return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const limPages = Math.ceil(nGrafitis / resultsPerPage);
            
            console.log("Pagina ", pagina, " de ", limPages, " - Hay ", nGrafitis, " grafitis");
            return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });

        } else
        // Resultados filtrados por zona
        if (req.query.lat && req.query.lng && req.query.radio) {

            const lat = req.query.lat;
            const lng = req.query.lng;
            const radio = req.query.radio;
            
            const grafitis = await getGrafitisFilteredByGPS(lat, lng, radio, pagina, resultsPerPage);
            if(!grafitis) {
                return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const nGrafitis = await getNumberOfGrafitisFilteredByGPS(lat, lng, radio);
            if(nGrafitis < 1) {
                return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const limPages = Math.ceil(nGrafitis / resultsPerPage);
            
            console.log("Pagina ", pagina, " de ", limPages, " - Hay ", nGrafitis, " grafitis");
            return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });

        } else
        // Resultados filtrados por fecha
        if (req.query.minDate || req.query.maxDate) {

            const minDate = req.query.minDate? new Date(req.query.minDate) : null;
            const maxDate = req.query.maxDate? new Date(req.query.maxDate) : null;
            
            const grafitis = await getGrafitisFilteredByDate(minDate, maxDate, pagina, resultsPerPage);
            if(!grafitis) {
                return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const nGrafitis = await getNumberOfGrafitisFilteredByDate(minDate, maxDate);
            if(nGrafitis < 1) {
                return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis: [], limPages: 0, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
            }
            
            const limPages = Math.ceil(nGrafitis / resultsPerPage);
            
            console.log("Pagina ", pagina, " de ", limPages, " - Hay ", nGrafitis, " grafitis");
            return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });
        }
        // Resultados sin filtrar 
        else {

            // Pedimos los grafitis de la página
            const grafitis = await getGrafitiPage(pagina, resultsPerPage);
            if (!grafitis) {
                console.log("No se han podido recuperar los grafitis");
                return res.status(400).redirect("../usuario");
            }

            // Pedimos el paginas que podemos mostrar
            const limPages = await getNumberOfPages(resultsPerPage);
            if (!limPages) {
                console.log("No se han podido contar los grafitis");
                return res.status(400).redirect("../usuario");
            }

            console.log("Pagina ", pagina, " de ", limPages);
            return res.render("user/grafiti-db.ejs", { titulo: "Grafiti DB", pagina, grafitis, limPages, user: req.user, maps_key: process.env.GMAPS_API_KEY, query: queryString });

        }

    } catch (error) {
        console.log("Ha habido un error en GrafitiDB: ", error);
        return res.redirect("../usuario");
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
        if(!notification) {
            throw "No se ha encontrado la notificación";
        }
        notification.seen = !notification.seen;
        const notificationUpdated = await notification.save();
        
        // Si falla la operación lanzamos la excepción
        if(!notificationUpdated){
            throw "No se ha podido llevar a cabo la modificacion";
        }
        
        return res.status(200).json({
            success: true,
            message: "El estado seen se ha invertido",
        });
        
    } catch (error) {
        console.error("Error al alternar el estado: "+error);
        return res.status(400).json({
            success: false,
            message: "Error al alternar el estado: "+error,
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
        console.log("Notification: ", notification)
        if (!notification || notification.nModified < 1) {
            throw "No se ha modificado ninguna notificación";
        }
        
        const user = await User.findOneAndUpdate({ _id: req.user._id }, {
            $set: { notifications: 0 },
        });
        if (!user || user.notifications==0) {
            throw "No se ha modificado el conteo del usuario";
        }
        
        return res.status(200).json({
            success: true,
            message: "El estado seen se ha invertido en todas las notificaciones del usuario",
        });
        
    } catch (error) {
        console.error("Error al alternar el estado: "+error);
        return res.status(400).json({
            success: false,
            message: "Error al alternar el estado: "+error,
        });
    }
    
};

module.exports = {
    index,
    showGrafiti,
    grafitiEdit,
    grafitiDesc,
    userGrafitis,
    grafitiDB,
    grafitiMap,
    notifications,
    switchNotificationSeenState,
    switchAllNotificationsSeenState,
};