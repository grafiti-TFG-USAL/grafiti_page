const express = require("express");
const { validateToken } = require("../controllers/user.controller.js")

const routerValidateMiddleware = express.Router();
// TODO: probar a integrar el middleware validate token en todas las rutas hijas de usuario

const router = express.Router();

// RUTAS PARA USUARIOS AUTENTICADOS "/usuario"

// Página de bienvenida al usuario (<host>/usuario)
router.get("/", validateToken, (req, res) => {
    res.render("./users/auth/user-index.ejs", { titulo: "Grafiti Page", user: req.user });
});

module.exports = router;