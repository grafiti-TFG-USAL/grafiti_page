// Llena la primera imagen del modal
function fillImage1() {

    // Ponemos la imagen en el espacio asignado
    const image1_box = document.getElementById("imagen_1");
    const image1 = document.createElement("img");
    image1.classList.add("w-100");
    image1.id = "first_image";
    image1.dataset.id = grafitiPpalId;
    image1.src="/api/grafitis/get/" + grafitiPpalId;
    image1_box.appendChild(image1);
    
    // Iniciamos el mapa
    const coordElem = document.getElementById("map").dataset;
    const mapa_1 = document.getElementById("mapa_1");
    if(!coordElem.lat || ! coordElem.lng){
        if(!mapa_1.classList.contains("d-none")){
            mapa_1.classList.add("d-none");
        }
        return;    
    }
    if(mapa_1.classList.contains("d-none")){
        mapa_1.classList.remove("d-none");
    }
    const coords = { 
        lat: Number.parseFloat(coordElem.lat), 
        lng: Number.parseFloat(coordElem.lng)
    };
    const map = new google.maps.Map(mapa_1, {
        center: coords,
        zoom: 12,
        disableDefaultUI: true,
    });
    const marker = new google.maps.Marker({
        position: coords,
        map: map,
    });

}

// Llena la segunda imagen del modal
function fillImage2(image, percentage) {

    // Ponemos la imagen en el espacio asignado
    const image2_box = document.getElementById("imagen_2");
    while(image2_box.firstChild) {
        image2_box.removeChild(image2_box.firstChild);
    }
    const image2 = document.createElement("img");
    image2.classList.add("w-100");
    image2.id = "second_image";
    image2.dataset.id = image._id;
    image2.dataset.percentage = percentage;
    image2.src="/api/grafitis/get/" + image._id;
    image2_box.appendChild(image2);
    
    // Iniciamos el mapa
    const coordElem = image.gps;
    const mapa_2 = document.getElementById("mapa_2");
    if(coordElem === undefined){
        if(!mapa_2.classList.contains("d-none")){
            mapa_2.classList.add("d-none");
        }
        return;
    }
    if(mapa_2.classList.contains("d-none")){
        mapa_2.classList.remove("d-none");
    }
    console.log(coordElem);
    const coords = { 
        lat: coordElem.location.coordinates[1], 
        lng: coordElem.location.coordinates[0]
    };
    const map = new google.maps.Map(mapa_2, {
        center: coords,
        zoom: 12,
        disableDefaultUI: true,
    });
    const marker = new google.maps.Marker({
        position: coords,
        map: map,
    });

}

// Manejadora del evento de selección de un grafiti
async function selectEventHandler(event) {
    
    console.log(event.target.id);
    
    try {
        
        // Guardamos el id del grafiti candidato
        const candidateId = event.target.id;
        const percentage = Number.parseFloat(event.target.alt);
        
        // Solicitamos al servidor los datos del grafiti
        const fetchURI = "/api/grafitis/get-info/" + candidateId;
        const fetch_wait = fetch(fetchURI, {
            method: "GET",
        });
        
        
        const data = await fetch_wait;
        if (!data) {
            throw "No se ha podido llevar a cabo la consulta de coincidencias al servidor";
        }

        const result = await data.json();
        if (!result) {
            throw "No se ha podido extraer la información de la consulta";
        } else {
            if (!result.success) {
                throw "Ha habido un fallo en la consulta: " + result.message;
            }
        }
        
        fillImage2(result.image, percentage);
        
        // Abrimos el modal
        $('.match-modal').modal();
        
    } catch (error) {
        console.error(error);
        window.alert(error);
    }
    
}

// Función de establecer match
document.getElementById("establecer_match").addEventListener("click", async (event) => {

    event.preventDefault();

    document.getElementById("spinner_establecer").classList.remove("d-none");
    document.getElementById("establecer_match_text").innerText = "Guardando match";

    try {
        
        const grafifi1_id = document.getElementById("first_image").dataset.id;
        const grafifi2_id = document.getElementById("second_image").dataset.id;
        
        // Enviamos la consulta POST a la api
        const data = await fetch(`/api/grafitis/set-match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ // Enviamos los datos a la api en formato JSON
                grafiti_1: grafifi1_id, 
                grafiti_2: grafifi2_id,
                percentage: Number.parseFloat(document.getElementById("second_image").dataset.percentage),
            })
        });

        const respuesta = await data.json();

        document.getElementById("spinner_establecer").classList.add("d-none");
        $("#match-modal").modal("hide");
        // Comprobamos que no haya fallado
        if (!respuesta.success) {
            console.log("Fallo en respuesta: ", respuesta.message);

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = respuesta.message;
            $('#modal').modal();
        } else {
            
            console.log(respuesta);
            document.getElementById("establecer_match_text").innerText = "Guardado";
            /*
            // Eliminamos el resultado de la búsqueda
            const list_elem = document.getElementById("li_" + grafifi2_id);
            while(list_elem.firstChild) {
                list_elem.removeChild(list_elem.firstChild);
            }
            list_elem.remove();
            
            // Recargamos el carousel
            getMatches(grafifi1_id);
            */
           location.reload();
        }

    } catch (error) {
        console.log("Catch error: ", error);

        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = respuesta.error;
        $("#match-modal").modal("hide");
        $('#modal').modal();
    }
});