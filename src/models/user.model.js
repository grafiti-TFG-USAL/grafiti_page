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
        lowercase: true,
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
    account_status: {
        type: String,
        required: true,
        default: "UNVERIFIED"
    },
    code: {
        type: String, 
        required: true
    }
}, { 
    timestamps: true // Incluye la fecha de creación y de última modificación del elemento
});

// Métodos del modelo
userSchema.methods.encryptPassword = async (password) => {
    try {
        return await bcrypt.hash(password, bcrypt.genSaltSync(10));
    } catch (error) {
        console.log(error);
        return false;
    }
};
  
userSchema.methods.comparePassword = async (password) => {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.log(error);
        return false;
    }
};

//mongoose.model() busca en la base la coleccion "usuarios" (automaticamente ya pone en lowercase y busca el plural)
module.exports = mongoose.model("User", userSchema);
//Con esto devolvemos el modelo de usuario, lo que nos permite buscar usuarios, insertar, borrar y modificar