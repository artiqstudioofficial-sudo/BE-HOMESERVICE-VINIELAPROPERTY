const express = require("express");
const Route = express.Router();
const applicant = require("../controllers/applicant");

Route.get("/list", applicant.list);
Route.put("/update/:id", applicant.update);
Route.delete("/delete/:id", applicant.delete);
Route.post("/form", applicant.form);

module.exports = Route;
