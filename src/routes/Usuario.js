const express = require("express");

const passportConf = require("../config/passport.config");

// Controlador de las páginas del usuario logeado
const userPageController = require("../controllers/userPage.controller");
// Controlador de los grafitis
const grafitiController = require("../controllers/grafiti.controller");

const router = express.Router();

// Middleware de control de sesión
router.use("/", passportConf.estaAutenticado); 
//Solo permite el paso de usuarios autenticados


// RUTAS PARA USUARIOS AUTENTICADOS "/usuario"


// Página de bienvenida al usuario (<host>/usuario)
router.get("/", userPageController.index);

// Acceso a un grafiti (<host>/usuario/grafiti/:grafiti_id)
router.get("/grafiti/:grafiti_id", userPageController.showGrafiti);

// Acceso a la página de búsqueda de imágenes similares de un grafiti (<host>/usuario/grafiti/reverse-search/:grafiti_id)
router.get("/grafiti/reverse-search/:grafiti_id", userPageController.reverseSearch);

// Acceso a los matches de un grafiti (<host>/usuario/matches/:grafiti_id)
router.get("/matches/:grafiti_id", userPageController.showMatches);

// Grafitis del usuario (<host>/usuario/Mis-Grafitis)
router.get("/Mis-Grafitis", userPageController.userGrafitis);

// Grafitis del usuario, seleccionables (<host>/usuario/Mis-Grafitis/selectable)
router.get("/Mis-Grafitis/selectable", userPageController.userGrafitis_selection);

// Base de Datos de Grafitis (<host>/usuario/GrafitiDB)
router.get("/GrafitiDB", userPageController.grafitiDB);

// Base de Datos de Grafitis, selecionables(<host>/usuario/GrafitiDB/selectable)
router.get("/GrafitiDB/selectable", userPageController.grafitiDB_selection);

// Mapa de Grafitis de la BD (<host>/usuario/GrafitiMap)
router.get("/GrafitiMap", userPageController.grafitiMap);

// Perfil de usuario (<host>/usuario/perfil)
router.get("/perfil", userPageController.userProfile);

// Notificaciones del usuario (<host>/usuario/notificaciones)
router.get("/notificaciones", userPageController.notifications);

// Subida de grafitis (<host>/usuario/subir-grafiti)
router.get("/subir-grafiti", (req, res) => {
    res.render("user/subir-grafiti.ejs", { titulo: "Subir Grafitis", user: req.user });
});



module.exports = router;