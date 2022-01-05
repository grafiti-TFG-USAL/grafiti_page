const container = document.getElementById("container");
const label = document.getElementById("label");
const input = document.getElementById("archivo");
const preview = document.getElementById("preview");
const boton = document.getElementById("subir");
const subir_text = document.getElementById("subir_text");
const userId = boton.dataset.user;

var curFiles = [];
//Cambiamos la opacity de input porque si lo pongo a collapse se ve mal
input.style.opacity = 0;

const deleteFile = (event) => {
    const boton = event.currentTarget;
    const fileNum = parseInt(boton.name.split("delete_")[1]);
    curFiles.splice(fileNum - 1, 1);
    updateImageDisplay();
};

// Establecemos los tipos de imágenes válidos
const fileTypes = [
    "image/jpeg",
    "image/png",
];
function validFileType(file) {
    return fileTypes.includes(file.type);
}

// Función para hacer human-readable el tamaño de archivo
function returnFileSize(nBytes) {
    if (nBytes < 1024) {
        return nBytes + "bytes";
    } else if (nBytes >= 1024 && nBytes < 1048576) {
        return (nBytes / 1024).toFixed(1) + "KB";
    } else if (nBytes >= 1048576) {
        return (nBytes / 1048576).toFixed(1) + "MB";
    }
}

// Función para mostrar una preview de los archivos
function updateImageDisplay() {

    // Borramos todo el contenido del div anterior
    while (preview.firstChild) {
        preview.removeChild(preview.firstChild);
    }

    // Si no se ha seleccionado ninguna imagen
    if (curFiles.length === 0) {
        // Ponemos un mensaje en el div
        const para = document.createElement('p');
        para.textContent = "No se ha selecionado ninguna imagen aún.";
        container.classList.replace("container-fluid", "container");
        preview.appendChild(para);
        subir.disabled = true;
        subir.classList.add("disabled");
        label.innerText = "Seleccione una o varias imágenes";
        input.multiple = true;

    }
    // Si se ha seleccionado una o más imágenes
    else {

        // Hacemos el container fluido para que se pueda adaptar mejor la tabla
        container.classList.replace("container", "container-fluid");
        // Activamos el botón para permitir subidas, si una imagen no es válida se desactivará
        subir.disabled = false;
        subir.classList.remove("disabled");
        label.innerText = "Cambiar selección";

        // Creamos el div que hara la table responsive
        const div_responsive = document.createElement("div");
        div_responsive.classList.add("table-responsive");

        // Creamos la table que contendrá las imágenes
        const table = document.createElement("table");
        table.classList.add("table", "table-striped", "table-bordered");

        // Creamos la cabecera de la table
        const thead = document.createElement("thead");
        //thead.classList.add("thead-light");
        const tr_thead = document.createElement("tr");
        const headers = [
            "#",
            "Nombre",
            "size",
            "", ""
        ];
        headers.forEach(header => {
            const th_thead = document.createElement("th");
            th_thead.scope = "col";
            th_thead.innerText = header;
            tr_thead.appendChild(th_thead);
        });
        thead.appendChild(tr_thead);

        // Creamos el tbody
        const tbody = document.createElement("tbody");

        // Rellenamos la table con los previews
        var n_file = 0;
        for (const file of curFiles) {

            // Comprobamos que sea válido
            const isValid = validFileType(file);

            // Creamos el row
            const trow = document.createElement("tr");
            // Si no es válido lo alertamos
            if (!isValid) trow.classList.add("table-danger");

            // Añadimos el número de imagen
            const th = document.createElement("th");
            th.scope = "row";
            //th.classList.add("table-light");
            th.innerText = `${++n_file}`;
            trow.appendChild(th);

            // Si es válido el formato
            if (isValid) {

                // Añadimos el nombre del archivo
                const td_name = document.createElement("td");
                td_name.innerText = file.name;
                trow.appendChild(td_name);

                // Añadimos el tamaño del archivo
                const td_size = document.createElement("td");
                td_size.innerText = `${returnFileSize(file.size)}`;
                trow.appendChild(td_size);

                // Añadimos el preview de la imagen
                const td_img = document.createElement("td");
                td_img.style = "text-align: center; vertical-align: middle";
                const img_prev = document.createElement("img");
                //img_prev.height = "64";
                //img_prev.width = "128";
                img_prev.style = "max-width: 128px; max-height:64px";
                img_prev.src = URL.createObjectURL(file);
                td_img.appendChild(img_prev);
                trow.appendChild(td_img);

                // Añadimos el botón de eliminar
                const td_button = document.createElement("td");
                td_button.style = "vertical-align: middle";
                const delete_button = document.createElement("button");
                delete_button.classList.add("btn", "btn-danger");
                delete_button.type = "button";
                delete_button.name = `delete_${n_file}`;
                delete_button.addEventListener("click", deleteFile);
                const icon_delete = document.createElement("i");
                icon_delete.classList.add("fa", "fa-trash");
                delete_button.appendChild(icon_delete);
                td_button.appendChild(delete_button);
                trow.appendChild(td_button);

            }
            // Si el formato del archivo no es válido 
            else {

                // Al haber un fichero inválido, se cancela la subida
                subir.disabled = true;
                subir.classList.add("disabled");

                // Añadimos el nombre del archivo
                const td_error = document.createElement("td");
                td_error.innerText = `El archivo "${file.name}" no coincide con el formato de archivo requerido (.jpg / .jpeg / .png)`;
                td_error.colSpan = 3;
                trow.appendChild(td_error);

            }

            tbody.appendChild(trow);

        }

        // Añadimos el head y body a la table
        table.appendChild(thead);
        table.appendChild(tbody);

        // Añadimos la table al div
        div_responsive.appendChild(table);

        // Añadimos el div al preview
        preview.appendChild(div_responsive);

        // Ponemos un botón para añadir más imágenes
        const div_row = document.createElement("div");
        div_row.classList.add("row", "col");
        const label_anadir = document.createElement("label");
        label_anadir.htmlFor = "anadir";
        label_anadir.classList.add("btn", "btn-success");
        const icon_plus = document.createElement("i");
        icon_plus.classList.add("fa", "fa-plus");
        label_anadir.appendChild(icon_plus);
        const span_anadir = document.createElement("span");
        span_anadir.innerText = " Añadir";
        label_anadir.appendChild(span_anadir);
        const input_anadir = document.createElement("input");
        input_anadir.type = "file";
        input_anadir.classList.add("d-none");
        input_anadir.style.opacity = 0;
        input_anadir.required = false;
        input_anadir.name = "anadir";
        input_anadir.id = "anadir";
        input_anadir.accept = "image/png, image/jpeg";
        input_anadir.multiple = true;

        input_anadir.addEventListener('change', () => {

            // Obtenemos las imágenes seleccionadas
            const curAddFiles = input_anadir.files;
            //input.files.push(curAddFiles[0]);
            // Si se ha seleccionado alguna imagen
            if (curAddFiles.length !== 0) {
                for (const file of curAddFiles) {
                    curFiles.push(file);
                }
                updateImageDisplay();

                window.location.href = "#footer";
            }

        });

        div_row.appendChild(label_anadir);
        div_row.appendChild(input_anadir);

        preview.appendChild(div_row);

    }
}

