// Elementos
const gallery = document.getElementById("gallery");

// Variables
const grafitiPpalId = document.getElementById("grafitiImg").dataset.grafiti;
var batch = 0;
const imagesPBatch = gallery? Number.parseInt(gallery.dataset.limit) : 0;
var nImages = imagesPBatch * batch;
var limReached = false;
var nGrafitis = null;

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
        id: grafitiPpalId, // id del grafiti que recuperar
        skip, // Cuantos grafitis tenemos ya
        limit, // Cuantos grafitis tiene que devolver
    };
    
    // Hacemos la consulta
    const fetchURI = `/api/grafitis/get-search-batch`;
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
        li.id = `li_${image._id}`;
        gallery.appendChild(li);
        
        const input = document.createElement("img");
        input.classList.add("gallery-img");
        input.id = `${image._id}`;
        
        const label = document.createElement("label");
        label.setAttribute("for", `${image._id}`);
        label.classList.add("percentage");
        label.textContent = `${Number.parseFloat(image.percentage).toFixed(2)}`;
        li.appendChild(label);
        input.loading = "lazy";
        input.classList.add("gallery-img");
        input.src = `/api/grafitis/get/${image._id}`;
        input.title = `${Number.parseFloat(image.percentage).toFixed(2)}`;
        if(image.match) {
            if(image.match_status) {
                input.classList.add("matched", "match-confirmed");
            } else {
                input.classList.add("matched", "match-pending");
            }
            input.addEventListener("click", redirectEventHandler);
        } else {
            input.addEventListener("click", selectEventHandler);
        }
        li.appendChild(input);
    }

}

async function redirectEventHandler(event) {
    const candidateId = event.target.id;
    window.location.href = "/usuario/grafiti/"+candidateId;
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
    fillImage1();
};
