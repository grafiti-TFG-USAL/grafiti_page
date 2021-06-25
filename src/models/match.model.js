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
    // Si el/los usuarios han confirmado el match
    confirmed: {
        type: Boolean,
        default: false,
    },
            
});


module.exports = mongoose.model("Match", matchSchema);