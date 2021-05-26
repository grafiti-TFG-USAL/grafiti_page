const mongoose = require("mongoose");
const geopointSchema = require("./geopoint.schema.js");
const path = require("path");

const grafitiSchema  = mongoose.Schema({

    originalname: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    descripcion: {
        type: String
    },
    tags: [{ //TODO: pendiente de crear objeto
        type: String
    }],
    metadata: {
        type: Object
    },
    /*geopoint: {
        type: geopointSchema,
    },*/
    uploadedAt: { //TODO
        type: Date,
        default: Date.now()
    },
    deleted: {
        type: Boolean,
        default: false
    }

});

grafitiSchema.virtual("uniqueId").get(function () {
        return this.filename.replace(path.extname(this.filename), "");
    });

//mongoose.model() busca en la base la coleccion "grafitis" (automaticamente ya pone en lowercase y busca el plural)
module.exports = mongoose.model("Grafiti", grafitiSchema);