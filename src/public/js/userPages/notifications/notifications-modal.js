const fillMatchModal = async (grafiti1_id, grafiti2_id) => {
    
    try {
        
        //// GRAFITI 1
        const image_1 = await fetchImage(grafiti1_id);
        // Ponemos la imagen en el espacio asignado
        const image1_box = document.getElementById("imagen_1");
        while(image1_box.firstChild) {
            image1_box.removeChild(image1_box.firstChild);
        }
        const image1 = document.createElement("img");
        image1.classList.add("w-100");
        image1.id = "first_image";
        image1.dataset.id = image_1._id;
        image1.src="/api/grafitis/get/" + image_1._id;
        image1_box.appendChild(image1);
        
        // Iniciamos el mapa
        const coordElem1 = image_1.gps;
        const mapa_1 = document.getElementById("mapa_1");
        if(coordElem1 === undefined){
            if(!mapa_1.classList.contains("d-none")){
                mapa_1.classList.add("d-none");
            }
            return;
        }
        if(mapa_1.classList.contains("d-none")){
            mapa_1.classList.remove("d-none");
        }
        const coords1 = { 
            lat: coordElem1.location.coordinates[1], 
            lng: coordElem1.location.coordinates[0]
        };
        const map1 = new google.maps.Map(mapa_1, {
            center: coords1,
            zoom: 12,
            disableDefaultUI: true,
        });
        const marker1 = new google.maps.Marker({
            position: coords1,
            map: map1,
        });
        
        //// GRAFITI 2
        const image_2 = await fetchImage(grafiti2_id);
        // Ponemos la imagen en el espacio asignado
        const image2_box = document.getElementById("imagen_2");
        while(image2_box.firstChild) {
            image2_box.removeChild(image2_box.firstChild);
        }
        const image2 = document.createElement("img");
        image2.classList.add("w-100");
        image2.id = "second_image";
        image2.dataset.id = image_2._id;
        image2.src="/api/grafitis/get/" + image_2._id;
        image2_box.appendChild(image2);
        
        // Iniciamos el mapa
        const coordElem2 = image_2.gps;
        const mapa_2 = document.getElementById("mapa_2");
        if(coordElem2 === undefined){
            if(!mapa_2.classList.contains("d-none")){
                mapa_2.classList.add("d-none");
            }
            return;
        }
        if(mapa_2.classList.contains("d-none")){
            mapa_2.classList.remove("d-none");
        }
        
        const coords2 = { 
            lat: coordElem2.location.coordinates[1], 
            lng: coordElem2.location.coordinates[0]
        };
        const map2 = new google.maps.Map(mapa_2, {
            center: coords2,
            zoom: 12,
            disableDefaultUI: true,
        });
        const marker2 = new google.maps.Marker({
            position: coords2,
            map: map2,
        });
        
    } catch (error) {
        console.error(error);
        window.alert(error);
    }
    
};

const fetchImage = async (imageId) => {
    
    const fetchURI = "/api/grafitis/get-info/" + imageId;
    
    const data = await fetch(fetchURI, {
        method: "GET",
    });
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
    return result.image;
};

// Función de establecer match
document.getElementById("establecer_match").addEventListener("click", async (event) => {

    event.preventDefault();

    document.getElementById("spinner_establecer").classList.remove("d-none");
    document.getElementById("establecer_match_text").innerText = "Guardando match";

    try {
        
        const grafifi1_id = document.getElementById("first_image").dataset.id;
        const grafifi2_id = document.getElementById("second_image").dataset.id;
        
        // Enviamos la consulta POST a la api
        const data = await fetch(`/api/grafitis/confirm-match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ // Enviamos los datos a la api en formato JSON
                grafiti_1: grafifi1_id,
                grafiti_2: grafifi2_id,
            })
        });

        const respuesta = await data.json();

        document.getElementById("spinner_establecer").classList.add("d-none");
        $("#match-modal").modal("hide");
        // Comprobamos que no haya fallado
        if (!respuesta.success) {
            console.error("Fallo en respuesta: ", respuesta.message);

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = respuesta.message;
            $('#modal').modal();
        } else {
            
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
        console.error("Catch error: ", error);

        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = respuesta.error;
        $("#match-modal").modal("hide");
        $('#modal').modal();
    }
});

// Función de cancelar match
document.getElementById("cancelar_match").addEventListener("click", async (event) => {

    event.preventDefault();

    document.getElementById("spinner_cancelar").classList.remove("d-none");
    document.getElementById("cancelar_match_text").innerText = "Eliminando match";

    try {
        
        const grafifi1_id = document.getElementById("first_image").dataset.id;
        const grafifi2_id = document.getElementById("second_image").dataset.id;
        
        // Enviamos la consulta POST a la api
        const data = await fetch(`/api/grafitis/not-confirm-match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ // Enviamos los datos a la api en formato JSON
                grafiti_1: grafifi1_id,
                grafiti_2: grafifi2_id,
            })
        });

        const respuesta = await data.json();

        document.getElementById("spinner_cancelar").classList.add("d-none");
        $("#match-modal").modal("hide");
        // Comprobamos que no haya fallado
        if (!respuesta.success) {
            console.error("Fallo en respuesta: ", respuesta.message);

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = respuesta.message;
            $('#modal').modal();
        } else {
            
            document.getElementById("cancelar_match_text").innerText = "Eliminado";
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
        console.error("Catch error: ", error);

        document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
        document.getElementById("contenido_adicional").innerText = respuesta.error;
        $("#match-modal").modal("hide");
        $('#modal').modal();
    }
});