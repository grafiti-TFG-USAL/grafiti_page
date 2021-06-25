// Script de la página

const grafitiImg = document.getElementById("grafitiImg");
let alterado = false;

// Al cambiar el textarea de descripción
document.getElementById("description").addEventListener("input", (event) => {
    const check = document.getElementById("check_desc");
    const btn = document.getElementById("desc_btn");
    if (!check.classList.contains("d-none"))
        check.classList.add("d-none");
    if (btn.classList.contains("d-none")) {
        btn.classList.remove("d-none");
    }
    if (btn.classList.contains("btn-success")) {
        btn.classList.replace("btn-success", "btn-warning");
        document.getElementById("btn_text").innerText = "Guardar";
    }
    if (!alterado)
        alterado = true;
});

// Al darle a guardar la descripción
document.getElementById("desc_btn").addEventListener("click", async (event) => {

    // Evitamos que recargue la página
    event.preventDefault();
    if (!alterado) return;

    document.getElementById("spinner_desc").classList.remove("d-none");
    if (!document.getElementById("check_desc").classList.contains("d-none"))
        document.getElementById("check_desc").classList.add("d-none");
    document.getElementById("btn_text").innerText = "Guardando";

    try {
        const textarea = document.getElementById("description");

        console.log("Preparado para enviar desc: ", textarea.value);
        // Enviamos la consulta POST a la api
        const data = await fetch(`/api/grafitis/update/${grafitiImg.dataset.grafiti}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ // Enviamos los datos a la api en formato JSON
                cambio: "descripcion", atributo: textarea.value
            })
        });

        const respuesta = await data.json();

        document.getElementById("spinner_desc").classList.add("d-none");
        // Comprobamos que no haya fallado
        if (!respuesta.success) {
            console.log("Fallo en respuesta: ", respuesta.message);

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = respuesta.message;
            $("#ubicacion").modal("hide");
            $("#eliminacion").modal("hide");
            $('#modal').modal();
        } else {
            console.log(respuesta)
            document.getElementById("check_desc").classList.remove("d-none");
            document.getElementById("desc_btn").classList.replace("btn-warning", "btn-success");
            document.getElementById("btn_text").innerText = "Guardado";
        }

    } catch (error) {
        console.log("Catch error: ", error);

        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = respuesta.error;
        $("#ubicacion").modal("hide");
        $("#eliminacion").modal("hide");
        $('#modal').modal();
    }
});

// Al darle a eliminar
document.getElementById("remove_def").addEventListener("click", async (event) => {
    event.preventDefault();

    document.getElementById("spinner_remove").classList.remove("d-none");

    try {

        // Enviamos la consulta POST a la api
        const data = await fetch(`/api/grafitis/remove/${grafitiImg.dataset.grafiti}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const respuesta = await data.json();

        // Comprobamos que no haya fallado
        if (!respuesta.success) {
            console.log("Fallo en respuesta: ", respuesta.message);
            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = respuesta.message;
            $("#ubicacion").modal("hide");
            $("#eliminacion").modal("hide");
            $('#modal').modal();
        } else {

            // Volvemos al dashboard de usuario
            window.location.href = "/usuario";

        }

    } catch (error) {
        console.log("Catch error: ", error);

        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = error;
        $("#ubicacion").modal("hide");
        $("#eliminacion").modal("hide");
        $('#modal').modal();
    }

});