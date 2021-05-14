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
const { sendEmail, getTemplate } = require("../config/mail.config");

// Cargamos el modelo del usuario
const User = require("../models/user.model.js");
const { Mongoose } = require("mongoose");

// schemas Joi para almacenar y comprobar los datos introducidos
const schemaRegister = Joi.object({
    name: Joi.string().min(2).max(20).required(),
    surname: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(6).max(50).required().email(), // email() realiza las comprobaciones de formato
    password: Joi.string().min(10).max(50).required()
});

// Lógica del registro de usuarios
const signUp = async (req, res) => {
    
    try {

        // Comprobamos los errores en la info de registro recibida con validate
        const {error} = schemaRegister.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                errorOn: "general",
                message: error.details[0].message
            });
        }

        // Verificamos que el email introducido no esté registrado ya en la BD
        const emailExists = await User.findOne({ email: req.body.email })
        if(emailExists) {
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
        if(!saltos || !password){
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
            code
        });

        // Generamos el token
        const token = getToken({ 
            email: user.email, 
            code: user.code 
        }, "2d"); //Que dure dos días

        // Obtenemos el template
        const template = getTemplate(req.body.name, token, req.headers.host)

        // Enviamos el email
        await sendEmail(
            user.email,
            "Confirme su cuenta",
            template);
        
        // Almacenamos el usuario en la base de datos
        const userDB = await user.save();
        if(!userDB){
            console.log("Ha habido un error al almacenar al usuario en la base de datos");
            return res.status(400).json({
                success: false,
                errorOn: "general",
                message: "Ha habido un error al almacenar al usuario en la base de datos"
            });
        }

        console.log("Usuario ", user.name , " almacenado en la base");

        return res.status(200).json({
            success: true,
            validationPending: true,
            message: "Valide su cuenta mediante el correo que le hemos enviado a su dirección de correo electrónico"
        });

    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            errorOn: "general",
            message: "Error inesperado al registrar al usuario"
        });
    }

};

// Lógica de la validación de los usuarios registrados
const confirmUser = async (req, res) => {

    try{

        // Obtener el token
        const { token } = req.params; // Nos da todos los parámetros de la ruta

        // Comprobar y extraer los datos
        const tokenData = await getTokenData(token);
        if(!tokenData){
            console.log("Error al obtener los datos del token");
            return res.json({
                success: false,
                message: "Error al obtener los datos del token"
            });
        }
        const { email, code } = tokenData.data;

        // Verificar que el usuario existe
        const user = await User.findOne({ email });
        if(!user){
            console.log("El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario");
            return res.json({
                success: false,
                message: "El usuario a confirmar no existe en la base de datos o no se ha podido acceder a la información del usuario"
            });
        }

        // Verificar el código
        if(code !== user.code){
            console.log("El código no coincide con el almacenado");
            return res.json({
                success: false,
                message: "El código no coincide con el almacenado"
            });
        }

        // Comprobar el status actual de la cuenta
        if(user.account_status === "VERIFIED")
        {
            console.log("El usuario ya estaba verificado");
            return res.status(200).redirect("../../../login");
        }

        // Actualizar usuario
        user.account_status = "VERIFIED";
        userDB = await user.save();
        if(!userDB){
            console.log("El usuario no se ha podido verificar por un problema con la base de datos");
            return res.json({
                success: false,
                message: "El usuario no se ha podido verificar por un problema con la base de datos"
            });
        }

        // Redireccionar a la página de confirmación
        console.log("El usuario ha sido validado correctamente");
        res.status(200).redirect(`../../../user-confirmed/${email}`);

    }catch(error){
        console.log("Error al confirmar usuario => ", error);
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
        if(err) {
            console.log("Error 1 en la autenticacion passport: ", info.message);
            return res.status(400).json({
                success: false, 
                message: info.message
            });
        }
        if(!user){
            console.log("Error 2 en la autenticacion passport: ", info.message);
            return res.status(400).json({
                success: false, 
                message: info.message
            });
        }

        // Si no ha habido ningun fallo, logeamos
        req.logIn(user, (err) => {
            if(err){
                console.log("Error 3 en el login de passport: ", err);
                return res.status(400).json({
                    success: false, 
                    message: err
                });
            }
        });

        if(req.body.remember) {
            var hour = 3600000;
            req.session.cookie.maxAge = 14 * 24 * hour; //2 weeks
        } else {
            req.session.cookie.expires = false;
        }

        // Si todo ha ido bien se lo decimos a login
        return res.status(200).json({ 
            success: true,
            message: "Autenticado" 
        });

    })(req, res, next);

};

// Finalizar la sesión
const logOut = (req, res) => {
    req.logOut();
    if(req.user)
        req.user = null;
    res.redirect("/bienvenido");
};

// Elimina de la base de datos los usuarios que no se hayan registrado en el plazo especificado
const eliminarUsuariosSinVerificar = async () => {

    try {
        
        // Eliminamos de la base de datos de usuarios a los no verificados que exceden el plazo
        const users = await User.deleteMany({ account_status: "UNVERIFIED", createdAt: { 
            $lte: Date.now() - 1000*60*60*24* 2 // 2 días en milisegundos
        }});
        if(users.n > 0) console.log("Usuarios borrados: ", users.n);

    } catch (error) {
        console.log("Error en la eliminación de usuarios sin verificar => ",error);
        process.exit(1);
    }
};

module.exports = {
    signUp,
    confirmUser,
    logIn,
    logOut,
    eliminarUsuariosSinVerificar,
    schemaRegister,
    schemaLogin
}