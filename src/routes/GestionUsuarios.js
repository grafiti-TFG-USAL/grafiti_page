const router = require("express").Router();
const passport = require("passport");
// RUTA RAIZ "/api/users"

// Cargamos la lógica del controlador de usuarios
const UserController = require("../controllers/user.controller.js");


// REGISTRO (<host>/api/users/register)
router.post("/register", UserController.signUp);

// CONFIRMAR USUARIO (<host>/api/users/confirm/:token)
router.get("/confirm/:token", UserController.confirmUser);

// RECUPERAR CONTRASEÑA (<host>/api/users/recoverPassword)
router.post("/recoverPassword", UserController.recoverMail);

// RESTABLECER CONTRASEÑA (<host>/api/users/recoverPassword)
router.post("/resetPassword", UserController.resetPassword);

// LOGIN (<host>/api/users/login)
router.post("/login", UserController.logIn);

// LOGOUT (<host>/api/users/logout)
router.get("/logout", UserController.logOut);


module.exports = router;