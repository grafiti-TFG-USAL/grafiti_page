const btn_checkall = document.getElementById("checkall");
function emptyNotifications(list) {
    const cardBody = document.getElementById("cardBody");
    const header = document.createElement("h3");
    header.classList.add("display-4", "text-center", "justify-content-center", "mb-5", "text-secondary");
    header.innerText = "No tiene notificaciones";
    btn_checkall.setAttribute("disabled", "disabled");
    btn_checkall.classList.add("d-none");
    cardBody.appendChild(header);
};

const cardHeader = document.getElementById("cardHeader");
var notifications = cardHeader.dataset.notifications;
const userId = cardHeader.dataset.user;
function updateCardHeader(increment) {

    // Borramos todo el contenido anterior del header
    while (cardHeader.firstChild) {
        cardHeader.removeChild(cardHeader.firstChild);
    }

    if (increment) {
        notifications++;
    } else {
        notifications--;
    }

    if (notifications > 0) {

        btn_checkall.removeAttribute("disabled");
        btn_checkall.classList.remove("d-none");
        const span1 = document.createElement("span");
        span1.classList.add("d-none", "d-sm-inline");
        span1.innerText = "Tiene ";
        cardHeader.appendChild(span1);
        const span2 = document.createElement("span");
        span2.classList.add("text-warning");
        span2.innerText = `${notifications} `;
        cardHeader.appendChild(span2);
        const span3_1 = document.createElement("span");
        span3_1.classList.add("d-none", "d-sm-inline");
        span3_1.innerText = "n";
        cardHeader.appendChild(span3_1);
        const span3_2 = document.createElement("span");
        span3_2.classList.add("d-inline", "d-sm-none");
        span3_2.innerText = "N";
        cardHeader.appendChild(span3_2);
        const span4 = document.createElement("span");
        if (notifications > 1) {
            span4.innerText = "otificaciones";
        } else {
            span4.innerText = "otificación";
        }
        cardHeader.appendChild(span4);

    } else {

        btn_checkall.setAttribute("disabled", "disabled");
        btn_checkall.classList.add("d-none");
        const span = document.createElement("span");
        span.innerText = "Sin notificaciones";
        cardHeader.appendChild(span);

    }

};

