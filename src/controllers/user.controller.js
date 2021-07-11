// Joi para comprobar el esquema de los datos recibidos
const Joi = require("@hapi/joi");

// bcrypt para hashear la contraseña
const bcrypt = require("bcrypt");

// uuid para generar un código aleatorio
const { v4: uuidv4 } = require("uuid");

// jwt para gestionar los tokens
const jwt = require("jsonwebtoken");

// passport gestiona las cookies de sesión
const passport = require("passport");

// Importamos la lógica del controlador
const { getToken, getTokenData } = require("../config/jwt.config.js");
const { sendEmail, getConfirmTemplate, getRecoverTemplate } = require("../config/mail.config");

// Cargamos el modelo del usuario
const User = require("../models/user.model");
// Cargamos el modelo de notificaciones
const Notification = require("../models/notification.model");

// schemas Joi para almacenar y comprobar los datos introducidos
const schemaRegister = Joi.object({
    name: Joi.string().min(2).max(20).required(),
    surname: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(6).max(50).required().email(), // email() realiza las comprobaciones del formato de un email
    password: Joi.string().min(10).max(50).required()
});

// Lógica del registro de usuarios
const signUp = async (req, res) => {

    try {

        // Comprobamos los errores en la info de registro recibida con validate
        const { error } = schemaRegister.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                errorOn: "general",
                message: error.details[0].message
            });
        }

        // Verificamos que el email introducido no esté registrado ya en la BD
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
            return res.status(400).json({
                success: false,
                errorOn: "email",
                message: "El email introducido ya existe"
            });
        }

        // Generamos el código de verificación de email
        const code = uuidv4();

        // Hasheamos la contraseña para almacenarla de forma segura
        const saltos = await bcrypt.genSalt(10); //los saltos añaden seguridad y evitan ataques rainbow table
        const password = await bcrypt.hash(req.body.password, saltos);
        if (!saltos || !password) {
            console.error("Incapaz de asegurar la contraseña del usuario, operación abortada por seguridad");
            return res.status(400).json({
                success: false,
                errorOn: "general",
                message: "Error interno: incapaz de asegurar la contraseña del usuario, operación abortada por seguridad"
            });
        }

        // Creamos el nuevo usuario
        const user = new User({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password,
            code,
            email_notifications: [],
        });

        // Generamos el token
        const token = getToken({
            email: user.email,
            code: user.code
        }, "2d"); //Que dure dos días

        // Obtenemos el template
        const template = getConfirmTemplate(req.body.name, token, req.headers.host)

        // Enviamos el email
        await sendEmail(
            user.email,
            "Confirme su cuenta",
            template);

        // Almacenamos el usuario en la base de datos
        const userDB = await user.save();
        if (!userDB) {
            console.error("Ha habido un error al almacenar al usuario en la base de datos");
            return res.status(400).json({
                success: false,
                errorOn: "general",
                message: "Ha habido un error al almacenar al usuario en la base de datos"
            });
        }

        return res.status(200).json({
            success: true,
            validationPending: true,
            message: "Valide su cuenta mediante el correo que le hemos enviado a su dirección de correo electrónico"
        });

    } catch (error) {
        console.error(error);
        return res.status(400).json({
            success: false,
            errorOn: "general",
            message: "Error inesperado al registrar al usuario"
        });
    }

};

// Lógica de la validación de los usuarios registrados
const confirmUser = async (req, res) => {

    try {

        // Obtener el token
        const { token } = req.params; // Nos da todos los parámetros de la ruta

        // Comprobar y extraer los datos
        const tokenData = await getTokenData(token);
        if (!tokenData) {
            console.error("Error al obtener los datos del token");
            return res.status(400).json({
                success: false,
                message: "Error al obtener los datos del token",
            });
        }
        const { email, code } = tokenData.data;

        // Verificar que el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            console.error("El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario");
            return res.status(400).json({
                success: false,
                message: "El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario",
            });
        }

        // Comprobar el status actual de la cuenta
        if (user.account_status === "VERIFIED") {
            console.error("El usuario ya estaba verificado");
            return res.status(200).redirect("../../../login");
        }

        // Verificar el código
        if (code !== user.code) {
            console.error("El código no coincide con el almacenado");
            return res.status(400).json({
                success: false,
                message: "El código no coincide con el almacenado",
            });
        }

        // Actualizamos el estado de la cuenta a verificado y eliminamos el atributo code
        userDB = await User.updateOne({ email }, { $set: { account_status: "VERIFIED" }, $unset: { code: 1 } });
        if (!userDB) {
            console.error("El usuario no se ha podido verificar por un problema con la base de datos");
            return res.status(400).json({
                success: false,
                message: "El usuario no se ha podido verificar por un problema con la base de datos",
            });
        }

        // Redireccionar a la página de confirmación
        return res.status(200).redirect(`../../../user-confirmed/${email}`);

    } catch (error) {
        console.error("Error al confirmar usuario => ", error);
        return res.status(400).json({
            success: false,
            message: "Error al confirmar usuario => " + error,
        });
    }

};

