// SCRIPT DEL COMPORTAMIENTO DEL MODAL DE FILTRO DE UBICACIÓN

// Crea el mapa
function createMap(coords) {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: coords,
        zoom: 4
    });

    return map;
}
// Crea el marcador del mapa
function createMarker(map, coords) {
    var marker = new google.maps.Marker({
        map: map,
        position: coords,
        draggable: true,
    });

    return marker;
}
// Crea el círculo del mapa
function createCircle(map, coords, radius) {
    var circle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.3,
        map: map,
        center: coords,
        radius: radius * 1000, // Convertir km a m
    });

    return circle;
}
// Cambia la localización del marcador a la dirección buscada
async function searchAddress(address, coords, map, geocoder, bounds, marker, circle) {

    geocoder.geocode({ address, bounds }, async (results, status) => {

        if (status === "OK") {

            //Guardamos las coordenadas
            coords.lat = await results[0].geometry.location.lat();
            coords.lng = await results[0].geometry.location.lng();

            // Cambiamos la posición del marcador
            marker.setPosition(coords);
            // Cambiamos la posición del círculo
            circle.setCenter(coords);
            // Ajustamos el mapa a los resultados
            map.fitBounds(circle.getBounds());

            setAddress(geocoder, document.getElementById("direccion"), coords);

        } else {
            alert("No se ha encontrado la dirección");
            console.log("Geocode failed due to: " + status);
        }

    });

}
// Establece en el input de dirección la dirección correspondiente a las coordenadas
function setAddress(geocoder, input, coords) {

    geocoder.geocode({ location: coords }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                input.value = results[0].formatted_address;
            } else {
                window.alert("No se han podido localizar las coordenadas");
                console.log("No se han podido localizar las coordenadas");
            }
        } else {
            window.alert("No se han podido localizar las coordenadas");
            console.log("Geocoder failed due to: " + status);
        }
    });

}
// Modifica el radio del círculo
function modifyRadius(map, circle, radius) {
    circle.setRadius(radius * 1000);
    map.fitBounds(circle.getBounds());
}

function initMap() {

    //// Inicialización

    // Instanciamos el objeto de cordenadas, iniciado en Salamanca
    const coords = { lat: 40.973672887751604, lng: -5.66406277873948 }
    // Instanciamos el mapa
    const map = createMap(coords);
    // Instanciamos el codificador direccion<->coordenadas
    const geocoder = new google.maps.Geocoder();
    // Inicializamos el marcador
    const marker = createMarker(map, coords);
    // Inicializamos el radio, en km
    let radio = 5;
    // Inicializamos el círculo
    const circle = createCircle(map, coords, radio);
    // Enfocamos el mapa en el viewport del círculo
    map.fitBounds(circle.getBounds());

    //// Manejo de eventos

    // Eventos de introducir dirección en la barra
    document.getElementById("direccion").addEventListener("keyup", (event) => {
        // El código 13 es el equivalente a la tecla Enter
        if (event.keyCode === 13) {
            event.preventDefault();
            const address = event.target.value;
            searchAddress(address, coords, map, geocoder, map.getBounds(), marker, circle);
        }
    });
    document.getElementById("buscar_direccion").addEventListener("click", (event) => {
        event.preventDefault();
        const address = document.getElementById("direccion").value;
        const result = searchAddress(address, coords, map, geocoder, map.getBounds(), marker, circle);
    });

    // Evento de modificar el radio del área de búsqueda
    document.getElementById("radius").addEventListener("input", (event) => {
        radio = parseFloat(event.target.value);
        modifyRadius(map, circle, radio);
        document.getElementById("showRadius").innerText = `${radio} km`;
    });

    // Evento de cambiar el marcador de coordenadas
    google.maps.event.addListener(marker, "dragend", async (event) => {
        const input = document.getElementById("direccion");
        coords.lat = await event.latLng.lat();
        coords.lng = await event.latLng.lng();
        setAddress(geocoder, input, coords);
        circle.setCenter(coords);
        map.fitBounds(circle.getBounds());
    });

    // Evento de aplicación del filtro de búsqueda por zona
    document.getElementById("aplicar_filtro_zona").addEventListener("click", (event) => {
        event.preventDefault();
        document.getElementById("spinner_zona").classList.remove("d-none"); const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        console.log("Params: ", params);
        var query = `?`;
        var precedentes = false;
        if (params.page) {
            query += precedentes ? "&" : "";
            query += `page=${params.page}`;
            precedentes = true;
        }
        if (params.minDate) {
            query += precedentes ? "&" : "";
            query += `minDate=${params.minDate}`;
            precedentes = true;
        }
        if (params.maxDate) {
            query += precedentes ? "&" : "";
            query += `maxDate=${params.maxDate}`;
            precedentes = true;
        }
        query += precedentes ? "&" : "";
        query += `lat=${coords.lat}&lng=${coords.lng}&radio=${radio}`;
        precedentes = true;

        console.log("Query: " + query);
        window.location.href = query;
        document.getElementById("spinner_zona").classList.add("d-none");
    });

}

// Evento de aplicación del filtro de búsqueda por fecha
document.getElementById("aplicar_filtro_fecha").addEventListener("click", (event) => {
    event.preventDefault();
    const minDate = document.getElementById("fecha_ini").value;
    const maxDate = document.getElementById("fecha_fin").value;
    if (!minDate && !maxDate) {
        document.getElementById("cerrar_filtro_fecha").click();
        return;
    }
    document.getElementById("spinner_fecha").classList.remove("d-none");
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    console.log("Params: ", params);
    var query = `?`;
    var precedentes = false;
    if (params.page) {
        query += precedentes ? "&" : "";
        query += `page=${params.page}`;
        precedentes = true;
    }
    if (params.lat && params.lng && params.radio) {
        query += precedentes ? "&" : "";
        query += `lat=${params.lat}&lng=${params.lng}&radio=${params.radio}`;
        precedentes = true;
    }
    if (minDate) {
        query += precedentes ? "&" : "";
        query += `minDate=${minDate}`;
        precedentes = true;
    }
    if (maxDate) {
        query += precedentes ? "&" : "";
        query += `maxDate=${maxDate}`;
        precedentes = true;
    }
    console.log("Query: " + query);
    window.location.href = query;
    document.getElementById("spinner_fecha").classList.add("d-none");
});


const selectable_btn = document.getElementById("selectable");
selectable_btn.addEventListener("click", (event) => {
    event.preventDefault();
    
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    console.log("Params: ", params);
    var query = `?`;
    var precedentes = false;
    if (params.lat && params.lng && params.radio) {
        query += precedentes ? "&" : "";
        query += `lat=${params.lat}&lng=${params.lng}&radio=${params.radio}`;
        precedentes = true;
    }
    if (params.minDate) {
        query += precedentes ? "&" : "";
        query += `minDate=${minDate}`;
        precedentes = true;
    }
    if (params.maxDate) {
        query += precedentes ? "&" : "";
        query += `maxDate=${maxDate}`;
        precedentes = true;
    }
    console.log("Query: " + query);
    window.location.href = "GrafitiDB/selectable" + (query === "?" ? "" : query);
    
})