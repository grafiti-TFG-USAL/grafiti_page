const mail = {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
}

const nodemailer = require("nodemailer");

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // SSL
    secure: true, // Ya usamos SSL
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
        const res = await transporter.sendMail({
            from: `Grafiti Page no-reply <${mail.user}>`, // sender address
            to: email, // list of receivers
            subject, // Subject line
            text: "Mensaje automático de la página Grafiti Page", // plain text body
            html // html body
        });

        const state = res.response.split(" ")[2];
        if (state !== "OK" && res.accepted.contains(email)) {
            return {
                success: false,
                message: "El mensaje no se ha podido enviar"
            };
        } else {
            return {
                success: true,
                message: "Mensaje enviado con éxito"
            };
        }

    } catch (error) {
        console.log("Algo no ha funcionado con el email: ", error);
        return {
            success: false,
            message: "Error al enviar el mensaje" + error
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

module.exports = {
    sendEmail,
    getConfirmTemplate,
    getRecoverTemplate
}