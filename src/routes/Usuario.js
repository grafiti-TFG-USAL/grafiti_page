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

// Acceso a un grafiti propio (<host>/usuario/grafiti/:grafiti_id)
router.get("/grafiti/:grafiti_id", userPageController.showGrafiti);

// Acceso a los matches de un grafiti (<host>/usuario/matches/:grafiti_id)
router.get("/matches/:grafiti_id", userPageController.showMatches);

// Grafitis del usuario (<host>/usuario/Mis-Grafitis)
router.get("/Mis-Grafitis", userPageController.userGrafitis);

// Base de Datos de Grafitis (<host>/usuario/GrafitiDB)
router.get("/GrafitiDB", userPageController.grafitiDB);

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