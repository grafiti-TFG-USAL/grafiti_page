const mongoose = require("mongoose");
const geopointSchema = require("./geopoint.schema.js");

const grafitiSchema  = mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 3,
        max: 40
    },
    geopoint: {
        type: geopointSchema,
        required: false, //TODO: a tener en cuenta
    },
    descripcion: { //TODO
        type: String,
        max: 1000
    },
    tags: { //TODO: pendiente de crear objeto

    },
    notas: { //TODO
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