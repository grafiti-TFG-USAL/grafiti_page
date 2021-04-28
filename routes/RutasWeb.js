const express = require("express");
const router = express.Router();

// RUTA RAIZ "/"

// Rutas de navegación
router.get("/", (req, res) => {
    res.render("index.ejs", { titulo: "Página principal" });
});

router.get("/servicios", (req, res) => {
    res.render("servicios.ejs", { titulo: "Servicios" });
});

// Rutas de autenticación y registro
router.get("/registro", (req, res) => {
    res.render("users/signup.ejs", { titulo: "Formulario de Registro", isSignUp: true });
});

router.get("/login", (req, res) => {
    res.render("users/login.ejs", { titulo: "Inicie Sesión", isSignUp: false });
});

module.exports = router;