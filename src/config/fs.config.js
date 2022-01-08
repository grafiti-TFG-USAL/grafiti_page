const fs = require("fs-extra");
const path = require("path");

const initFS = async () => {
    try {
        await initUploads();
        await initDownloads();
        await initSearches();
    } catch (error) {
        errorcb();
    }
    
    console.log("FS            => OK");
}

const initUploads = async () => {
    console.log("Comprobando",path.resolve("src/public/uploads/temp".toString()));
    await fs.ensureDir(path.resolve("src/public/uploads/temp".toString()));
}

const initDownloads = async () => {
    await fs.ensureDir(path.resolve("src/tempfiles/downloads".toString()));
}

const initSearches = async () => {
    await fs.ensureDir(path.resolve("src/tempfiles/searches".toString()));
}

const errorcb = err => {
    console.error("FS => Error: ", err);
    process.exit(1);
}

module.exports = { initFS }