const lista_tuplas = {};
async function initList() {

    const list = document.getElementById("list");

    // Solicitamos a la api de notificaciones que nos entregue las notificaciones del usuario
    const data = await fetch(`/api/notifications/get/${userId}`, { method: "get" });
    const response = await data.json();

    // Si algo ha fallado
    if (!response.success) {
        if (window.alert("Se ha producido un error al cargar la página\n" + response.message + "\n¿Quiere volver a intentarlo?")) {
            // Recargamos
            window.location.reload();
        } else {
            // Volvemos a la página de usuario
            window.location.href = "../";
        }
        return;
    }

    // Salvamos las notificaciones
    const notificaciones = response.notificaciones;

    // Si no hay notificaciones
    if (notificaciones.length < 1) {
        emptyNotifications(list);
        return;
    }

    var vistos = true;
    // Creamos el div que hara la table responsive
    const div_responsive = document.createElement("div");
    div_responsive.classList.add("table-responsive");
    // Creamos la table que contendrá las notificaciones
    const table = document.createElement("table");
    table.classList.add("table", "table-hover", "border");
    const tbody = document.createElement("tbody");
    // Entramos en el bucle de relleno de las filas de la tabla
    for (const notificacion of notificaciones) {
        // Creamos una nueva fila
        const tr = document.createElement("tr");
        // Si está visto, lo muteamos
        if (notificacion.seen) {
            tr.classList.add("table-secondary");
        } else {
            vistos = false;
        }

        // Creamos el objeto que añadiremos a la lista
        const tupla = {};
        tupla["tr"] = tr;

        // Creamos la celda del tipo de notificación
        const td_tipo = document.createElement("td");
        td_tipo.style = "text-align: center; vertical-align: middle";
        const div_tipo = document.createElement("div");
        
        let a_tipo;
        let td_img;
        let a_img;
        let div_img;
        
        // Rellenamos las dos celdas
        switch (notificacion.type) {
            // Notificación de tipo ubicación
            case "Ubicación no establecida":
                
                a_tipo = document.createElement("a");
                a_tipo.href = "/usuario/grafiti/" + notificacion.grafiti + "?notification=true";
                
                // Creamos la celda de previsualización de la imagen
                td_img = document.createElement("td");
                a_img = document.createElement("a");
                div_img = document.createElement("div");
                a_img.href = "/usuario/grafiti/" + notificacion.grafiti + "?notification=true";
                
                const title_map = document.createElement("h5");
                title_map.classList.add("text-danger", "m-0");
                const icon_map = document.createElement("i");
                icon_map.classList.add("fa", "fa-map-marker", "fa-lg", "mr-2");
                title_map.appendChild(icon_map);
                const span_map = document.createElement("span");
                span_map.innerText = " Falta la ubicación";
                title_map.appendChild(span_map);
                div_tipo.appendChild(title_map);
                a_tipo.appendChild(div_tipo);
                td_tipo.appendChild(a_tipo);
                tr.appendChild(td_tipo);

                td_img.style = "text-align: center; vertical-align: middle;";
                const img_thmb_map = document.createElement("img");
                img_thmb_map.style = "max-width: 100px; max-height:60px";
                img_thmb_map.src = "/api/grafitis/get-thumbnail/" + notificacion.grafiti;
                div_img.appendChild(img_thmb_map);
                a_img.appendChild(div_img);
                td_img.appendChild(a_img);
                tr.appendChild(td_img);
                break;
            // Notificación de tipo similar hallado
            case "Grafiti similar detectado":
                
                a_tipo = document.createElement("a");
                a_tipo.href = "#";
                a_tipo.addEventListener("click", modalConfirmarMatch);
                
                // Creamos la celda de previsualización de la imagen
                td_img = document.createElement("td");
                a_img = document.createElement("a");
                a_img.href = "#";
                a_img.addEventListener("click", modalConfirmarMatch);
                div_img = document.createElement("div");    
            
                const title_match = document.createElement("h5");
                title_match.classList.add("text-success", "m-0");
                const icon_match = document.createElement("i");
                icon_match.classList.add("fa", "fa-bullseye", "fa-lg", "mr-2");
                title_match.appendChild(icon_match);
                const span_match = document.createElement("span");
                span_match.innerText = " ¡Match detectado!";
                
                span_match.dataset.grafiti1 = notificacion.grafiti;
                span_match.dataset.grafiti2 = notificacion.grafiti_2;
                
                title_match.appendChild(span_match);
                div_tipo.appendChild(title_match);
                a_tipo.appendChild(div_tipo);
                td_tipo.appendChild(a_tipo);
                tr.appendChild(td_tipo);

                td_img.style = "text-align: center; vertical-align: middle;";
                const img_thmb_match = document.createElement("img");
                img_thmb_match.style = "max-width: 100px; max-height:60px";
                img_thmb_match.src = "/api/grafitis/get-thumbnail/" + notificacion.grafiti;
                img_thmb_match.dataset.grafiti1 = notificacion.grafiti;
                img_thmb_match.dataset.grafiti2 = notificacion.grafiti_2;
                div_img.appendChild(img_thmb_match);
                a_img.appendChild(div_img);
                td_img.appendChild(a_img);
                tr.appendChild(td_img);
                break;
            default:
                continue;
        }
        tupla["td_tipo"] = td_tipo;
        tupla["td_img"] = td_img;

        // Por último, añadimos el botón para marcarla/desmarcarla como visto
        const td_btn = document.createElement("td");
        td_btn.style = "text-align: center; vertical-align: middle; padding: 0;";
        const seen_btn = document.createElement("button");
        seen_btn.classList.add("btn");
        seen_btn.setAttribute("data-toggle", "tooltip");
        const icon_eye = document.createElement("i");
        if (notificacion.seen) {
            seen_btn.setAttribute("title", "Marcar como \"No visto\"");
            icon_eye.classList.add("fa", "fa-eye");
        } else {
            seen_btn.setAttribute("title", "Marcar como \"Visto\"");
            icon_eye.classList.add("fa", "fa-eye-slash");
        }
        tupla["icon_eye"] = icon_eye;
        seen_btn.appendChild(icon_eye);
        // Añadimos el comportamiento del botón
        seen_btn.addEventListener("click", async (event) => {
            event.preventDefault();
            seen_btn.setAttribute("disabled", "true");

            try {
                const fetch_uri = `/api/notifications/switch-seen/${notificacion._id}`;
                const data = await fetch(fetch_uri, {
                    method: "POST",
                });
                const response = await data.json();
                seen_btn.removeAttribute("disabled");

                // Si el post ha ido bien
                if (response.success) {
                    // Cambiamos el estilo de la tupla
                    // Si estaba en "no visto" => poner a "visto"
                    if (icon_eye.classList.contains("fa-eye-slash")) {
                        updateCardHeader(false);
                        seen_btn.setAttribute("title", "Marcar como \"No visto\"");
                        icon_eye.classList.replace("fa-eye-slash", "fa-eye");
                        tr.classList.add("table-secondary");
                        tupla["notification"].seen = true;
                    } // Si estaba en "visto" => poner a "no visto"
                    else {
                        updateCardHeader(true);
                        seen_btn.setAttribute("title", "Marcar como \"Visto\"");
                        icon_eye.classList.replace("fa-eye", "fa-eye-slash");
                        tr.classList.remove("table-secondary");
                        tupla["notification"].seen = false;
                    }
                } // Si el post ha ido mal
                else {
                    throw response.message;
                }
            } catch (error) {
                console.error("Ha ocurrido un error en la consulta:", error);
                window.alert("Ha habido un error en la consulta\n" + error);
                seen_btn.removeAttribute("disabled");
            }

        });
        td_btn.appendChild(seen_btn);
        tupla["seen_btn"] = seen_btn;
        tupla["td_btn"] = td_btn;
        tupla["notification"] = notificacion;
        // Añadimos el boton a la tupla
        tr.appendChild(td_btn);

        // Finalmente, añadimos la fila a la tabla
        table.appendChild(tr);
        // Y añadimos la tupla a la lista
        lista_tuplas[notificacion._id] = tupla;

    }

    table.appendChild(tbody);
    // Finalizamos insertando la tabla en el div
    div_responsive.appendChild(table);
    // E insertando el div en la lista
    list.appendChild(div_responsive);

    if (vistos) {
        btn_checkall.setAttribute("disabled", "true");
        btn_checkall.classList.add("d-none");
    } else {
        btn_checkall.removeAttribute("disabled");
        btn_checkall.classList.remove("d-none");
    }

};

