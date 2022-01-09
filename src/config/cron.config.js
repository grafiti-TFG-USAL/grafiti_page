const cron = require("node-cron");


function scheduleUnverifiedUsersRemover(comprobarUsuariosSinVerificar) {
    // Establecemos la ejecución de la tarea cada 15 minutos
    cron.schedule("0,15,30,45 * * * *", () => {
        comprobarUsuariosSinVerificar();
        console.log("Cron 15 mins  ==> Comprobación cuentas no verificadas");
    });
    // Y ejecutamos la tarea al inicio del programa
    comprobarUsuariosSinVerificar();
    console.log("Cron          => OK");
    
}

module.exports = {
    scheduleUnverifiedUsersRemover,
};