input.addEventListener('change', () => {

    // Eliminamos los archivos anteriores
    while (curFiles.length > 0)
        curFiles.pop();

    // Obtenemos los archivos subidos
    const newSelectedFiles = input.files;
    for (const file of newSelectedFiles) {
        curFiles.push(file);
    }

    // Refrescamos
    updateImageDisplay();

    window.location.href = "#footer";

});

const form = document.getElementById("upload-form");
const spinner = document.getElementById("spinner");

// Iniciamos el socket
const socket = io();
const progress = document.getElementById("progress");
const progressbar = document.getElementById("progressbar");

socket.on("upload:step", data => {
    if(progress.classList.contains("d-none")) {
        progress.classList.remove("d-none");
        subir_text.innerText ="Procesando";
    }
    progressbar.innerText = `${data.percentage}%`;
    progressbar.style.width = `${data.percentage}%`;
});

form.addEventListener("submit", async (event) => {
    // Anulamos el comportamiento por defecto (recargar página)
    event.preventDefault();

    //Efectos
    spinner.classList.remove("d-none");
    subir_text.innerText ="Subiendo";

    try {

        // Creamos y rellenamos un form data con el nombre del form y los archivos a subir
        const formData = new FormData();

        curFiles.forEach(file => {
            formData.append("imagenes", file);
        });
        
        progressbar.style.width = "0%";

        socket.emit("upload:init", { userId });

        // Enviamos la consulta POST a la api de registro con los datos del usuario a registrar
        const data = await fetch("/api/grafitis/upload", {
            method: "POST",
            body: formData
        });


        const respuesta = await data.json();

        socket.emit("upload:finish", { userId });
        spinner.classList.add("d-none");
        subir_text.innerText ="Listo";
        progressbar.classList.remove("progress-bar-striped", "progress-bar-animated");
        progressbar.classList.replace("bg-success", "bg-principal");

        // Si ha habido algun fallo, lo mostramos
        if (!respuesta.success) {
            console.log("Error en la subida: ", respuesta.message);

            var mensajeError;
            if (respuesta.errores.length < 1) {
                mensajeError = "Error no identificado";
            } else {
                if (respuesta.errores.length > 1) {
                    mensajeError = "Errores:\n";
                } else {
                    mensajeError = "Error: \n";
                }

                for (const err of respuesta.errores) {
                    mensajeError += " > " + err + "\n";
                }
                mensajeError += "El resto de archivos se han subido correctamente";
            }

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = mensajeError;

            $('#modal').modal();
        }
        // Si todo sale bien vamos a la página de usuario
        else {
            window.location.href = "/usuario";
            // El middleware de passport comprobará que se haya iniciado bien la sesión
        }

    } catch (error) {
        // Si algo falla en el proceso mostramos el mensaje de error
        console.log("Error en la subida: ", error);

        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = error;

        $('#modal').modal();
    }

});
