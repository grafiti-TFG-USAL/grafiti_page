// ID del grafiti
const grafitiId = document.getElementById("cardBody").dataset.grafiti;

// Parámetros predefinidos
const ELEMENTS_PER_PAGE = 6;
const PAGE = 1;
const ORDER = -1;

// Parámetros de la query
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

// Para indicar el número de grafitis
const matchesHeader = document.getElementById("matchesHeader");
const numMatches = document.getElementById("numMatches");

// Para insertar los thumnail de los matches
const matchesBody = document.getElementById("matchesBody");

// Para rellenar la paginación
const listPages = document.getElementById("listPages");

// Para eliminar si no hay páginas
const cardFooter = document.getElementById("cardFooter");

initMatches();

// Función que rellena la paginación de elementos
async function initMatches() {
    try {
        
        // Obtenemos los matches del grafiti del servidor
        const results = await fetchMatches(grafitiId, params);
        
        // Extraemos los resultados recogidos
        const matches = results.matches;
        const nMatches = results.nMatches;
        if(nMatches < 1) {
            throw "El grafiti al que intenta acceder no tiene ningún match que consultar";
        }
        
        // Mostramos info en el header
        adaptHeader(nMatches, results.order);
        
        // Rellenamos el body con las imágenes
        fillBody(matches, grafitiId, matchesBody, results.docsppage);
        
        // Ponemos la paginación en el footer
        addPagination(results.page, results.nMatches, results.docsppage, listPages, results.order);
        
    } // Si se produce cualquier excepción durante la ejecución
    catch (error) {
        console.error("Ha habido un error al mostrar los matches: ", error);
        window.confirm(error);
        window.location.href = "/usuario";
    }
};

// función que obtiene los matches del servidor mediante una consulta fetch
async function fetchMatches(grafitiID, params) {
    
    // Obtenemos los parámetros de la búsqueda
    const order = params.order? Number.parseInt(params.order) : ORDER;
    const page = params.page? Number.parseInt(params.page) : PAGE;
    const docsppage_ = params.docsppage? Number.parseInt(params.docsppage) : ELEMENTS_PER_PAGE;
    const docsppage = docsppage_ > 12 ? 12 : docsppage_;
    
    // Creamos la consulta
    const fetchURI_base = `/api/grafitis/get-matches/${grafitiID}`;
    // Generamos la query
    const fetchURI = fetchURI_base + "?" +
    `order=${ order }&` +
    `page=${ page }&` +
    `docsppage=${ docsppage }`;
    
    // Solicitamos los datos a la api
    const data = await fetch(fetchURI, { 
        method: "GET"
    });
    if(!data){
        throw "No se ha podido obtener los datos del servidor";
    }
    // Recogemos los datos devueltos y los parseamos
    const response = await data.json();
    if(!response){
        throw "No se ha podido extraer la información recibida del servidor";
    }
    if(!response.success){
        throw response.message;
    }
    
    // Almacenamos el estado de la query inicial
    queryParams.order = order;
    queryParams.page = page;
    queryParams.docsppage = docsppage;
    
    // Devolvemos los resultados
    return { 
        matches: response.matches, 
        nMatches: response.nMatches,
        order,
        page,
        docsppage,
    };
    
};

// función que modifica el header para adaptarse a los resultados
function adaptHeader(nMatches, order) {
    
    // Indicamos el número total de matches en el header
    numMatches.innerText = ` (${nMatches})`;
    
    // Adaptamos el botón ordenar a la búsqueda
    if(order == 1) {
        const badge = document.getElementById("sortDataBadge");
        badge.classList.replace("fa-sort-numeric-desc", "fa-sort-numeric-asc");
    }
    
}

