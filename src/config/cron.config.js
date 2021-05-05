const cron = require("node-cron");


function scheduleUnverifiedUsersRemover(comprobarUsuariosSinVerificar) {
    cron.schedule("0,15,30,45 * * * *", () => {
        comprobarUsuariosSinVerificar();
        console.log("Cron          => OK - 15 min: Comprobación los correos no verificados");
    });
}

module.exports = {
    scheduleUnverifiedUsersRemover,
};