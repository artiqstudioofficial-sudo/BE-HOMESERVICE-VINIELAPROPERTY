const express = require("express");
const Route = express.Router();
const message = require("../controllers/message");

Route.get("/list", message.list);
Route.put("/update/:id", message.update);
Route.delete("/delete/:id", message.delete);
Route.post("/store", message.store);

module.exports = Route;
