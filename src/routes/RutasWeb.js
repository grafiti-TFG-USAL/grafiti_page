const express = require("express");
const router = express.Router();
const { restorePassword } = require("../controllers/user.controller");

// RUTA RAIZ "/"

// --- RUTAS DE INICIO ---

// Página principal (<host>/)
router.get("/", (req, res) => {
    // Comprobamos si el usuario está autenticado
    if(!req.isAuthenticated()) { 
        // Si el usuario no tiene sesión iniciada, llevamos al índice principal
        res.render("index.ejs", { titulo: "Página principal" });
    } else {
        // Si el usuario tiene la sesión iniciada, le llevamos a la página principal de usuario directamente
        res.redirect("/usuario");
    }
});

// Página de bienvenida (<host>/bienvenido)
router.get("/bienvenido", (req, res) => {
    res.render("index.ejs", { titulo: "Página principal" });
});

// Servicios (<host>/servicios)
router.get("/servicios", (req, res) => {
    res.render("servicios.ejs", { titulo: "Servicios" });
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
    // Si se ha intentado acceder a zona restringida a usuarios y se ha redirigido al login, mostramos aviso
    const attempted = req.query.attempt ? true : false;
    
    res.render("user-access/login.ejs", { titulo: "Inicie Sesión", isSignUp: false, attempted });
});

// Página de recuperación de contraseña (<host>/recover)
router.get("/recover", (req, res) => {
    res.render("user-access/recover.ejs", { titulo: "Recuperación de contraseña", isSignUp: true });
});

// Página de cambio de contraseña (<host>/restorePassword/:token)
router.get("/restorePassword/:token", restorePassword);


module.exports = router;