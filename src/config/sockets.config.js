const SocketIO = require("socket.io");

var io = null;
const connectedUsers = {};

const init = (server, app) => {

    try {
        io = SocketIO(server);
        console.log(`Sockets       => OK`);
        app.io = io;
    } catch (error) {
        console.log("Sockets       => Failed");
        console.log("Error: ", error);
        process.exit(1);
    }

    io.on("connection", socket => {
        console.log("Usuario conectado", socket.id);
        
        socket.on("upload:init", (data) => {
            connectedUsers[data.userId+":upload"] = socket;
        });
        socket.on("upload:finish", (data) => {
            delete connectedUsers[data.userId+":upload"];
        });
        
        socket.on("download-batch:init", (data) => {
            connectedUsers[data.userId+":download-batch"] = socket;
        });
        socket.on("download-batch:finish", (data) => {
            delete connectedUsers[data.userId+":download-batch"];
        });
        
    });
    
    io.on("disconnect", () => {
        console.log("Usuario desconectado");
    })

};

module.exports = {
    init,
    connectedUsers,
}