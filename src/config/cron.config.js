const cron = require("node-cron");


function scheduleUnverifiedUsersRemover(comprobarUsuariosSinVerificar) {
    // Establecemos la ejecución de la tarea cada 15 minutos
    cron.schedule("0,15,30,45 * * * *", () => {
        comprobarUsuariosSinVerificar();
        console.log("CRON - 15 min: Comprobación los correos no verificados");
    });
    // Y ejecutamos la tarea al inicio del programa
    comprobarUsuariosSinVerificar();
    console.log("Cron          => OK - Comprobación inicial");
    
}

module.exports = {
    scheduleUnverifiedUsersRemover,
};