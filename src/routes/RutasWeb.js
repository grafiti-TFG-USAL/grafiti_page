const express = require("express");
const router = express.Router();

// RUTA RAIZ "/"

// --- RUTAS DE INICIO ---

// Página principal (<host>/)
router.get("/", (req, res) => {
    if(!req.user) { //TODO: cambiar al agregar passport
        res.render("index.ejs", { titulo: "Página principal" });
    } else {
        res.redirect("/usuario");
    }
});

// Página de bienvenida (<host>/bienvenido)
router.get("/bienvenido", (req, res) => {
    res.render("index.ejs", { titulo: "Página principal" });
});

// Página de prueba (<host>/prueba)
router.get("/prueba", (req, res) => {
    req.session.cuenta = req.session.cuenta ? req.session.cuenta + 1 : 1;
    res.send(`Se ha visitado la página ${req.session.cuenta} veces`)
    //res.render("prueba.ejs");
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