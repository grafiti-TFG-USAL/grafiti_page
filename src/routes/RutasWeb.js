const express = require("express");
const router = express.Router();

// RUTA RAIZ "/"

// --- RUTAS DE INICIO ---

// Página principal (<host>/)
router.get("/", (req, res) => {
    res.render("index.ejs", { titulo: "Página principal" });
});

// Servicios (<host>/servicios)
router.get("/servicios", (req, res) => {
    res.render("servicios.ejs", { titulo: "Servicios", user: req.user }); //TODO:quitar o hacer algo con user
});


// --- RUTAS DE GESTIÓN DE USUARIOS ---

// Página de registro (<host>/registro)
router.get("/registro", (req, res) => {
    res.render("user-access/signup.ejs", { titulo: "Formulario de Registro", isSignUp: true });
});

// Página de confirmación de cuenta (<host>/user-confirmed/:email)
router.get("/user-confirmed/:email", (req, res) => {
    const { email } = req.params;
    res.render("user-access/confirmed.ejs", { titulo: "Usuario confirmado", isSignUp: true, email });
});

// Página de inicio de sesión (<host>/login)
router.get("/login", (req, res) => {
    res.render("user-access/login.ejs", { titulo: "Inicie Sesión", isSignUp: false });
});


module.exports = router;