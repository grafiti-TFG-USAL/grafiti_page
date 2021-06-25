const mapElement = document.getElementById("map");
// Obtenemos las coordenadas del grafiti
const coordinates = [Number.parseFloat(mapElement.dataset.lng), Number.parseFloat(mapElement.dataset.lat)];

// Initialize and add the map
function initMap() {

    // The location of the grafiti
    const coords = { lat: coordinates[1], lng: coordinates[0] };

    // The map, centered at grafiti coords
    const map = new google.maps.Map(document.getElementById("map"), {
        center: coords,
        zoom: 15,
        disableDefaultUI: true,
    });
    // The marker, positioned at grafiti coords
    const marker = new google.maps.Marker({
        position: coords,
        map: map,
    });

}

