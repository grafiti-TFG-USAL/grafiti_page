document.getElementById("form_eliminacion").addEventListener("submit", async (event) => {

    event.preventDefault();

    try {

        const email = document.getElementById("email").value;
        const checkbox = document.getElementById("check");

        document.getElementById("cargando_eliminacion").classList.remove("d-none");

        // Enviamos la consulta POST a la api
        const data = await fetch("/api/users/removeUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                checked: checkbox.checked,
            })
        });

        document.getElementById("cargando_eliminacion").classList.add("d-none");

        const respuesta = await data.json();


        // Si algo ha fallado
        if (!respuesta.success) {

            console.log("Fallo en respuesta: ", respuesta.message);
            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = "Error:\n > " + respuesta.message;
            $('#error_modal').modal();
            return;
        }
        // Si nada ha fallado
        else {

            document.location.reload();

        }

    } catch (error) {

        document.getElementById("titulo_modal").innerText = "Ha ocurrido un error";
        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = "Error:\n > " + error;
        document.getElementById("cargando_eliminacion").classList.add("d-none");

        $('#error_modal').modal();
        return;

    }


});

const btn_eliminar = document.getElementById("boton_eliminar");
btn_eliminar.addEventListener("click", (event) => {

    event.preventDefault();

    $("#eliminacion").modal();

});

const input1 = document.getElementById("password");
const input2 = document.getElementById("password2");

input1.addEventListener("input", (event) => {
    if (input1.classList.contains("is-invalid"))
        input1.classList.remove("is-invalid");
    if (input2.classList.contains("is-invalid"))
        input2.classList.remove("is-invalid");
    if (input1.value === input2.value && input1.length >= 10) {
        if (!input1.classList.contains("is-valid"))
            input1.classList.add("is-valid");
        if (!input2.classList.contains("is-valid"))
            input2.classList.add("is-valid")
    }
});

input2.addEventListener("input", (event) => {
    if (input1.classList.contains("is-invalid"))
        input1.classList.remove("is-invalid");
    if (input1.value !== input2.value) {
        if (!input2.classList.contains("is-invalid"))
            input2.classList.add("is-invalid");
    } else {
        if (input1.classList.contains("is-invalid"))
            input1.classList.remove("is-invalid");
        if (input2.classList.contains("is-invalid"))
            input2.classList.remove("is-invalid");
        if (input1.value.length >= 10) {
            if (!input1.classList.contains("is-valid"))
                input1.classList.add("is-valid");
            if (!input2.classList.contains("is-valid"))
                input2.classList.add("is-valid");
        }
    }
});

const form = document.getElementById("cambio");
form.addEventListener("submit", async (event) => {

    event.preventDefault();

    try {

        const email = document.getElementById("email").value;
        const password = input1.value;
        const password2 = input2.value;

        // Comprobamos que las contraseñas coincidan
        if (password !== password2) {
            if (!input1.classList.contains("is-invalid"))
                input1.classList.add("is-invalid");
            if (!input2.classList.contains("is-invalid"))
                input2.classList.add("is-invalid");
            document.getElementById("error").innerText = "Las contraseñas no coinciden";
            return;
        }

        document.getElementById("cargando").classList.remove("d-none");

        // Enviamos la consulta POST a la api
        const data = await fetch("/api/users/changePassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        document.getElementById("cargando").classList.add("d-none");

        const respuesta = await data.json();


        // Si algo ha fallado
        if (!respuesta.success) {

            console.log("Fallo en respuesta: ", respuesta.message);
            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = "Error:\n > " + respuesta.message;
            $('#error_modal').modal();
            return;
        }
        // Si nada ha fallado
        else {

            document.location.reload();

        }

    } catch (error) {

        document.getElementById("titulo_modal").innerText = "Ha ocurrido un error";
        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = "Error:\n > " + error;
        document.getElementById("cargando").classList.add("d-none");

        $('#error_modal').modal();
        return;

    }

});

// Función que al detectar un cambio en notificaciones habilita el botón de guardar cambios
function notification_changed(event) {
    
    const notification_btn = document.getElementById("submit_notifications");
    
    if(notification_btn.classList.contains("btn-secondary")){
        notification_btn.classList.replace("btn-secondary", "btn-warning");
    }
    if(notification_btn.classList.contains("btn-success")){
        notification_btn.classList.replace("btn-success", "btn-warning");
    }
    notification_btn.removeAttribute("disabled");
    
};
const matches = document.getElementById("matches");
matches.addEventListener("change", notification_changed);

// Definimos el comportamiento del formulario de notificaciones para establecer los cambios
const form_notifications = document.getElementById("notificaciones");
form_notifications.addEventListener("submit", async (event) => {

    event.preventDefault();

    const cargando = document.getElementById("cargando_notificaciones");
    
    try {

        console.log("Ejecutandose")
        // Recogemos los cambios efectuados
        const chk_matches = matches.checked;

        cargando.classList.remove("d-none");

        // Enviamos la consulta POST a la api
        const fetchURI = `/api/users/changeEmailNotificationsConfig/`
        const data = await fetch(fetchURI, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                matches: chk_matches,
            }),
        });

        cargando.classList.add("d-none");
        
        const respuesta = await data.json();

        // Si algo ha fallado
        if (!respuesta.success) {

            console.log("Fallo en respuesta: ", respuesta.message);
            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = "Error:\n > " + respuesta.message;
            $('#error_modal').modal();
            return;
        }
        // Si nada ha fallado
        else {
  
            const notification_btn = document.getElementById("submit_notifications");
            notification_btn.classList.replace("btn-warning", "btn-success");
            notification_btn.setAttribute("disabled", "true");

        }

    } catch (error) {

        document.getElementById("titulo_modal").innerText = "Ha ocurrido un error";
        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = "Error:\n > " + error;
        document.getElementById("cargando").classList.add("d-none");

        $('#error_modal').modal();
        return;

    }

});