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
    deleted: {
      type: Boolean,
      default: false,
    }
});

module.exports = mongoose.model("Location", locationSchema);