const express = require("express");
const Route = express.Router();
const applicant = require("../controllers/applicant");

Route.get("/list", applicant.list);
Route.put("/update/:id", applicant.update);
Route.delete("/delete/:id", applicant.delete);
Route.store("/store", applicant.store);

module.exports = Route;
