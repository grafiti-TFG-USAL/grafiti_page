// Joi para comprobar el esquema de los datos recibidos
const Joi = require("@hapi/joi");

// bcrypt para hashear la contraseña
const bcrypt = require("bcrypt");

// uuid para generar un código aleatorio
const { v4: uuidv4 } = require("uuid");

// jwt para gestionar los tokens
const jwt = require("jsonwebtoken");

// Importamos la lógica del controlador
const { getToken, getTokenData } = require("../config/jwt.config.js");
const { sendEmail, getTemplate } = require("../config/mail.config");

// Cargamos el modelo del usuario
const User = require(__dirname + "/models/user.js");

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

        console.log("Usuario ", user.name , " almacenado en la base");

        return res.status(200).json({
            success: true,
            message: "Usuario almacenado en la base correctamente y pendiente de validación"
        })

    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: "Error al registrar al usuario"
        });
    }

}

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

        // Comprobar el status actual
        if(user.status === "VERIFIED")
        {
            console.log("El usuario ya estaba verificado");
            return res.status(200).redirect("../../../login");
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
        res.status(200).redirect(`../../../user-confirmed/${email}`);

    }catch(error){
        console.log("Error al confirmar usuario => ", error);
    }

}

// schema para la verificación de los datos de inicio de sesión
const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(50).required().email(),
    password: Joi.string().min(10).max(50).required()
});

// Lógica de los inicios de sesión
const logIn = async (req, res) => {

    try {

        // Validar los datos recibidos
        console.log("Datos recibidos: ", req.body)
        const { error } = schemaLogin.validate(req.body);
        if (error){
            console.log("Error al validar los datos introducidos");
            return res.status(400).json({ 
                success: false,
                message: error 
            });
        }
        console.log("Formato adecudado de datos")

        // Comprobar que el usuario exista
        const user = await User.findOne({ email: req.body.email });
        if (!user){
            console.log("El usuario o la contraseña son incorrectos");
            return res.status(400).json({ 
                success: false,
                message: "El usuario o la contraseña son incorrectos" 
            });
        }
        console.log("Usuario esisten"); //TODO: BORRAR ESTO

        // Comprobar que el usuario esté verificado
        if(user.status !== "VERIFIED"){
            console.log("Error: el usuario aún no ha verificado su correo electrónico");
            return res.status(400).json({
                success: false,
                message: "Error: el usuario aún no ha verificado su email"
            });
        }
    
        // Comprobar la contraseña
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword){
            console.log("El usuario o la contraseña son incorrectos");
            return res.status(400).json({ 
                success: false,
                message: "El usuario o la contraseña son incorrectos" 
            });
        }
        console.log("Contraseña correcta")

        // Generamos el token
        const token = getToken({ 
            name: user.name,
            email: user.email,
            id: user._id
        });
        console.log("Token generado")

        // Almacenamos el token en la cabecera
        res.header("auth-token", token).json({
            data: token,
            success: true,
            message: "Autenticación de usuario correcta"
        });
        console.log("Token almacenado en la cabecera")
        console.log("En login todo OK")

    } catch (error) {
        console.log("Error en el inicio de sesión => ", error);
        return res.status(400).json({
            success: false,
            message: error
        });
    }

}

// Validación del token del usuario
const validateToken = (req, res, next) => {

    try {

        console.log("Entrando en la validacion del token")
        // Obtenemos el token de la cabecera de la petición
        const token = req.header("auth-token"); // Lo añadimos al header en el login
        if(!token) {
            // 401 -> Acceso denegado
            console.log("ERROR: No hay token en la cabecera")
            return res.status(401).json({ 
                error: "Acceso denegado" 
            });
        }
        console.log("Cabecera leida, token recibido")

        // Verificamos que el token se corresponda a nuestra clave
        const tokenData = jwt.verify(token, process.env.TOKEN_SECRET);
        if(!tokenData){
            console.log("Error: No se ha podido acceder a la información del token");
            return res.status(400).json({
                success: false,
                message: "No se ha podido acceder a la información del token"
            });
        }
        console.log("Token verificado")

        req.user = tokenData;
        next();
        
    } catch (error) {
        return res.status(400).json({ 
            success: false,
            error,
            message: "Ha habido un problema al verificar el token de usuario" 
        });
    }

}

module.exports = {
    signUp,
    confirmUser,
    logIn,
    validateToken
}