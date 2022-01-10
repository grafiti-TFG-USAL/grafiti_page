// Script de los modales

const grafitiId = document.getElementById("grafitiImg").dataset.grafiti;
// Al dar enter en la barra de búsqueda de direcciones
document.getElementById("direccion").addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        document.getElementById("buscar_direccion").click();
    }
});

// Obtenemos las coordenadas del grafiti
const grafiti = [];
const mapData = document.getElementById("map");
if (mapData.hasAttribute("data-lng") && mapData.hasAttribute("data-lat")) {
    grafiti.push(Number.parseFloat(mapData.dataset.lng));
    grafiti.push(Number.parseFloat(mapData.dataset.lat));
}

let modalmarker = null;

// Initialize and add the map
function initMap() {

    // El geocoder, convierte direcciones a coordenadas y viceversa
    const geocoder = new google.maps.Geocoder();

    // Manejador del evento final de arrastre del marcador
    const dragend = (event) => {
        geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === "OK") {
                if (results[0]) {
                    document.getElementById("direccion").value = results[0].formatted_address;
                } else {
                    window.alert("No results found");
                }
            } else {
                window.alert("Geocoder failed due to: " + status);
            }
        });
    }

    // Convierte una dirección en una coordenada y apunta en el mapa a ella
    function geocodeAddress(geocoder, resultsMap, address) {
        console.log(address)
        geocoder.geocode({ address, bounds: resultsMap.getBounds() }, async (results, status) => {
            if (status === "OK") {
                // Ajustamos el mapa a los resultados
                resultsMap.fitBounds(results[0].geometry.viewport);
                //Guardamos las coordenadas
                coords.lat = await results[0].geometry.location.lat();
                coords.lng = await results[0].geometry.location.lng();
                // Creamos el marcador para indicar la posicion
                if (modalmarker) modalmarker.setMap(null);
                modalmarker = new google.maps.Marker({
                    map: resultsMap,
                    position: coords,
                    draggable: true
                });
                google.maps.event.addListener(modalmarker, "dragend", dragend);

                geocoder.geocode({ location: results[0].geometry.location }, (results, status) => {
                    if (status === "OK") {
                        if (results[0]) {
                            document.getElementById("direccion").value = results[0].formatted_address;
                        } else {
                            window.alert("No results found");
                        }
                    } else {
                        window.alert("Geocoder failed due to: " + status);
                    }
                });

            } else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
    }

    document.getElementById("guardar_ubicacion").addEventListener("click", async (event) => {

        // Evitamos que recargue la página
        event.preventDefault();
        document.getElementById("spinner").classList.remove("d-none");

        try {

            coords.lat = await modalmarker.getPosition().lat();
            coords.lng = await modalmarker.getPosition().lng();
            
            // Enviamos la consulta POST a la api
            const data = await fetch(`/api/grafitis/update/${grafitiId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ // Enviamos los datos a la api en formato JSON
                    cambio: "ubicacion", atributo: coords
                })
            });

            const respuesta = await data.json();

            document.getElementById("spinner").classList.add("d-none");
            // Comprobamos que no haya fallado
            if (!respuesta.success) {
                console.error("Fallo en respuesta: ", respuesta.message);

                document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
                document.getElementById("contenido_adicional").innerText = respuesta.message;
                $("#ubicacion").modal("hide");
                $("#eliminacion").modal("hide");
                $('#modal').modal();
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams) {
                    const notification = urlParams.get("notification");
                    if (notification === "true") {
                        window.location.href = "/usuario/notificaciones";
                    } else {
                        document.location.reload();
                    }
                } else {
                    document.location.reload();
                }
            }

        } catch (error) {
            console.error("Catch error: ", error);

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = error;
            $("#ubicacion").modal("hide");
            $("#eliminacion").modal("hide");
            $('#modal').modal();
        }
    });


    document.getElementById("eliminar_ubicacion").addEventListener("click", async (event) => {

        // Evitamos que recargue la página
        event.preventDefault();
        document.getElementById("spinner").classList.remove("d-none");

        try {

            // Enviamos la consulta POST a la api
            const data = await fetch(`/api/grafitis/update/${grafitiId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ // Enviamos los datos a la api en formato JSON
                    cambio: "eliminar_ubicacion"
                })
            });

            const respuesta = await data.json();

            document.getElementById("spinner").classList.add("d-none");
            // Comprobamos que no haya fallado
            if (!respuesta.success) {
                console.error("Fallo en respuesta: ", respuesta.message);

                document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
                document.getElementById("contenido_adicional").innerText = respuesta.message;
                $("#ubicacion").modal("hide");
                $("#eliminacion").modal("hide");
                $('#modal').modal();
            } else {
                document.location.reload();
            }

        } catch (error) {
            console.error
            
            
            
        ("Catch error: ", error);

            document.getElementById("contenido").innerText = "Vuelva a intentarlo y si el problema persiste contacte con soporte.";
            document.getElementById("contenido_adicional").innerText = error;
            $("#ubicacion").modal("hide");
            $("#eliminacion").modal("hide");
            $('#modal').modal();
        }
    });

    // La localización del grafiti
    let coords = { lat: 0, lng: 0 };
    // Si no hay coordenadas no mostramos el mapa
    let modalmap;
    if (grafiti.length == 0) {
        geocoder.geocode({ address: "Spain" }, async (results, status) => {
            if (status === "OK") {
                const loc = results[0].geometry.location;
                coords.lat = await loc.lat();
                coords.lng = await loc.lng();
                // The modalmap, centered at grafiti coords
                modalmap = new google.maps.Map(document.getElementById("modalmap"), {
                    zoom: 5,
                    center: coords,
                });
                // The marker, positioned at grafiti coords
                modalmarker = new google.maps.Marker({
                    position: coords,
                    map: modalmap,
                    draggable: true
                });
                google.maps.event.addListener(modalmarker, "dragend", dragend);
            } else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
    } else {
        coords = { lat: grafiti[1], lng: grafiti[0] };
        
        geocoder.geocode({ location: coords }, (results, status) => {
            if (status === "OK") {
                if (results[0]) {
                    document.getElementById("direccion").value = results[0].formatted_address;
                } else {
                    mapData.classList.add("d-none");
                    //window.alert("No results found");
                }
            } else {
                mapData.classList.add("d-none");
                //window.alert("Geocoder failed due to: " + status);
            }
        });
        // The modalmap, centered at grafiti coords
        modalmap = new google.maps.Map(document.getElementById("modalmap"), {
            zoom: 15,
            center: coords,
        });
        // The marker, positioned at grafiti coords
        modalmarker = new google.maps.Marker({
            position: coords,
            map: modalmap,
            draggable: true
        });
        google.maps.event.addListener(modalmarker, "dragend", dragend);
        document.getElementById("map").classList.remove("d-none");
    }

    // The map, centered at grafiti coords
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: coords,
        disableDefaultUI: true,
    });
    // The marker, positioned at grafiti coords
    const marker = new google.maps.Marker({
        position: coords,
        map: map,
    });

    document.getElementById("buscar_direccion").addEventListener("click", () => {
        const boton = document.getElementById("direccion");
        geocodeAddress(geocoder, modalmap, boton.value);
    });

}
