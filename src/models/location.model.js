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
      enum: ['Point'],
      required: true,
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

module.exports = mongoose.model("Location", locationSchema);