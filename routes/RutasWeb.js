const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("index.ejs", { titulo: "Página principal" });
});

router.get("/servicios", (req, res) => {
    res.render("servicios.ejs", { titulo: "Servicios" });
});

module.exports = router;