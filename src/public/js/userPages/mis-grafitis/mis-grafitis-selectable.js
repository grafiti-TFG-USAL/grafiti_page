// Elementos
const gallery = document.getElementById("gallery");
const nSelected_span = document.getElementById("nSelected");
const nGrafitis_span = document.getElementById("nGrafitis");

// Variables
var batch = 1;
const imagesPBatch = gallery? Number.parseInt(gallery.dataset.limit) : 0;
var nImages = imagesPBatch * batch;
var limReached = false;
var selectAll = false; // Esta indica si están TODAS seleccionadas
var allSelected = false; // Esta indica si se han seleccionado todas anteriormente (para incluir las no cargadas)
var nSelected = 0;
var nGrafitis = null;

// Parámetros de la query
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const minDate = params.minDate ? params.minDate : null;
const maxDate = params.maxDate ? params.maxDate : null;
var searchZone_ = null;
if (params.lat && params.lng && params.radio) {
    searchZone_ = {
        lng: Number.parseFloat(params.lng),
        lat: Number.parseFloat(params.lat),
        radio: Number.parseFloat(params.radio),
    }
}
const searchZone = searchZone_;

// Rellena la galería
var ejecutando = false;
async function fillGallery() {

    ejecutando = true;
    if (limReached) {
        return;
    }
    
    if (!gallery) {
        return;
    }

    try {

        // Obtenemos la tanda de imágenes
        const images = await fetchNextImageBatch(batch*imagesPBatch, imagesPBatch);
        
        // Pasamos al siguiente lote
        batch++;

        // Rellenamos la galería con la tanda obtenida
        if (images && images.length > 0) {
            addImagesToGallery(images);
        } else {
            limReached = true;
        }

    } catch (error) {
        const msg = "Error al llenar la galería: " + error;
        console.error(msg);
        window.alert(msg);
    }

    ejecutando = false;

}

/**
 * Función que solicita las imágenes que cargar
 * @param {Number} batch - El número de lote
 * @param {Number} imagesPBatch - Las imágenes por lote
 * @returns {Array} Array de imágenes o null
 */
async function fetchNextImageBatch(skip, limit) {

    // Parámetros de la consulta
    const body = {
        skip, // Cuantos grafitis tenemos ya
        limit, // Cuantos grafitis tiene que devolver
        self: true, // Si devuelve grafitis propios o de toda la base
        minDate, maxDate, searchZone, // Filtros
    };
    
    // Hacemos la consulta
    const fetchURI = `/api/grafitis/get-grafiti-batch`;
    const data = await fetch(fetchURI, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
    });
    if (!data) {
        throw "No se ha recibido respuesta de la API";
    }

    // Recogemos los datos
    const result = await data.json();
    if (!result) {
        throw "No se han podido parsear los datos recibidos";
    }
    if (!result.success) {
        throw "Ha habido un fallo en la consulta: " + result.message;
    }

    nGrafitis = result.nGrafitis;
    // LLevamos la cuenta del número de grafitis cargados
    nImages += result.images.length;
    // Si no había grafitis que cargar
    if (nImages == 0) {
        limReached = true;
        displayNoGrafitis();
        return null;
    }

    // Si no se han recibido grafitis
    if (result.images.length == 0) {
        limReached = true;
        return null;
    } else {
        nGrafitis = result.nGrafitis;
        if (nImages == nGrafitis) {
            limReached = true;
        }
        nGrafitis_span.innerText = `${nGrafitis}`;
    }

    // En cualquier otro caso, devolvemos las imágenes recibidas
    return result.images;

}

// Vacía la galería e indica que no hay grafitis
function displayNoGrafitis() {

    limReached = true;

    while (gallery.firstChild) {
        gallery.removeChild(gallery.firstChild);
    }

    const h3 = document.createElement("h3");
    h3.classList.add("display-4", "text-center", "justify-content-center");
    h3.innerText = "No hay grafitis";
    gallery.appendChild(h3);
    const btn_select_all = document.getElementById("select_all");
    btn_select_all.classList.add("d-none");

}

// Manejadora del evento de cambio de estado de un checkbox
function changeEventHandler(event) {
    // Si estaban todos activados, ya no lo estarán todos
    if (selectAll && btn_select_all) {
        while (btn_select_all.firstChild) {
            btn_select_all.removeChild(btn_select_all.firstChild);
        }
        btn_select_all.appendChild(div_select_all);
        btn_select_all.classList.replace("btn-outline-primary", "btn-primary");
    }
    // Si el evento es marcar un checkbox
    if(event.currentTarget.checked) {
        // Mostramos los botones de acción
        setFloatingButtons(true);
        nSelected++;
    } // Si es desmarcarlo
    else {
        // Comprobamos si están todos deseleccionados
        checkButtons();
        // No se estarán seleccionando todos
        selectAll = false;
        nSelected--;
    }
    nSelected_span.innerText = `${nSelected}`;
}

/**
 * Añade el array de imágenes recibido al final de la galería
 * @param {Array} images - Array con las imágenes
 */