// Lógica del envío del correo de recuperación de contraseña
const recoverMail = async (req, res) => {

    try {

        const email = req.body.email;

        const { error } = Joi.string().email().validate(email);
        if (error) {
            console.error("Error al validar el formato del email: " + error.details[0].message);
            return res.status(400).json({
                success: false,
                message: "Error al validar el formato del email: " + error.details[0].message
            });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            console.error(`No hay ningun usuario con el correo "${email}"`);
            // No podemos, por seguridad, decirle al solicitante que no existe el email asi que enviamos mensaje de éxito
            return res.status(400).json({
                success: true,
                message: "Correo de recuperacion enviado"
            });
        }

        // Generamos el código de verificación de email
        const code = uuidv4();

        // Introducimos el código en el usuario de la bd
        const results = await User.updateOne({ email: user.email }, {
            $set: { code }
        });

        if (results.nModified < 1 || results.nModified > 1) {
            console.error("No se pudo modificar el dato: ", results);
            return res.status(400).json({
                success: false,
                message: "Error: no se ha podido modificar el dato"
            });
        }

        // Generamos el token
        const token = getToken({
            email: user.email,
            code
        }, "2d"); //Que dure dos días

        // Obtenemos el template
        const template = getRecoverTemplate(user.name, token, req.headers.host);

        // Enviamos el email
        const response = await sendEmail(
            user.email,
            "Recuperación de su cuenta",
            template);

        return res.status(response.success ? 200 : 400).json(response);

    } catch (error) {
        console.error("Error: ", error);
        return res.status(400).json({
            success: false,
            message: "Error: " + error
        });
    }

};

// Lógica de procesado del cambio de contraseña por pérdida
const restorePassword = async (req, res) => {

    try {

        // Obtener el token
        const { token } = req.params; // Nos da todos los parámetros de la ruta

        // Comprobar y extraer los datos
        const tokenData = await getTokenData(token);
        if (!tokenData) {
            console.error("Error al obtener los datos del token");
            return res.status(400).json({
                success: false,
                message: "Error al obtener los datos del token"
            });
        }
        const { email, code } = tokenData.data;

        // Verificar que el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            console.error("El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario");
            return res.status(400).json({
                success: false,
                message: "El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario"
            });
        }

        // Verificar el código
        if (code !== user.code) {
            console.error("El código no coincide con el almacenado");
            return res.status(400).json({
                success: false,
                message: "El código no coincide con el almacenado"
            });
        }

        // Redireccionamos a la página de introducción de la nueva contraseña
        return res.render("user-access/resetPassword", { titulo: "Restablecimiento de contraseña", isSignUp: true, email: user.email, token });

    } catch (error) {
        console.error("Error al confirmar usuario => ", error);
        return res.status(400).json({
            success: false,
            message: "Error al confirmar usuario => " + error
        });
    }

};

// Lógica de procesado del cambio de contraseña por pérdida
const resetPassword = async (req, res) => {

    try {

        // Obtener el token
        const token = req.body.token;

        // Comprobar y extraer los datos
        const tokenData = await getTokenData(token);
        if (!tokenData) {
            console.error("Error al obtener los datos del token");
            return res.status(400).json({
                success: false,
                message: "Error al obtener los datos del token"
            });
        }
        const { email, code } = tokenData.data;

        // Verificar que el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            console.error("El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario");
            return res.status(400).json({
                success: false,
                message: "El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario"
            });
        }

        // Comprobamos que las contraseñas no coincidan
        if (bcrypt.compareSync(req.body.password, user.password)) {
            return res.status(400).json({
                success: false,
                message: "La contraseña nueva no puede coincidir con la anterior"
            });
        }

        // Verificar el código
        if (code !== user.code) {
            console.error("El código no coincide con el almacenado");
            return res.status(400).json({
                success: false,
                message: "El código no coincide con el almacenado"
            });
        }

        // Hasheamos la contraseña para almacenarla de forma segura
        const saltos = await bcrypt.genSalt(10); //los saltos añaden seguridad y evitan ataques rainbow table
        const password = await bcrypt.hash(req.body.password, saltos);

        const results = await User.updateOne({ email }, {
            $set: {
                password,
                lastPasswordRenewal: Date.now()
            },
            $unset: { code: 1 }
        });

        if (results.nModified < 1 || results.nModified > 1) {
            console.error("No se pudo modificar el dato: ", results);
            return res.status(400).json({
                success: false,
                message: "Error: no se ha podido modificar la contraseña"
            });
        }

        // Si todo ha ido bien
        return res.status(200).json({
            success: true,
            message: "Contraseña correctamente modificada"
        });

    } catch (error) {
        console.error("Error al confirmar usuario => ", error);
        return res.status(400).json({
            success: false,
            message: "Error al confirmar usuario => " + error
        });
    }

};