initList();

// Añadimos al botón de marcar todos como visto
btn_checkall.addEventListener("click", async (event) => {
    event.preventDefault();
    btn_checkall.setAttribute("disabled", "true");

    try {
        const fetch_uri = `/api/notifications/all-seen`;
        const data = await fetch(fetch_uri, {
            method: "POST",
        });
        const response = await data.json();

        // Si el post ha ido bien
        if (response.success) {
            window.location.reload();
            /* console.log("LISTA_TUPLAS: ", lista_tuplas);
            for(const tupla in lista_tuplas) {
                console.log("TUPLA: ", tupla);
                if(!tupla.notification.seen){
                    updateCardHeader(false);
                    tupla.seen_btn.setAttribute("title", "Marcar como \"No visto\"");
                    tupla.icon_eye.classList.replace("fa-eye-slash", "fa-eye");
                    tupla.tr.classList.add("table-secondary");
                    tupla.notification.seen = true;
                }
            } */
        } // Si el post ha ido mal
        else {
            throw response.message;
        }

    } catch (error) {
        console.error("Ha ocurrido un error en la consulta:", error);
        window.alert("Ha habido un error en la consulta\n" + error);
        btn_checkall.removeAttribute("disabled");
    }
});

const modalConfirmarMatch = async (event) => {
    
    const a_source = event.target;
    
    const grafiti1_id = a_source.dataset.grafiti1;
    const grafiti2_id = a_source.dataset.grafiti2;
    
    fillMatchModal(grafiti1_id, grafiti2_id);
    
    // Abrimos el modal
    $('.match-modal').modal();
    
}