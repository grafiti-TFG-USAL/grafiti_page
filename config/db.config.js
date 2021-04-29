// Conexión con la base de datos MongoDB
const mongoose = require("mongoose");

const DB_uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster.mfvvi.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const connectDB = async () => {

    try {
        
        const connection = await mongoose.connect(DB_uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });

        if(connection.STATES.connected)
            console.log("Base de Datos => OK");
        else{
            console.log("Base de Datos => Error desconocido");
            process.exit(1);
        }
        
    } catch (error) {
        console.log("Base de Datos => " + error);
        process.exit(1);
    }

}

module.exports = connectDB;