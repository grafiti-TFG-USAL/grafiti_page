// Botones
const btn_download = document.getElementById("download");

// Comportamiento de los botones
btn_download.addEventListener("click", (event) => { setSpanSelected("download"); });

// Número de grafitis
function setSpanSelected(modalType) {
    const span_selected = document.getElementsByClassName(`span-selected-${modalType}`);
    const spanText = nSelected==1? `el grafiti` : nSelected==nGrafitis? `todos los grafitis` : `${nSelected} grafitis`;
    for (const item of span_selected) {
        item.innerText = spanText;
    }
}

// Iniciamos el socket
const socket = io();
const download_images = document.getElementById("download-btn");
const userId = download_images.dataset.user;
const downloadProgressBar = document.getElementById("download-progress-bar");
const downloadFooter = document.getElementById("download-footer");
const downloadInfo = document.getElementById("download-info");

// Actualizar la barra de progreso al llegar el mensaje
socket.on("download-batch:step", data => {
    downloadProgressBar.innerText = `${data.percentage}%`;
    downloadProgressBar.style.width = `${data.percentage}%`;
    if(data.info) {
        downloadInfo.innerText = `${data.info}`;
    }
});

// Descarga de imágenes
download_images.addEventListener("click", async (event) => {
    event.preventDefault();
    
    const spinner_download = document.getElementById("spinner-download");
    const ids = await getSelected();
    try {
        
        spinner_download.classList.remove("d-none");
        
        socket.emit("download-batch:init", { userId });
        
        downloadProgressBar.style.width = "0%";
        downloadInfo.innerText = "Iniciando";
        downloadFooter.classList.replace("d-none", "d-block");
        
        const fetchURI = `/api/grafitis/prepare-download-batch`;
        const data = await fetch(fetchURI, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ids
            }),
        });
        
        socket.emit("download-batch:finish", { userId });
        
        if (!data) {
            throw "No se ha recibido respuesta a la consulta";
        }
        const result = await data.json();
        if (!result) {
            throw "No se puede interpretar la respuesta del servidor";
        }
        if (!result.success) {
            throw result.message;
        }
        if(!result.fileId) {
            throw "No se ha recuperado el identificador del archivo de descarga";
        }
        
        downloadFooter.classList.replace("d-block", "d-none");
        spinner_download.classList.add("d-none");
        download(`/api/grafitis/download-batch/${result.fileId}`, "grafitis.zip");
        //window.location.reload();
        document.getElementById("download_close").click();
        
    } catch (error) {
        spinner_download.classList.add("d-none");
        socket.emit("download-batch:finish", { userId });
        downloadFooter.classList.replace("d-block", "d-none");
        console.error("Fallo al descargar: "+error);
        window.alert("Fallo al descargar: "+error);
    }
    
});

// Descarga un archivo
function download(fileUrl, fileName) {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.target = "_blank";
    a.click();
}

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
            const images = await fetchNextImageBatch(nImages, 0);
            for (const image of images) {
                ids.push(`${image._id}`);
            }
        }
    }
    
    return ids;
}