// Script del elemento carousel de matches
const carouselId = "matchCarousel";

// Obtenemos los matches del grafiti
async function getMatches(grafitiId) {

    const grafitiID = grafitiId;
    const matchLimit = 5;
    try {

        // Solicitamos al servidor los matches del grafiti
        const fetchURI_base = "/api/grafitis/get-matches/" + grafitiID;
        const fetchURI = fetchURI_base + "?" +
        "docsppage=" + matchLimit + "&" +
        "order=" + "-1";
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

        // Recogemos los elementos del Carousel que iremos rellenando
        const indicators = document.getElementById("matchCarouselIndicators");
        const inner = document.getElementById("matchCarouselInner");

        while(indicators.firstChild) {
            indicators.removeChild(indicators.firstChild);
        }
        while(inner.firstChild) {
            inner.removeChild(inner.firstChild);
        }
        
        // Rellenamos los campos con los datos recibidos
        const matches = result.matches;
        var index = 0;
        const imagesHeight = document.getElementById(carouselId).dataset.imagesHeight;
        for (const match of matches) {
            // Si se altera la consulta, que el límite se mantenga
            if(index >= matchLimit){
                console.error("Broke lim matches");
                continue;
            }
            
            // Vemos qué grafiti es el otro
            var grafiti = null;
            if (match.grafiti_1 === grafitiID) {
                grafiti = match.grafiti_2;
            } else {
                grafiti = match.grafiti_1;
            }

            // Lo añadimos a la lista de indicadores
            const li = document.createElement("li");
            indicators.appendChild(li);
            if (index == 0) {
                li.classList.add("active");
            }
            li.dataset.slideTo = index;
            li.dataset.target = `#${carouselId}`;

            // Lo añadimos a las imágenes
            const div_item = document.createElement("div");
            if (index == 0) {
                div_item.classList.add("carousel-item", "active");
            } else {
                div_item.classList.add("carousel-item");
            }
            inner.appendChild(div_item);
            const grafiti_img = document.createElement("img");
            grafiti_img.src = "/api/grafitis/get/" + grafiti;
            div_item.appendChild(grafiti_img);
            
            // Añadimos el porcentaje de similitud a la imagen
            const div_caption = document.createElement("div");
            div_caption.classList = "carousel-caption";
            div_caption.style = "text-shadow: 0px 0px 8px #000000;";
            div_item.appendChild(div_caption);
            const percentage = document.createElement("h5");
            percentage.innerText = `${match.similarity.toFixed(2)}%`;
            div_caption.appendChild(percentage);

            index++;
        }
        
        const linkToMatches = document.getElementById("linkToMatches");
        // Si no había matches
        if (index == 0) {
            const matchesHeader = document.getElementById("matchesHeader");
            matchesHeader.classList.replace("text-success", "text-danger");
            if(!document.getElementById("matchIcon").classList.contains("d-none")) {
                document.getElementById("matchIcon").classList.add("d-none");
            }
            if(!document.getElementById("nMatches").classList.contains("d-none")) {
                document.getElementById("nMatches").classList.add("d-none");
            }
            if(!document.getElementById("isMatches").classList.contains("d-none")) {
                document.getElementById("isMatches").classList.add("d-none");
            }
            const noMatchIcon = document.createElement("i");
            noMatchIcon.classList.add("fa", "fa-times");
            noMatchIcon.id = "noMatchIcon";
            matchesHeader.appendChild(noMatchIcon);
            const noMatchSpan = document.createElement("span");
            noMatchSpan.innerText = " Sin coincidencias";
            noMatchSpan.id = "noMatchSpan";
            matchesHeader.appendChild(noMatchSpan);
            if (!document.getElementById("matchesCardBody").classList.contains("d-none")) {
                document.getElementById("matchesCardBody").classList.add("d-none");
            }
            linkToMatches.removeAttribute("href");
        } 
        // Si hay matches 
        else {
            const matchesHeader = document.getElementById("matchesHeader");
            if(matchesHeader.classList.contains("text-danger")){
                matchesHeader.classList.replace("text-danger", "text-success");
            }
            if(document.getElementById("noMatchIcon")) {
                document.getElementById("noMatchIcon").remove();
            }
            if(document.getElementById("matchIcon").classList.contains("d-none")) {
                document.getElementById("matchIcon").classList.remove("d-none");
            }
            if(document.getElementById("isMatches").classList.contains("d-none")) {
                document.getElementById("isMatches").classList.remove("d-none");
            }
            if(document.getElementById("nMatches").classList.contains("d-none")) {
                document.getElementById("nMatches").classList.remove("d-none");
            }
            if(document.getElementById("noMatchSpan")) {
                document.getElementById("noMatchSpan").remove();
            }
            if (document.getElementById("matchesCardBody").classList.contains("d-none")) {
                document.getElementById("matchesCardBody").classList.remove("d-none");
            }
            linkToMatches.href = `/usuario/matches/${grafitiID}`;
            if(document.getElementById("nMatches")) {
                document.getElementById("nMatches").innerText = ` (${result.nMatches})`;
            }
        }
        
        document.getElementById("carouselContainer").classList.remove("d-none");

    } catch (error) {
        console.error(error);
        window.alert(error);
    }

}

const carousel = document.getElementById(carouselId);
getMatches(carousel.dataset.grafiti);
