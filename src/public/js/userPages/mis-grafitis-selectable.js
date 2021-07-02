// Elementos
const gallery = document.getElementById("gallery");

// Variables
var batch = 0;
const imagesPBatch = 100;
var nImages = 0;
var limReached = false;

// Parámetros de la query
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const minDate = params.minDate ? Date(params.minDate) : null;
const maxDate = params.maxDate ? Date(params.maxDate) : null;
var searchZone_ = null;
if(params.lat && params.lng && params.radio) {
    searchZone_ = { 
        lng: Number.parseFloat(params.lng), 
        lat: Number.parseFloat(params.lat), 
        radio: Number.parseFloat(params.radio),
    }
}
const searchZone = searchZone_;

// Rellena la galería
async function fillGallery() {

    if (limReached) {
        console.log("Límite alcanzado");
        return;
    }

    try {

        // Obtenemos la tanda de imágenes
        const images = await fetchNextImageBatch(batch, imagesPBatch);

        // Rellenamos la galería con la tanda obtenida
        if (images) {
            addImagesToGallery(images);
        } else {
            limReached = true;
        }

    } catch (error) {
        const msg = "Error al llenar la galería: " + error;
        console.error(msg);
        window.alert(msg);
    }

}

/**
 * Función que solicita las imágenes que cargar
 * @param {Number} batch - El número de lote
 * @param {Number} imagesPBatch - Las imágenes por lote
 * @returns {Array} Array de imágenes o null
 */
async function fetchNextImageBatch(batch, imagesPBatch) {

    // Parámetros de la consulta
    const body = {
        batch, // El número de lote que recibir
        images: imagesPBatch, // Cuantos grafitis devuelve por lote (lim=100)
        self: true, // Si devuelve grafitis propios o de toda la base
        minDate, maxDate, searchZone, // Filtros
    };

    // Hacemos la consulta
    const fetchURI = `/api/grafitis/get-grafiti-batch`;
    const data = await fetch(fetchURI, {
        method: "POST",
        body,
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

    // Pasamos al siguiente lote
    batch++;

    // LLevamos la cuenta del número de grafitis cargados
    nImages += result.images.length;
    console.log(result);
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
        const img = document.createElement("img");
        img.src = `/api/grafitis/get-thumbnail/${image._id}`;
        gallery.appendChild(img);
    }
    
}

fillGallery();