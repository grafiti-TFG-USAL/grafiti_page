/**
 * Comprueba la lógica booleana del string de la variable de entorno especificada
 * @param {String} variable String con el nombre de la variable de entorno
 * @returns {Boolean} Indica si la variable existe y es verdadera
 */
 const envBoolean = (variable) => {
    if (process.env[variable]) {
        if(0!=process.env[variable].localeCompare("false")) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

module.exports = {
    envBoolean,
};