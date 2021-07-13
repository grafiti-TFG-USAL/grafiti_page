const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema  = mongoose.Schema({
    // Nombre del usuario
    name: {
        type: String,
        required: true,
        min: 2,
        max: 20,
    },
    // Apellido/s del usuario
    surname: {
        type: String,
        required: true,
        min: 2,
        max: 50,
    },
    // Email del usuario
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        min: 6,
        max: 50,
        index: true,
    },
    // Contraseña del usuario
    password: {
        type: String,
        required: true,
        min: 10,
        max: 50,
    },
    // Fecha del último cambio de contraseña
    lastPasswordRenewal: {
        type: Date,
        required: true,
        default: Date.now(),
    },
    // Número de notificaciones del usuario
    notifications: { 
        type: Number, 
        default: 0,
        min: 0,
    },
    // Estado de la cuenta: "VERIFIED" para cuentas autenticadas y "UNVERIFIED" para aquellas que aún no han confirmado su correo
    account_status: {
        type: String,
        required: true,
        default: "UNVERIFIED",
    },
    // Código de validación del correo electrónico
    code: {
        type: String,
    },
    // Tipos de notificaciones a las que el usuario se ha suscrito
    email_notifications: {
        type: [{
            type: String,
            enum: ["matches", "no gps"], // Si el array contiene la notificación, es que está suscrito
        }],
        default: [],
        index: false,
    }
    ,
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