// Lógica de procesado del cambio de contraseña por petición
const changePassword = async (req, res) => {

    try {

        const { email, password } = req.body;

        // Verificar que el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            console.error("El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario");
            return res.status(400).json({
                success: false,
                message: "El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario"
            });
        }

        // Comprobamos que las contraseñas no coincidan
        if (bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({
                success: false,
                message: "La contraseña nueva no puede coincidir con la anterior"
            });
        }

        // Hasheamos la contraseña para almacenarla de forma segura
        const saltos = await bcrypt.genSalt(10); //los saltos añaden seguridad y evitan ataques rainbow table
        const newPassword = await bcrypt.hash(password, saltos);

        const results = await User.updateOne({ email }, {
            $set: {
                password: newPassword,
                lastPasswordRenewal: Date.now()
            }
        });

        if (results.nModified < 1 || results.nModified > 1) {
            console.error("No se pudo modificar el dato: ", results);
            return res.status(400).json({
                success: false,
                message: "Error: no se ha podido modificar la contraseña"
            });
        }

        // Cerramos sesión
        req.logOut();
        req.session.destroy();
        if (req.user)
            req.user = null;

        // Si todo ha ido bien
        return res.status(200).json({
            success: true,
            message: "Contraseña correctamente modificada"
        });

    } catch (error) {
        console.error("Error al cambiar la contraseña => ", error);
        return res.status(400).json({
            success: false,
            message: "Error al cambiar la contraseña => " + error
        });
    }

};

// Lógica de procesado del cambio de contraseña por petición
const changeNotificationConfig = async (req, res) => {

    try {
        
        const userId = req.user._id;
        
        const { matches } = req.body;
        
        // Rellenamos el array de notificaciones por correo permitidas
        const notification_array = [];
        const notification_config = req.body;
        const keys = Object.keys(notification_config);
        for (let index = 0; index < keys.length; index++) {
            const notification = notification_config[keys[index]];
            if (notification) {
                notification_array.push(keys[index]);
            }
        }
        
        const results = await User.updateOne({ _id: userId }, {
            $set: {
                email_notifications: notification_array,
            }
        });
        if (results.nModified < 1 || results.nModified > 1) {
            throw "No se pudo modificar el dato: " + results;
        }

        // Si todo ha ido bien
        return res.status(200).json({
            success: true,
            message: "Notificaciones correctamente modificadas"
        });

    } catch (error) {
        console.error("Error al actualizar las notificaciones => ", error);
        return res.status(400).json({
            success: false,
            message: "Error al actualizar las notificaciones => " + error
        });
    }

};

// schema para la verificación de los datos de inicio de sesión
const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(50).required().email(),
    password: Joi.string().min(10).max(50).required()
});

// Lógica del inicio de sesión
const logIn = async (req, res, next) => {

    // Si un usuario intenta iniciar sesión, borramos la anterior
    req.logOut();

    passport.authenticate("local", (err, user, info) => {

        // Comprobamos si ha habido algún error
        if (err) {
            console.error("Error 1 en la autenticacion passport: ", info.message);
            return res.status(400).json({
                success: false,
                message: info.message
            });
        }
        if (!user) {
            console.error("Error 2 en la autenticacion passport: ", info.message);
            return res.status(400).json({
                success: false,
                message: info.message
            });
        }

        // Si no ha habido ningun fallo, logeamos
        req.logIn(user, (err) => {
            if (err) {
                console.error("Error 3 en el login de passport: ", err);
                return res.status(400).json({
                    success: false,
                    message: err
                });
            }
        });

        const hour = 3600000;

        if (req.body.rememberMe) {
            req.session.cookie.maxAge = 2 * 7 * 24 * hour; //2 weeks
        } else {
            req.session.cookie.expires = false;
        }

        // Si todo ha ido bien se lo decimos a login
        return res.status(200).json({
            success: true,
            message: "Autenticado",
        });

    })(req, res, next);

};

// Finalizar la sesión
const logOut = (req, res) => {
    req.logOut();
    req.session.destroy();
    if (req.user)
        req.user = null;
    return res.redirect("/bienvenido");
};

/**
 * Actualiza las notificaciones del usuario
 */
const comprobarUsuario = async (userId) => {
    const notifications = await Notification.countDocuments({ user: userId });
    const user = await User.findById(userId);
    if (user.notifications != notifications) {
        user.notifications = notifications;
        user.save();
    }
};

