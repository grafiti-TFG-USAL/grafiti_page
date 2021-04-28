const mongoose = require("mongoose");

const userSchema  = mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 2,
        max: 20
    },
    surname: {
        type: String,
        required: true,
        min: 2,
        max: 50
    },
    email: {
        type: String,
        required: true,
        min: 6,
        max: 50
    },
    password: {
        type: String,
        required: true,
        min: 10,
        max: 50
    },
    date: {
        type: Date,
        default: Date.now
    }
});

//mongoose.model() busca en la base la coleccion "usuarios" (automaticamente ya pone en lowercase y busca el plural)
module.exports = mongoose.model("User", userSchema);
//Con esto devolvemos el modelo de usuario, lo que nos permite buscar usuarios, insertar, borrar y actualizar