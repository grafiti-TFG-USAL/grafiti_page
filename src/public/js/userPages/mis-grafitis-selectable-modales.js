// Botones
const btn_download = document.getElementById("download");
const btn_delete = document.getElementById("delete");

// Comportamiento de los botones
btn_download.addEventListener("click", (event) => { setSpanSelected("download"); });
btn_delete.addEventListener("click", (event) => { setSpanSelected("delete"); });

// Número de grafitis
function setSpanSelected(modalType) {
    const span_selected = document.getElementsByClassName(`span-selected-${modalType}`);
    const spanText = nSelected==1? `el grafiti` : nSelected==nGrafitis? `todos los grafitis` : `${nSelected} grafitis`;
    for (const item of span_selected) {
        item.innerText = spanText;
    }
}

// Descarga de imágenes
const download_images = document.getElementById("download-btn");
download_images.addEventListener("click", async (event) => {
    event.preventDefault();
    
    const ids = await getSelected();
    /*try {
        
        const fetchURI = `/api/grafitis/download-batch`;
        const data = await fetch(fetchURI, {
            method: "POST",
            body: JSON.stringify({
                ids
            }),
        });
        
    } catch (error) {
        console.error("Fallo al descargar: "+error);
        window.alert("Fallo al descargar: "+error);
    }*/
    
});

// Eliminación de imágenes
const delete_images = document.getElementById("delete-btn");
delete_images.addEventListener("click", async (event) => {
    event.preventDefault();
    
    const ids = await getSelected();
    const community_checkbox = document.getElementById("community_checkbox");
    const spinner_delete = document.getElementById("spinner-delete");
    try {
        
        console.log(ids)
        spinner_delete.classList.remove("d-none");
        const fetchURI = `/api/grafitis/remove-batch`;
        const data = await fetch(fetchURI, { 
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ids,
                community: community_checkbox.checked,
            }),
        });
        if (!data) {
            throw "No se ha podido realizar la consulta";
        }
        const result = await data.json();
        if(!result){
            throw "No se han podido extraer los datos de la consulta";
        }
        if(!result.success) {
            throw result.message;
        } else {
            spinner_delete.classList.add("d-none");
            window.location.reload();
        }
        
    } catch (error) {
        spinner_delete.classList.add("d-none");
        console.error("Fallo al eliminar: "+error);
        window.alert("Fallo al eliminar: "+error);
    }
    spinner_delete.classList.add("d-none");
    
    
});

/**
 * Obtiene los ids de las imágenes seleccionadas
 */
async function getSelected() {
    const ids = [];
    // Obtenemos los ids de los checkboxes selecciondados (cargados)
    const checkboxes = document.getElementsByClassName("checkbox");
    for (const checkbox of checkboxes) {
        if (checkbox.checked) {
            ids.push(checkbox.id);
        }
    }
    // Si este número no es null, se tendrán que obtener el resto de ids a partir del nº especificado
    if (allSelected && !limReached) {
        while (!limReached) {
            // Recogemos las imágenes restantes
            console.log("Recogemos las imágenes restantes");
            const images = await fetchNextImageBatch(nImages, 0);
            for (const image of images) {
                ids.push(`${image._id}`);
            }
        }
    }
    
    return ids;
}