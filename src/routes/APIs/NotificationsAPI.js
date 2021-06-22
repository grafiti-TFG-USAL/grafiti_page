const express = require("express");
const router = express.Router();

// Obtenemos el middleware que nos verifica que el usuario que manda la petición está autenticado
const { estaAutenticado } = require("../../config/passport.config");

// Obtenemos los métodos de las rutas
const { getUserNotifications } = require("../../controllers/user.controller");
const { switchNotificationSeenState, switchAllNotificationsSeenState } = require("../../controllers/userPage.controller");

// Debe estar autenticado
router.use("/", estaAutenticado); 

// RUTAS DE LA API DE GESTIÓN DE GRAFITIS "/api/grafitis"


// Obtención de las notificaciones de un usuario (<host>/api/notifications/get/:user_id)
router.get("/get/:user_id", getUserNotifications);

// Alterna el estado visto/no visto (<host>/api/notifications/switch-seen/:notification_id)
router.post("/switch-seen/:notification_id", switchNotificationSeenState);

// Alterna el estado visto/no visto (<host>/api/notifications/all-seen)
router.post("/all-seen", switchAllNotificationsSeenState);

module.exports = router;