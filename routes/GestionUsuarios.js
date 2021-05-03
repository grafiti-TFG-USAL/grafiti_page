const router = require("express").Router();

// RUTA RAIZ "/api/users"

// Cargamos la lógica del controlador de usuarios
const UserController = require("../controllers/user.controller.js");


// REGISTRO (<host>/api/users/register)
router.post("/register", UserController.signUp);

// CONFIRMAR USUARIO (<host>/api/users/confirm/:token)
router.get("/confirm/:token", UserController.confirmUser);

// LOGIN (<host>/api/users/login)
router.post("/login", UserController.logIn);


module.exports = router;