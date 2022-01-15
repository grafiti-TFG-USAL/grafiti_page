const express = require("express");
const router = express.Router();

// Obtenemos el middleware que nos verifica que el usuario que manda la petición está autenticado
const { estaAutenticado } = require("../../config/passport.config");

// Obtenemos el controlador de grafitis
const grafitiController = require("../../controllers/grafiti.controller");

// Middleware de procesado de imágenes multer
const upload = require("../../config/multer.config");


// RUTAS DE LA API DE GESTIÓN DE GRAFITIS "/api/grafitis"


// Obtención de un grafiti (<host>/api/grafitis/get/:grafiti_id)
router.get("/get/:grafiti_id", grafitiController.get);

// Obtención de la miniatura de un grafiti (<host>/api/grafitis/get-thumbnail/:grafiti_id)
router.get("/get-thumbnail/:grafiti_id", grafitiController.getThumbnail);

// Obtención de información de un grafiti (<host>/api/grafitis/get-info/:grafiti_id)
router.get("/get-info/:grafiti_id", grafitiController.getInfo);

// Subida de un grafiti (<host>/api/grafitis/upload)
router.post("/upload", estaAutenticado, upload.array("imagenes"), grafitiController.upload);

// Actualización de un grafiti (<host>/api/grafitis/update/:grafiti_id)
router.post("/update/:grafiti_id", estaAutenticado, grafitiController.update);

// Eliminación de un grafiti (<host>/api/grafitis/remove/:grafiti_id)
router.post("/remove/:grafiti_id", estaAutenticado, grafitiController.remove);

// Eliminación de un lote de grafitis (<host>/api/grafitis/remove/:grafiti_id)
router.post("/remove-batch", estaAutenticado, grafitiController.removeBatch);

// Subida de un grafiti (<host>/api/grafitis/get-grafitis-with-gps)
router.get("/get-grafitis-with-gps", estaAutenticado, grafitiController.getGrafitisWithGPS);

// Obtención de los matches de un grafiti (<host>/api/grafitis/get-matches/:grafiti_id)
router.get("/get-matches/:grafiti_id", estaAutenticado, grafitiController.getMatches);

// Establece una relación match entre dos grafitis (<host>/api/grafitis/set-match)
router.post("/set-match", estaAutenticado, grafitiController.setMatch);

// Confirmación del match por parte del usuario que no lo identificó (<host>/api/grafitis/confirm-match)
router.post("/confirm-match", estaAutenticado, grafitiController.confirmMatch);

// Elimina el match por parte del usuario que no lo identificó (<host>/api/grafitis/not-confirm-match)
router.post("/not-confirm-match", estaAutenticado, grafitiController.notConfirmMatch);

// Elimina un match (<host>/api/grafitis/remove-match/:match_id)
router.post("/remove-match/:match_id", estaAutenticado, grafitiController.removeMatch);

// Devuelve un lote de imágenes (<host>/api/grafitis/get-grafiti-batch)
router.post("/get-grafiti-batch", grafitiController.getBatch);

// Devuelve un lote de imágenes de la imagen que se busca (<host>/api/grafitis/get-search-batch)
router.post("/get-search-batch", grafitiController.getSearchBatch);

// Prepara un paquete para su descarga (<host>/api/grafitis/prepare-matches-download)
router.post("/prepare-matches-download", estaAutenticado, grafitiController.prepareMatchesDownload);

// Prepara un paquete para su descarga (<host>/api/grafitis/prepare-download-batch)
router.post("/prepare-download-batch", estaAutenticado, grafitiController.prepareDownloadBatch);

// Descarga el paquete creado (<host>/api/grafitis/download-batch/:file_id)
router.get("/download-batch/:file_id", estaAutenticado, grafitiController.downloadBatch);


module.exports = router;