function addImagesToGallery(images) {

    if (!images || images.length == 0) {
        limReached = true;
        return;
    }

    for (const image of images) {
        const li = document.createElement("li");
        gallery.appendChild(li);
        const input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("checkbox");
        input.checked = allSelected;
        input.addEventListener("change", changeEventHandler);
        input.id = `${image._id}`;
        li.appendChild(input);
        const label = document.createElement("label");
        label.setAttribute("for", `${image._id}`);
        label.classList.add("check_label");
        li.appendChild(label);
        const img = document.createElement("img");
        img.loading = "lazy";
        img.classList.add("gallery__img");
        img.src = `/api/grafitis/get-thumbnail/${image._id}`;
        img.alt = `${image.description}`;
        label.appendChild(img);
    }

}

// Añadimos el manejador de evento a los checkboxes iniciales renderizados en el ejs
function initCheckboxes() {
    const checkboxes = document.getElementsByClassName("checkbox");
    for (const checkbox of checkboxes) {
        checkbox.addEventListener("change", changeEventHandler);
        checkbox.checked = false;
    }
}

// Función que hace aparecer/desaparecer los botones flotantes
const floatingButtons = document.getElementById("floating-buttons");
const downloadBtn = document.getElementById("download");
const deleteBtn = document.getElementById("delete");
function setFloatingButtons(visible) {
    // Si hay que activarlos
    if(visible) {
        if(floatingButtons.classList.contains("d-none")) {
            floatingButtons.classList.remove("d-none");
        }
        if(downloadBtn.hasAttribute("disabled")) {
            downloadBtn.removeAttribute("disabled");
        }
        if(deleteBtn.hasAttribute("disabled")) {
            deleteBtn.removeAttribute("disabled");
        }
    } // Si hay que desactivarlos
    else {
        if(!floatingButtons.classList.contains("d-none")) {
            floatingButtons.classList.add("d-none");
        }
        if(!downloadBtn.hasAttribute("disabled")) {
            downloadBtn.setAttribute("disabled", "true");
        }
        if(!deleteBtn.hasAttribute("disabled")) {
            deleteBtn.setAttribute("disabled", "true");
        }
    }
}

// Comprueba si algún checkbox está activado
function checkButtons() {
    const checkboxes = document.getElementsByClassName("checkbox");
    var isChecked = false;
    for(const checkbox of checkboxes) {
        if(checkbox.checked) {
            isChecked = true;
            break;
        }
    }
    // Si hay alguno activado, mostramos los botones
    setFloatingButtons(isChecked);
}

// Iniciamos el comportamiento de la página
initCheckboxes();
checkButtons();
fillGallery();

// Cuando el usuario esté cerca del límite cargamos
$(window).scroll(function () {
    if (!limReached && !ejecutando) {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 300) {
            fillGallery();
        }
    }
});

const btn_select_all = document.getElementById("select_all");
// Creamos y añadimos el contenido del botón de seleccionar todas
const div_select_all = document.createElement("div");
const span_select_all = document.createElement("span");
span_select_all.innerText = "Seleccionar todas ";
div_select_all.appendChild(span_select_all);
const icon_select_all = document.createElement("i");
icon_select_all.classList.add("fa", "fa-hand-pointer-o");
div_select_all.appendChild(icon_select_all);
if(btn_select_all) {
    btn_select_all.appendChild(div_select_all);
}
// Creamos el contenido alternativo
const div_unselect_all = document.createElement("div");
const span_unselect_all = document.createElement("span");
span_unselect_all.innerText = "Deseleccionar todas ";
div_unselect_all.appendChild(span_unselect_all);
const icon_unselect_all = document.createElement("i");
icon_unselect_all.classList.add("fa", "fa-hand-pointer-o");
div_unselect_all.appendChild(icon_unselect_all);

// Cuando el usuario pulse el botón selecionar todas
if(btn_select_all) {
    btn_select_all.addEventListener("click", (event) => {
        event.preventDefault();
        const checkboxes = document.getElementsByClassName("checkbox");
        // Si ya se estaban seleccionando todas => mostrar botón seleccionar todas y deseleccionar todas
        if (selectAll) {
            nSelected = 0;
            nSelected_span.innerText = `${nSelected}`;
            allSelected = false;
            if(btn_select_all) {
                while (btn_select_all.firstChild) {
                    btn_select_all.removeChild(btn_select_all.firstChild);
                }
                btn_select_all.appendChild(div_select_all);
                btn_select_all.classList.replace("btn-outline-primary", "btn-primary");
            }
            for (const checkbox of checkboxes) {
                checkbox.checked = false;
            }
            setFloatingButtons(false);
        } // Si no se estaban seleccionando todas => mostrar boton deseleccionar todas y seleccionar todas
        else {
            nSelected = nGrafitis;
            nSelected_span.innerText = `${nSelected}`;
            allSelected = true;
            while (btn_select_all.firstChild) {
                btn_select_all.removeChild(btn_select_all.firstChild);
            }
            btn_select_all.appendChild(div_unselect_all);
            btn_select_all.classList.replace("btn-primary", "btn-outline-primary")
            for (const checkbox of checkboxes) {
                checkbox.checked = true;
            }
            setFloatingButtons(true);
        }

        selectAll = !selectAll;
    });
}