// Elementos
const gallery = document.getElementById("gallery");

// Variables
var batch = 0;
const imagesPBatch = gallery? Number.parseInt(gallery.dataset.limit) : 0;
var nImages = imagesPBatch * batch;
var limReached = false;
var nGrafitis = null;
console.log("imagespbatch: ", imagesPBatch)

// Parámetros de la query
/*const urlSearchParams = new URLSearchParams(window.location.search);
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
const searchZone = searchZone_;*/

// Rellena la galería
var ejecutando = false;
async function fillGallery() {

    ejecutando = true;
    if (limReached) {
        console.log("Límite alcanzado");
        return;
    }
    
    if (!gallery) {
        console.log("Sin imágenes");
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
        self: false, // Si devuelve grafitis propios o de toda la base
        minDate: null, maxDate: null, searchZone: null, // Filtros
    };
    console.log("BODY: ", body)
    // Hacemos la consulta
    //const fetchURI = `/api/grafitis/get-search-batch`;
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

}

// Manejadora del evento de selección de un grafiti
function selectEventHandler(event) {
    
    // TODO: abrir modal y tal
    
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
        
        const input = document.createElement("img");
        input.classList.add("gallery-img");
        input.addEventListener("click", selectEventHandler);
        input.id = `${image._id}`;
        //li.appendChild(input);
        const label = document.createElement("label");
        label.setAttribute("for", `${image._id}`);
        label.classList.add("percentage");
        li.appendChild(label);
        input.loading = "lazy";
        input.classList.add("gallery-img");
        input.src = `/api/grafitis/get/${image._id}`;
        //TODO pongo aqui la puntuación?
        input.alt = `${image.description}`;
        label.appendChild(input);
    }

}

// Cuando el usuario esté cerca del límite cargamos
$(window).scroll(function () {
    if (!limReached && !ejecutando) {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 300) {
            fillGallery();
        }
    }
});

window.onload = function() {
    fillGallery();
};