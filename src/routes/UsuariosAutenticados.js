const express = require("express");
const { validateToken } = require("../controllers/user.controller.js")

const router = express.Router();

// Middleware de control de sesión
router.use("/", validateToken); //Solo permite el paso de usuarios autenticados

// RUTAS PARA USUARIOS AUTENTICADOS "/usuario"

// Página de bienvenida al usuario (<host>/usuario)
router.get("/", (req, res) => {
    res.render("user/index.ejs", { titulo: "Bienvenido", user: req.user });
});

// Perfil de usuario (<host>/usuario/perfil)
router.get("/perfil", (req, res) => {
    res.render("user/user-profile.ejs", { titulo: "Perfil de usuario", user: req.user });
});


module.exports = router;