const { countOf, deleteUserGrafitis } = require("./grafiti.controller");
const { Mongoose } = require("mongoose");
const { findById } = require("../models/user.model");
// Finalizar la sesión
const removeUser = async (req, res) => {

    var fueEliminado = false;
    try {

        const { email, checked } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            console.error("Error: El usuario a eliminar no existe");
            return res.status(400).json({
                success: false,
                message: "Error: El usuario a eliminar no existe"
            });
        }

        const nGrafitis = await countOf(user._id);

        // Si el usuario nos permite seguir mostrando sus grafitis
        var nEliminados;
        if (checked) {
            const community = await User.findOne({ email: process.env.MAIL_USER })
            nEliminados = await deleteUserGrafitis(user._id, checked, community._id);
        } 
        // Si no nos permite seguir mostrando sus grafitis
        else {
            nEliminados = await deleteUserGrafitis(user._id, checked);
        }

        // Comprobamos que se hayan realizado todas las eliminaciones
        if (nGrafitis !== nEliminados) {
            console.error("Error: no se han podido eliminar todos los grafitis del usuario");
            return res.status(400).json({
                success: false,
                message: "No se han podido eliminar todos sus grafitis"
            });
        }

        // Eliminamos finalmente el usuario
        const deleted = await User.remove({ _id: user._id });
        // Comprobamos
        if(!deleted){
            return res.status(400).json({
                success: false,
                message: "Error en la base de datos al tratar de eliminar su usuario"
            });
        }
        if(deleted.n < 1 || !deleted.ok){
            return res.status(400).json({
                success: false,
                message: "Error en la base de datos al tratar de eliminar su usuario"
            });
        }

        // Si todo ha ido bien
        return res.status(200).json({
            success: true,
            message: "Usuario eliminado con éxito"
        });

    } catch (error) {
        console.error("Error durante la eliminación del usuario: ", error);
        return res.status(400).json({
            success: false,
            removed: fueEliminado,
            message: "Ha ocurrido un fallo inesperado: " + error
        });
    }

};

// Elimina de la base de datos los usuarios que no se hayan registrado en el plazo especificado
const eliminarUsuariosSinVerificar = async () => {

    try {

        // Eliminamos de la base de datos de usuarios a los no verificados que exceden el plazo
        const users = await User.deleteMany({
            account_status: "UNVERIFIED", createdAt: {
                $lte: Date.now() - 1000 * 60 * 60 * 24 * 2 // 2 días en milisegundos
            }
        });
        if (users.n > 0) {
            console.log("Usuarios borrados: ", users.n);
        }
            

    } catch (error) {
        console.error("Error en la eliminación de usuarios sin verificar => ", error);
        return null;
    }
};

/**
 * Dado un ID, devuelve un objeto con el nombre y apellidos del usuario
 * @param {*} id - ID del usuario
 */
const getUsernameById = async id => {

    try {

        // Eliminamos de la base de datos de usuarios a los no verificados que exceden el plazo
        const user = await User.findById(id);
        if(!user){
            console.error("No he han podido consultar los datos del usuario");
            return null;
        }

        return {
            name: user.name,
            surname: user.surname,
            email: user.email,
        };

    } catch (error) {
        console.error("Error en la obtención del nombre del usuario => ", error);
        return null;
    }
    
};

/**
 * Obtiene las notificaciones de un usuario
 */
const getUserNotifications = async (req, res) => {
    try {
        
        if(req.user.id !== req.params.user_id){
            throw "El usuario solicitado y el usuario autenticado no coinciden";
        }
        
        const notificaciones = await Notification.find({
            user: req.user._id,
        })
        .sort({
            seen: 1, // Ordenamos por, primero las no vistas
            createdAt: -1, // Luego por fecha
        });
        
        const nNotificaciones = await Notification.countDocuments({
            user: req.user._id,
            seen: false,
        });
        
        await User.updateOne({ _id: req.user._id }, {
            $set: { notifications: nNotificaciones }
        });
        
        if(notificaciones){
            return res.status(200).json({
                success: true,
                message: `Encontradas ${notificaciones.length} notificaciones`,
                notificaciones
            });
        }else{
            throw "No se han encontrado notificaciones para el usuario especificado";
        }
        
    } catch (error) {
        console.error("Ha habido un fallo al consultar las notificaciones: " + error);
        res.status(400).json({
            success: false,
            message: `Ha habido un fallo al consultar las notificaciones: ${error}`
        });
    }  
};


module.exports = {
    signUp,
    confirmUser,
    recoverMail,
    restorePassword,
    resetPassword,
    changePassword,
    changeNotificationConfig,
    logIn,
    logOut,
    comprobarUsuario,
    removeUser,
    eliminarUsuariosSinVerificar,
    getUsernameById,
    getUserNotifications,
    schemaRegister,
    schemaLogin
};