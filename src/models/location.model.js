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
      type: [Number],
      required: true,
    }
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

locationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);