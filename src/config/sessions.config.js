module.exports = (app, session) => {

    // Gestión de acceso a recursos restringidos
    const passport = require("passport");

    // Almacenamiento de sesiones en la bd
    const MongoStore = require("connect-mongo");
    
    const { DB_uri } = require("./db.config.js");

    app.use(session({
        secret: process.env.SESSION_SECRET, //salt del algoritmo de cifrado
        resave: false, //fuerza que cada llamada al servidor guarde la info de sesión sin importar si hubieron cambios
        saveUninitialized: false, //guarda en la bd el objeto vacío aunque no hubiera info en el principio
        cookie: {
            maxAge: 30 * 24 * 60 * 60, //30 días
        },
        store: MongoStore.create({ //bd para almacenar sesiones
            mongoUrl: DB_uri,
            collectionName: "sessions",
            ttl: (4 * 365 + 1) * 24 * 60 * 60, // 4 años
            autoReconnect: true,
            //crypto: { secret: process.env.MONGO_SESSION_SECRET }, //TODO: reactivar al final
            autoRemove: 'interval',
            autoRemoveInterval: 10 //borrar sesiones expiradas cada 10 minutos
        })
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());

}