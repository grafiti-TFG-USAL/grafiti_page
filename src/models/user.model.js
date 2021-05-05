const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
        unique: true,
        min: 6,
        max: 50
    },
    password: {
        type: String,
        required: true,
        min: 10,
        max: 50
    },
    status: {
        type: String,
        required: true,
        default: "UNVERIFIED"
    },
    register_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    code: {
        type: String, 
        required: true
    }
});

// Métodos del modelo
userSchema.methods.encryptPassword = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};
  
userSchema.methods.comparePassword = (password) => {
    return bcrypt.compareSync(password, this.password);
};

//mongoose.model() busca en la base la coleccion "usuarios" (automaticamente ya pone en lowercase y busca el plural)
module.exports = mongoose.model("User", userSchema);
//Con esto devolvemos el modelo de usuario, lo que nos permite buscar usuarios, insertar, borrar y modificar