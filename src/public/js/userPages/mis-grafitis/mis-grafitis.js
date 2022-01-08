const anadir_btn = document.getElementById("anadir");
anadir_btn.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "/usuario/subir-grafiti"; 
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
        query += `minDate=${params.minDate}`;
        precedentes = true;
    }
    if (params.maxDate) {
        query += precedentes ? "&" : "";
        query += `maxDate=${params.maxDate}`;
        precedentes = true;
    }
    
    window.location.href = "mis-grafitis/selectable" + (query === "?" ? "" : query);
    
});