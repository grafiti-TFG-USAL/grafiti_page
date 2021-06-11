const express = require("express");
const router = express.Router();

// Obtenemos el middleware que nos verifica que el usuario que manda la petición está autenticado
const { estaAutenticado } = require("../config/passport.config");

// Obtenemos el controlador de grafitis
const grafitiController = require("../controllers/grafiti.controller");

// Middleware de procesado de imágenes multer
const upload = require("../config/multer.config");
//const { upload } = require("../config/db.config");


// RUTAS DE LA API DE GESTIÓN DE GRAFITIS "/api/grafitis"


// Obtención de un grafiti (<host>/api/grafitis/get/:grafiti_id)
router.get("/get/:grafiti_id", grafitiController.get);

// Obtención de la miniatura de un grafiti (<host>/api/grafitis/get-thumbnail/:grafiti_id)
router.get("/get-thumbnail/:grafiti_id", grafitiController.getThumbnail);

// Subida de un grafiti (<host>/api/grafitis/upload)
router.post("/upload", estaAutenticado, upload.array("imagenes"), grafitiController.upload);

// Actualización de un grafiti (<host>/api/grafitis/update/:grafiti_id)
router.post("/update/:grafiti_id", estaAutenticado, grafitiController.update);

// Subida de un grafiti (<host>/api/grafitis/remove/:grafiti_id)
router.post("/remove/:grafiti_id", estaAutenticado, grafitiController.remove);

// Subida de un grafiti (<host>/api/grafitis/get-grafitis-with-gps)
router.get("/get-grafitis-with-gps", estaAutenticado, grafitiController.getGrafitisWithGPS);

/*
// Añadir comentario (<host>/api/grafitis/remove/:grafiti_id)
router.post("/postComment/:grafiti_id", estaAutenticado, grafitiController.postComment);

// Añadir comentario (<host>/api/grafitis/remove/:grafiti_id)
router.post("/deleteComment/:comment_id", estaAutenticado, grafitiController.deleteComment);
*/

module.exports = router;