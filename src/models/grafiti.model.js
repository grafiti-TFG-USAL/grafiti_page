const mongoose = require("mongoose");
const path = require("path");

const grafitiSchema = mongoose.Schema({

    // El nombre original del archivo
    originalname: {
        type: String,
        required: true,
    },
    // El usuario que subió la imagen
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User", // Esto nos permite hacer un populate
    },
    // El nombre del archivo en el servidor
    serverName: {
        type: String,
        required: true,
    },
    // La ruta relativa al archivo en el servidor
    relativePath: {
        type: String,
        required: true,
    },
    // La ruta absoluta al archivo en el servidor
    absolutePath: {
        type: String,
        required: true,
    },
    // La descripción del usuario de la imagen
    description: {
        type: String,
    },
    // Las coordenadas gps de la ubicación de la imagen
    gps: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location", // Esto nos permite hacer un populate
    },
    // La orientación de la cámara al capturar la imagen
    orientation: {
        type: Number,
        // 1 = Horizontal (normal), 2 = Mirror horizontal, 3 = Rotate 180, 4 = Mirror vertical, 5 = Mirror horizontal and rotate 270 CW, 6 = Rotate 90 CW, 7 = Mirror horizontal and rotate 90 CW, 8 = Rotate 270 CW
    },
    // Los datos del IMU de la cámara al tomar la imagen
    rotation: {
        canvas: { type: Boolean },
        css: { type: Boolean },
        dimensionSwapped: { type: Boolean },
        scaleX: { type: Number },
        scaleY: { type: Number },
        deg: { type: Number },
        rad: { type: Number },
    },
    // La miniatura de la imagen
    thumbnail: {
        type: Buffer,
    },
    // Todos los metadatos extraidos del archivo original
    metadata: {
        type: Object,
    },
    dateTimeOriginal: {
        type: Date,
        default: Date.now(),
    },
    // La fecha de subida de la imagen
    uploadedAt: {
        type: Date,
        default: Date.now(),
    },
    // La fecha de la última actualización de datos
    lastModified: {
        type: Date,
        default: Date.now(),
    },
    // Si la imagen se encuentra o no borrada
    deleted: {
        type: Boolean,
        default: false,
    },
    // El mapa de características generado por la RNA
    featureMap: [Number],

});

grafitiSchema.virtual("uniqueId").get(function () {
    return this.serverName.replace(path.extname(this.serverName), "");
});

grafitiSchema.virtual("stringId").get(function () {
    return this._id.toString();
});

//mongoose.model() busca en la base la coleccion "grafitis" (automaticamente ya pone en lowercase y busca el plural)
module.exports = mongoose.model(process.env.GRAFITI_COLLECTION_NAME, grafitiSchema);