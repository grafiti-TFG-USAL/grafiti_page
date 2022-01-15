const mongoose = require("mongoose");

const locationSchema = mongoose.Schema({
  grafiti: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Grafiti"
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [0]:lng - [1]:lat
      required: true,
    }
  },
}, {
  timestamps: true,
});

locationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);