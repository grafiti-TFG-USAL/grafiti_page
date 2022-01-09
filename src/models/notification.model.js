const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["Ubicación no establecida", "Grafiti similar detectado"],
        required: true,
    },
    message: {
        type: String,
        //required: true,
    },
    seen: {
        type: Boolean,
        required: true,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },

    // Parámetros opcionales en función del tipo de notificación
    grafiti: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grafiti",
    },
    grafiti_2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grafiti",
    },

});

const User = require("./user.model");
notificationSchema.post("save", async function (doc) {
    try {
        
        if (doc.seen) {

            const updateDec = await User.findOneAndUpdate({ _id: doc.user }, {
                $inc: { notifications: -1 },
            });
            if (!updateDec) {
                throw "(dec) El update no se ha llegado a ejecutar";
            }

        } else {

            const updateInc = await User.findOneAndUpdate({ _id: doc.user }, {
                $inc: { notifications: 1 },
            });
            
            if (!updateInc) {
                throw "(inc) El update no se ha llegado a ejecutar";
            }

        }

    } catch (error) {
        console.error("Error al modificar el número de notificaciones del usuario: " + error);
    }

});
/* //NO SE POR QUE NO SE DISPARA
notificationSchema.pre("remove", async function (doc) {

    if (!doc.seen) {

        try 
            const updateDec = await User.findOneAndUpdate({ _id: doc.user }, {
                $inc: { notifications: -1 },
            });
            
            if (!updateDec) {
                throw "(dec by remove) El update no se ha llegado a ejecutar";
            }

        } catch (error) {
            console.error("Error al modificar el número de notificaciones del usuario: " + error);
        }

    }

});*/

module.exports = mongoose.model("Notification", notificationSchema);