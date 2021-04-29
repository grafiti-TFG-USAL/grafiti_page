// Aquí creamos dos funciones, una para poder serializar los datos en el json y para leer la info cuando la necesitemos
const jwt = require("jsonwebtoken");

const getToken = (payload) => {
    return jwt.sign({
        data: payload
    }, 
    process.env.TOKEN_SECRET,
    { expiresIn: "1d"});
}

const getTokenData = (token) => {
    
    let data = null;
    jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
        if(error) {
            console.log("Error: no se pudo obtener los datos del token");
        }else{
            data = decoded;
        }
    });

    return data;

}

module.exports = {
    getToken,
    getTokenData
}