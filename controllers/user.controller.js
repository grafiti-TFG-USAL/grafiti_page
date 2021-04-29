// Joi para comprobar el esquema de los datos recibidos
const Joi = require("@hapi/joi");

// bcrypt para hashear la contraseña
const bcrypt = require("bcrypt");

// uuid para generar un código aleatorio
const { v4: uuidv4 } = require("uuid");

// Importamos la lógica del controlador
const { getToken, getTokenData } = require("../config/jwt.config.js");
const { sendEmail, getTemplate } = require("../config/mail.config");

// Cargamos el modelo del usuario
const User = require("../models/user.js")

// schemas Joi para almacenar y comprobar los datos introducidos
const schemaRegister = Joi.object({
    name: Joi.string().min(2).max(20).required(),
    surname: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(6).max(50).required().email(), // email() realiza las comprobaciones de formato
    password: Joi.string().min(10).max(50).required()
});

const signUp = async (req, res) => {
    
    try {

        // Comprobamos los errores en la info de registro recibida con validate
        const {error} = schemaRegister.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: error.details[0].message
            });
        }

         // Verificamos que el email introducido no esté registrado ya en la BD
        const emailExists = await User.findOne({ email: req.body.email })
        if(emailExists) {
            return res.status(400).json({
                success: false,
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
                message: "Operacion fallida: incapaz de asegurar la contraseña del usuario"
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
        });

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
            console.log("Ha habido un error al almacenar al usuario en la base de datos")
            return res.status(400).json({
                success: false,
                message: "Ha habido un error al almacenar al usuario en la base de datos"
            });
        }

        console.log("Usuario ",user.name , " almacenado en la base");

        res.status(201).json({
            success: true,
            message: "Usuario registrado con éxito, pendiente verificación"
        });

        console.log("Usuario: ", user);

    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: "Error al registrar al usuario"
        });
    }

}

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

        // Actualizar usuario
        user.status = "VERIFIED";
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
        res.status(200).json({
            success: true,
            message: "El usuario ha sido validado correctamente"
        });

    }catch(error){
        console.log("Error al confirmar usuario => ", error);
    }

}

module.exports = {
    signUp,
    confirmUser
}