function fillBody(matches_, grafitiID, body, matchesPPage) {
    const matches = matches_;
    
    var index = 0;
    for(const match of matches) {
        
        if (index >= matchesPPage){
            console.error("Superado el límite de matches por página");
            break;
        }
        
        
        // Nos quedamos con el id del otro grafiti
        var grafiti = null;
        if(match.grafiti_1 === grafitiID){
            grafiti = match.grafiti_2;
        } else {
            grafiti = match.grafiti_1;
        }
        
        const div = document.createElement("div");
        div.classList.add("col-6", "col-lg-4", "mb-2");
        body.appendChild(div);
        const a = document.createElement("a");
        a.href = `/usuario/grafiti/${ grafiti }`;
        div.appendChild(a);
        const img = document.createElement("img");
        img.src = `/api/grafitis/get-thumbnail/${ grafiti }`;
        img.classList.add("w-100", "h-100", "img", "img-thumbnail");
        a.appendChild(img);
        const div_caption = document.createElement("div");
        div_caption.classList.add("caption-inside-bottom-center");
        div_caption.innerText = `${match.similarity}%`;
        a.appendChild(div_caption);
        
        index++;
    }
    
}

function addPagination(page, nElements, elementsppage, pagination, order) {
    
    const limPages_ = Math.ceil(nElements/elementsppage);
    const limPages = limPages_? limPages_ : 1;
    
    if (limPages > 1) {
        
        // Creamos el prev
        const li_prev = document.createElement("li");
        pagination.appendChild(li_prev);
        const a_prev = document.createElement("a");
        li_prev.appendChild(a_prev);
        // Si estamos en la primera página no hay prev
        if (page==1) {
            li_prev.classList.add("page-item", "disabled");
            a_prev.classList.add("page-link");
        } // Si no es la primera, activamos el prev
        else {
            li_prev.classList.add("page-item");
            a_prev.classList.add("page-link");
            a_prev.href = queryBuilder(page-1, elementsppage, order);
        }
        // Añadimos el icono de prev
        const span_prev = document.createElement("span");
        span_prev.innerText = "\u00AB";
        a_prev.appendChild(span_prev);
        
        // Si hay menos de 6 páginas
        if (limPages < 6) {
            
            for (let index = 1; index <= limPages; index++) {
                const li = document.createElement("li");
                if (index == page) {
                    li.classList.add("page-item", "active");
                } else {
                    li.classList.add("page-item");
                }
                pagination.appendChild(li);
                const a = document.createElement("a");
                a.classList.add("page-link");
                a.href = queryBuilder(index, elementsppage, order);
                a.innerText = `${ index }`;
                li.appendChild(a);
            }
            
        } // Si hay 6 páginas o más
        else {
            
            // Si la página es de la 3 para abajo
            if (page < 4) {
                
                // Añadimos las 5 primeras
                for (let index = 1; index <= 5; index++) {
                    
                    const li = document.createElement("li");
                    li.classList.add("page-item");
                    if (index == page) {
                        li.classList.add("active");
                    }
                    pagination.appendChild(li);
                    const a = document.createElement("a");
                    a.classList.add("page-link");
                    a.href = queryBuilder(index, elementsppage, order);
                    a.innerText = `${ index }`;
                    li.appendChild(a);
                    
                }
                
                // Añadimos ...
                const li_3p = document.createElement("li");
                li_3p.classList.add("page-item", "disabled");
                pagination.appendChild(li_3p);
                const a_3p = document.createElement("a");
                a_3p.classList.add("page-link");
                a_3p.innerText = "...";
                li_3p.appendChild(a_3p);
                
                // Añadimos la última página
                const li_last = document.createElement("li");
                li_last.classList.add("page-item");
                pagination.appendChild(li_last);
                const a_last = document.createElement("a");
                a_last.classList.add("page-link");
                a_last.href = queryBuilder(limPages, elementsppage, order);
                a_last.innerText = `${ limPages }`;
                li_last.appendChild(a_last);
                
            } // Si la página es de la 6 para arriba
            else {
                
                // Si la página es de las 3 últimas
                if ((limPages-3) < page) {
                    
                    // Incluimos la primera página
                    const li_first = document.createElement("li");
                    li_first.classList.add("page-item");
                    pagination.appendChild(li_first);
                    const a_first = document.createElement("a");
                    a_first.classList.add("page-link");
                    a_first.href = queryBuilder(1, elementsppage, order);
                    a_first.innerText = "1";
                    li_first.appendChild(a_first);
                    
                    // Incluimos 3 puntos
                    const li_3d = document.createElement("li");
                    li_3d.classList.add("page-item", "disabled");
                    pagination.appendChild(li_3d);
                    const a_3d = document.createElement("a");
                    a_3d.classList.add("page-link");
                    a_3d.innerText = "...";
                    li_3d.appendChild(a_3d);
                    
                    // Añadimos las 5 últimas páginas
                    for (let index = limPages-4; index <= limPages; index++) {
                        
                        const li = document.createElement("li");
                        li.classList.add("page-item");
                        if (index == page) {
                            li.classList.add("active");
                        }
                        pagination.appendChild(li);
                        const a = document.createElement("a");
                        a.href = queryBuilder(index, elementsppage, order);
                        a.classList.add("page-link");
                        a.innerText = `${ index }`;
                        li.appendChild(a);
                        
                    }
                    
                } // Si la página es intermedia (ni de las últimas ni de las primeras)
                else {
                    
                    // Incluimos la primera página
                    const li_first = document.createElement("li");
                    li_first.classList.add("page-item");
                    pagination.appendChild(li_first);
                    const a_first = document.createElement("a");
                    a_first.classList.add("page-link");
                    a_first.href = queryBuilder(1, elementsppage, order);
                    a_first.innerText = "1";
                    li_first.appendChild(a_first);
                    
                    // Incluimos 3 puntos
                    const li_3d_1 = document.createElement("li");
                    li_3d_1.classList.add("page-item", "disabled");
                    pagination.appendChild(li_3d_1);
                    const a_3d_1 = document.createElement("a");
                    a_3d_1.classList.add("page-link");
                    a_3d_1.innerText = "...";
                    li_3d_1.appendChild(a_3d_1);
                    
                    // Añadimos las tres páginas intermedias
                    for (let index = page-1; index <= page+1; index++) {
                        
                        const li = document.createElement("li");
                        li.classList.add("page-item");
                        if (index == page) {
                            li.classList.add("active");
                        }
                        pagination.appendChild(li);
                        const a = document.createElement("a");
                        a.href = queryBuilder(index, elementsppage, order);
                        a.classList.add("page-link");
                        a.innerText = `${ index }`;
                        li.appendChild(a);
                        
                    }
                    
                    // Añadimos tres puntos
                    const li_3d_2 = document.createElement("li");
                    li_3d_2.classList.add("page-item", "disabled");
                    pagination.appendChild(li_3d_2);
                    const a_3d_2 = document.createElement("a");
                    a_3d_2.classList.add("page-link");
                    a_3d_2.innerText = "...";
                    li_3d_2.appendChild(a_3d_2);
                    
                    // Añadimos la última página
                    const li_last = document.createElement("li");
                    li_last.classList("page-item");
                    pagination.appendChild(li_last);
                    const a_last = document.createElement("a");
                    a_last.classList("page-link");
                    a_last.href = queryBuilder(limPages, elementsppage, order);
                    
                }
                
            }
            
        }
        
        // Creamos el next
        const li_next = document.createElement("li");
        li_next.classList.add("page-item");
        const a_next = document.createElement("a");
        a_next.classList.add("page-link");
        if (limPages == page) {
            li_next.classList.add("disabled");
        } else {
            a_next.href = queryBuilder(page+1, elementsppage, order);
        }
        const span_next = document.createElement("span");
        span_next.innerText = "\u00BB";
        a_next.appendChild(span_next);
        li_next.appendChild(a_next);
        pagination.appendChild(li_next);
        
    } else {
        cardFooter.remove();
    }
    
}

function queryBuilder(page, docsppage, order) {
    return "?" +
    `page=${ page }&` +
    `docsppage=${ docsppage }&` + 
    `order=${ order }`;
}

// Variable para almacenar el estado de los parámetros query
const queryParams = { };

// Manejador del evento click en ordenar por fecha
document.getElementById("sortSimilarity").addEventListener("click", (event) => {
    event.preventDefault();
    
    // Invertimos el orden
    if(queryParams.order == -1) {
        window.location.href = queryBuilder(queryParams.page, queryParams.docsppage, 1);
    } else {
        window.location.href = queryBuilder(queryParams.page, queryParams.docsppage, -1);
    }
    
});