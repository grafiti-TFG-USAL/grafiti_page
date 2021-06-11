// Importamos el paquete npm
const moment = require("moment");

/**
 * Devuelve el tiempo formateado que ha pasado desde un cierto timestamp
 * @param {*} timestamp 
 */
const timeAgo = (timestamp) => {
    return moment(timestamp).locale("es").startOf("minute").fromNow();
};

module.exports = {
    timeAgo,
};