const express = require("express");
const Route = express.Router();
const jobVacancy = require("../controllers/job_vacancy");

Route.get("/list", jobVacancy.list);
Route.put("/update/:id", jobVacancy.update);
Route.delete("/delete/:id", jobVacancy.delete);
Route.post("/store", jobVacancy.store);

module.exports = Route;
