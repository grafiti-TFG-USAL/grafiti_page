const express = require("express");
const router = express.Router();

// Obtenemos el middleware que nos verifica que el usuario que manda la petición está autenticado
const { estaAutenticado } = require("../config/passport.config");

// Obtenemos el controlador de grafitis
const grafitiController = require("../controllers/grafiti.controller");

// RUTAS DE LA API DE GESTIÓN DE GRAFITIS "/api/grafitis"


// Acceso a un grafiti (<host>/api/grafitis/:grafiti_id)
router.get("/:grafiti_id", grafitiController.index);

// Subida de un grafiti (<host>/api/grafitis/upload)
router.post("/upload", estaAutenticado, grafitiController.upload);

// Subida de un grafiti (<host>/api/grafitis/remove/:grafiti_id)
router.post("/remove/:grafiti_id", estaAutenticado, grafitiController.remove);

// Añadir comentario (<host>/api/grafitis/remove/:grafiti_id)
router.post("/postComment/:grafiti_id", estaAutenticado, grafitiController.postComment);

// Añadir comentario (<host>/api/grafitis/remove/:grafiti_id)
router.post("/deleteComment/:comment_id", estaAutenticado, grafitiController.deleteComment);


module.exports = router;