const router = require("express").Router();

// Obtenemos el middleware que nos verifica que el usuario que manda la petición está autenticado
const { estaAutenticado } = require("../config/passport.config");

// Cargamos la lógica del controlador de usuarios
const UserController = require("../controllers/user.controller.js");


// RUTA RAIZ "/api/users"


// REGISTRO (<host>/api/users/register)
router.post("/register", UserController.signUp);

// CONFIRMAR USUARIO (<host>/api/users/confirm/:token)
router.get("/confirm/:token", UserController.confirmUser);

// RECUPERAR CONTRASEÑA (<host>/api/users/recoverPassword)
router.post("/recoverPassword", UserController.recoverMail);

// RESTABLECER CONTRASEÑA (<host>/api/users/resetPassword)
router.post("/resetPassword", UserController.resetPassword);

// CAMBIAR CONTRASEÑA (<host>/api/users/changePassword)
router.post("/changePassword", estaAutenticado, UserController.changePassword);

// CAMBIAR CONFIGURACIÓN DE NOTIFICACIONES POR EMAIL (<host>/api/users/changeEmailNotificationsConfig/)
router.post("/changeEmailNotificationsConfig/", estaAutenticado, UserController.changeNotificationConfig);

// LOGIN (<host>/api/users/login)
router.post("/login", UserController.logIn);

// LOGOUT (<host>/api/users/logout)
router.get("/logout", UserController.logOut);

// ELIMINAR USUARIO (<host>/api/users/removeUser)
router.post("/removeUser", estaAutenticado, UserController.removeUser);


module.exports = router;