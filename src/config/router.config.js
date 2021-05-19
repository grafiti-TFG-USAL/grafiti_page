module.exports = app => {

    const path = require("path");

    const routesPath = "../routes";

    // Paginación pública
    app.use("/", require(path.join(routesPath,"RutasWeb.js")));

    // Api de gestión de usuarios 
    app.use("/api/users", require(path.join(routesPath,"GestionUsuarios.js"))); 
    
    // Paginación de usuarios
    app.use("/usuario", require(path.join(routesPath,"Usuario.js")));
    
    // API de gestión de grafitis
    app.use("/api/grafitis", require(path.join(routesPath, "GrafitisAPI.js"))); 

};