const mongoose = require("mongoose");

const matchSchema = mongoose.Schema({
    
    // Uno de los grafitis de la coincidencia
    grafiti_1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grafiti",
        required: true,
    },
    // El otro grafiti de la coincidencia
    grafiti_2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grafiti",
        required: true,
    },
    // El porcentaje de similaridad
    similarity: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
    },
    // Si los grafitis pertenecen al mismo usuario
    sameUser: {
        type: Boolean,
        required: true,
    },
    // El usuario que estableció el match
    establishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User", // Esto nos permite hacer un populate
    },
    // Si el/los usuarios han confirmado el match
    confirmed: {
        type: Boolean,
        default: false,
    },
    // El usuario secundario
    otherUser: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "User",
    },
            
}, { 
    timestamps: true // Incluye la fecha de creación y de última modificación del elemento
});


module.exports = mongoose.model("Match", matchSchema);