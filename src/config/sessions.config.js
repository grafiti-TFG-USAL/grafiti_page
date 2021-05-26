module.exports = (app, session) => {

    // Gestión de acceso a recursos restringidos
    const passport = require("passport");

    // Almacenamiento de sesiones en la bd
    const MongoStore = require("connect-mongo");
    
    const { DB_uri } = require("./db.config.js");

    app.use(session({
        secret: process.env.SESSION_SECRET, //salt del algoritmo de cifrado
        resave: true, //fuerza que cada llamada al servidor guarde la info de sesión sin importar si hubieron cambios
        saveUninitialized: true, //guarda en la bd el objeto vacío aunque no hubiera info en el principio
        store: MongoStore.create({ //bd para almacenar sesiones
            mongoUrl: DB_uri,
            collectionName: "sessions",
            ttl: 30 * 24 * 60 * 60, //30 días
            autoReconnect: true,
            crypto: { secret: process.env.MONGO_SESSION_SECRET },
            autoRemove: 'interval',
            autoRemoveInterval: 10 //borrar sesiones expiradas cada 10 minutos
        })
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());

}