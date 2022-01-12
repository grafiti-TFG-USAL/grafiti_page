const mail = {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
}

const nodemailer = require("nodemailer");

// Creamos un objeto transporter con la configuración propia del servidor del correo (GMAIL)
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // SSL
    secure: true, // Usamos SSL
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user: mail.user,
        pass: mail.pass
    },
});

const sendEmail = async (email, subject, html) => {
    try {
        // Enviamos el correo
        const res = await transporter.sendMail({
            from: `Grafiti Page no-reply <${mail.user}>`, // Nombre y correo del emisor
            to: email, // Lista de receptores
            subject, // Asunto
            text: "Mensaje automático de la página Grafiti Page", // Cuerpo del mensaje
            html // HTML del mensaje
        });

        const state = res.response.split(" ")[2];
        if (state !== "OK" && res.accepted.contains(email)) {
            throw "El mensaje no se ha podido enviar";
        } else {
            return {
                success: true,
                message: "Mensaje enviado con éxito"
            };
        }

    } catch (error) {
        console.error("Error al enviar el mensaje: " + error);
        return {
            success: false,
            message: "Error al enviar el mensaje: " + error
        };
    }
}

const getConfirmTemplate = (name, token, host) => {
    return `
        <div>
            <!--img src="" alt=""-->
            <h4>Hola, ${name}</h4>
            <p>Para confirmar tu cuenta, haz click en el siguiente enlace</p>
            <a href="http://${host}/api/users/confirm/${token}">
            Confirmar cuenta</a>
            <br><br><br>
            <p>Si no valida su cuenta antes de 2 días deberá volver a registrarse</p>
        </div>`;
}

const { envBoolean } = require("../helpers/env-bool.js");
const getAdminConfirmTemplate = (user, token, host) => {
    
    let template = `
        <div>
            <!--img src="" alt=""-->
            <h4>Solicita crear una cuenta de usuario en el sistema</h4>
            <br>
            <p>Nombre: ${user.name}</p>
            <p>Apellidos: ${user.surname}</p>
            <p>Email: ${user.email}</p>`;

    if(envBoolean("PIN_REQUIRED")) {
            template += `
                <br>
                <p>Código: ${user.PIN}</p>`;
    }
    
    template += `
            <br><br>
            <a href="http://${host}/api/users/admin-refuse/${token}" style="color: red; padding: 3px; border: 1px solid red;">
            Rechazar solicitud</a>
            <a href="http://${host}/api/users/admin-confirm/${token}" style="color: green; padding: 3px; border: 1px solid green; margin-left: 5px;">
            Permitir acceso al sistema</a>
        </div>`;
    
    return template;
}

const getAdminConfirmedTemplate = (name, userConfirmed, host) => {
    
    let template = `
        <div>
            <!--img src="" alt=""-->
            <h4>Hola, ${name}</h4>
            <p>Te informamos de que un administrador ha verificado tus credenciales.</p>`;
            
    if(userConfirmed) {
        
        template += `<p>Como ya has verificado tu cuenta de correo electrónico, desde este momento puedes <a href="http://${host}/login">acceder al sistema</a>.</p>`
        
    } else {
        
        template += `<p>Parece que todavía no has validado tu dirección de correo electrónico. Hasta que no verifiques tu cuenta, no podrás acceder al sistema. Disculpe las molestias.</p>`
        
    }
    
    return template + `    </div>`;
}

const getRecoverTemplate = (name, token, host) => {
    return `
        <div>
            <!--img src="" alt=""-->
            <h4>Hola, ${name}</h4>
            <p>Para reestablecer la contraseña de tu cuenta, haz click en el siguiente enlace</p>
            <a href="http://${host}/restorePassword/${token}">
            Cambiar contraseña</a>
            <br><br><br>
            <p>Si no reestablece su contraseña antes de 2 días desde en envío de este correo, el enlace caducará y deberá enviar una nueva solicitud para efectuar el cambio.</p>
        </div>`;
}

const getMatchNotificationTemplate = (name, grafitiID, host) => {
    return `
        <div>
            <h4>Hola, ${name}</h4>
            <p>¡Buenas noticias!</p>
            <p>Un usuario ha detectado que uno de tus grafitis tiene una coincidencia con uno de los suyos.</p>
            <a href="" target="_blank"><img src="http://${host}/api/grafitis/get/${grafitiID}"></a>
            <br><br><br>
            <p>Puede ver el match haciendo click <a href="http://${host}/usuario/matches/${grafitiID}" target="_blank">AQUÍ</a>.</p>
        </div>`;
}

module.exports = {
    sendEmail,
    getConfirmTemplate,
    getAdminConfirmTemplate,
    getAdminConfirmedTemplate,
    getRecoverTemplate,
    getMatchNotificationTemplate
}