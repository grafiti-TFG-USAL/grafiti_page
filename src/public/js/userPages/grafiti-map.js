const markers = [];

// Initialize and add the map
async function initMap() {

    // El geocoder, convierte direcciones a coordenadas y viceversa
    const geocoder = new google.maps.Geocoder();

    // The map, centered at grafiti coords
    const map = new google.maps.Map(document.getElementById("map"), {
        disableDefaultUI: true,
    });

    // Obtenemos las coordenadas de la localización inicial, en este caso, España
    const initCoords = {};
    geocoder.geocode({ address: "Spain" }, async (results, status) => {
        if (status === "OK") {

            // Recogemos las coordenadas devueltas por el geocoder
            const loc = results[0].geometry.location;
            initCoords["lat"] = await loc.lat();
            initCoords["lng"] = await loc.lng();

            // Ajustamos el viewport al resultado
            map.fitBounds(results[0].geometry.viewport);

        } else {
            alert("Geocode was not successful for the following reason: " + status);
        }
    });

    const data = await fetch("/api/grafitis/get-grafitis-with-gps", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    const respuesta = await data.json();
    if (!respuesta) {
        window.location.href = "/usuario";
    } else
        if (!respuesta.success) {
            window.location.href = "/usuario";
        }

    const grafitis = respuesta.grafitis;

    grafitis.forEach(grafiti => {

        /*const userId = `/* user._id *//*`;
        if (grafiti.user === userId) {
            svgMarker["fillColor"] = "green";
        } else {
            svgMarker["fillColor"] = "blue";
        }*/

        const marker = new google.maps.Marker({
            map: map,
            position: {
                lat: grafiti.gps.location.coordinates[1],
                lng: grafiti.gps.location.coordinates[0],
            },
            //icon: svgMarker,
            url: "/usuario/grafiti/" + grafiti._id,
        });
        google.maps.event.addListener(marker, "click", () => {
            window.location.href = marker.url;
        });
        markers.push(marker);
    });

    var markerCluster = new MarkerClusterer(map, markers, {
        imagePath: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
        maxZoom: 18,
        gridSize: 20
    });

}
