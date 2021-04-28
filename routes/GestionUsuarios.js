const router = require("express").Router();

// RUTA RAIZ "/api/users"

// Cargamos el modelo de usuario de MongoDB
const User = require("../models/User.js");

const Joi = require("@hapi/joi");
const { json } = require("body-parser");

// bcrypt para hashear la contraseña
const bcrypt = require("bcrypt");

// jwt para generar el token de sesión
const jwt = require("jsonwebtoken");

// schemas para almacenar y comprobar los datos introducidos
const schemaRegister = Joi.object({
    name: Joi.string().min(2).max(20).required(),
    surname: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(6).max(50).required().email(), // email() realiza las comprobaciones de formato
    password: Joi.string().min(10).max(50).required()
});

const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(50).required().email(),
    password: Joi.string().min(10).max(50).required()
});

// LOGIN
router.post("/login", async(req, res) => {
    console.log(req.body); //TODO: eliminar esto
    // Validamos la información recibida
    const {error} = schemaLogin.validate(req.body);
    console.log(req.body); //TODO: eliminar esto

    if (error) {
        return res.status(400).json({
            error: error.details[0].message
        });
    }
    console.log(req.body); //TODO: eliminar esto
    // Comprobamos que el usuario exista en la base de datos
    const user = await User.findOne({ email: req.body.email });

    if (!user){
        return res.status(400).json({
            error: true, 
            mensaje: "El -usuario introducido no existe o la contraseña no es correcta"
        }); // TODO: el guion es para comprobar donde falla, por seguridad hay que poner el mismo mensaje
    }

    const validPassword = await bcrypt.compare(req.body.password, usuario.password);

    if (!validPassword){
        return res.status(400).json({
            error: true,
            mensaje: "El usuario introducido no existe o la -contraseña no es correcta"
        }); // TODO: el guion es para comprobar donde falla, por seguridad hay que poner el mismo mensaje
    }

    // Si llega hasta aqui todo OK

    // Creamos el token
    const token = jwt.sign({
        name: usuario.name,
        id: usuario._id
    }, process.env.TOKENSECRET)
    
    // Pasamos el token a la cabecera para almacenar la sesión iniciada
    res.header("auth-token", token).json({
        error: null,
        data: token
    });

});

// REGISTRO
router.post("/register", async(req, res) => {
    // Comprobamos los errores en la info de registro recibida con validate
    const {error} = schemaRegister.validate(req.body);

    if (error) {
        return res.status(400).json({
            error: error.details[0].message
        });
    }

    // Verificamos que el email introducido no esté registrado ya en la BD
    const emailExists = await User.findOne({ email: req.body.email })
    if(emailExists) return res.status(400).json({
        error: true,
        mensaje: "El email introducido ya existe"
    });

    // Hasheamos la contraseña para almacenarla de forma segura
    const saltos = await bcrypt.genSalt(10); //los saltos añaden seguridad y evitan ataques rainbow table
    const password = await bcrypt.hash(req.body.password, saltos);

    // Creamos un nuevo usuario con la información recibida para almacenarlo en el sistema
    const user = new User({
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: req.body.password
    });
    console.log("Usuario: ", user)
    try {
        // Almacenamos al usuario en la base MongoDB
        const usuarioDB = await user.save();
        console.log("Usuario almacenado en la base");
        res.json({
            error: null, // se usa generalmente, null -> no hay error
            data: usuarioDB // TODO: eliminar esta info, meter un mensaje
        });

    } catch (error) {
        console.log(error)
        // Los status son como pagina 404, hay un standard que codifica los errores
        res.status(400).json(error);
    }

});

module.exports = router;