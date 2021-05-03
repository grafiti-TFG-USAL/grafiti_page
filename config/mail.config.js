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
        await transporter.sendMail({
            from: `Grafiti Page <${mail.user}>`, // sender address
            to: email, // list of receivers
            subject, // Subject line
            text: "Mensaje automático de la página Grafiti Page", // plain text body
            html // html body
        });
    } catch (error) {
        console.log("Algo no ha funcionado con el email: ", error);
    }
}

const getTemplate = (name, token, host) => {
    return `
        <div>
            <!--img src="" alt=""-->
            <h4>Hola, ${name}</h4>
            <p>Para confirmar tu cuenta, haz click en el siguiente enlace</p>
            <a href="http://${host}/api/users/confirm/${token}">
            Confirmar cuenta</a>
        </div>`;
}

module.exports = {
    sendEmail,
    getTemplate
}