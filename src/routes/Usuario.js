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
router.get("/grafiti/:grafiti_id", grafitiController.esSuyo, userPageController.grafitiDesc);

// Perfil de usuario (<host>/usuario/perfil)
router.get("/perfil", (req, res) => {
    res.render("user/user-profile.ejs", { titulo: "Perfil de usuario", user: req.user });
});

// Subida de grafitis (<host>/usuario/subir-grafiti)
router.get("/subir-grafiti", (req, res) => {
    res.render("user/subir-grafiti.ejs", { titulo: "Subir Grafiti", user: req.user });
});



module.exports = router;