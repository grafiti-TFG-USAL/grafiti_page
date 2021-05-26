const mongoose = require("mongoose");

// fuente: https://mongoosejs.com/docs/geojson.html
const geopointSchema = mongoose.Schema({

  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
  
});

// No exporto el modelo, pues solo requiero el schema ya que no será una colección
module.exports = geopointSchema; 