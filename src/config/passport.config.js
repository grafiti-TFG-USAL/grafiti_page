const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/user.model");

// Joi para comprobar el esquema de los datos recibidos
const Joi = require("@hapi/joi");
// bcrypt para comparar las contraseñas encriptadas
const bcrypt = require("bcrypt");

// Indicamos a passport cómo serializar un usuario
passport.serializeUser((usuario, done) => {
    // Utilizamos el id para hacer el matching entre los usuarios y las sesiones en la base de datos
    done(null, usuario.id); 
});

// Indicamos a passport cómo desserializar un usuario
passport.deserializeUser(async (id, done) => {
    await User.findById(id, (err, usuario) => {
        done(err, usuario);
    });
});

// schema para la verificación de los datos de inicio de sesión
const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(50).required().email(),
    password: Joi.string().min(10).max(50).required()
});

// Estrategia local de log in
passport.use("local", new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {

    try {
        
        const { error } = schemaLogin.validate({ email, password });
        if (error){
            console.log("Error al validar los datos introducidos");
            return done(null, false, {
                message: "Error al validar los datos introducidos"
            });
        }

        // Comprobamos que existe un usuario con el email recibido
        const user = await User.findOne({ email });
        if(!user){
            return done(null, false, {
                message: "El usuario o la contraseña son incorrectos"
            });
        }

        //Comprobamos que el hash de la contraseña del usuario corresponde a la proporcionada
        const validPassword = await bcrypt.compare(password, user.password);
        if(!validPassword){
            return done(null, false, {
                message: "El usuario o la contraseña son incorrectos"
            });
        }

        // Comprobar que el usuario esté verificado
        if(user.account_status !== "VERIFIED"){
            console.log(`Error: el usuario ${user.email} aún no ha verificado su correo electrónico`);
            const caducidad = new Date(user.createdAt.getTime() + 1000*60*60*24* 2);
            return done(null, false, {
                message: `Debe verificar su cuenta mediante el enlace que le hemos enviado a su correo <strong>${user.email}</strong> para poder iniciar sesión. El enlace caducará el ${caducidad.toLocaleString()}, para entonces deberá volver a registrarse en la página`
            });
        }

        // Si llega hasta aquí es el usuario
        return done(null, user);

    } catch (error) {
        console.log("Error en api/users/login: ", error);
        return done(null, false, {
            message: error
        });
    }

}
));

const { comprobarUsuario } = require("../controllers/user.controller");
const estaAutenticado = async (req, res, next) => {
    if(req.isAuthenticated()){
        await comprobarUsuario(req.user._id);
        return next(); // Es un middleware, por lo que se coloca entre la peticion y el acceso a la página, a la que redirige next()
    }else{
        // Añadimos un parámetro para advertir de la necesidad de iniciar sesión en el login
        res.redirect("/login?attempt=true");
    }
};


module.exports = { estaAutenticado };