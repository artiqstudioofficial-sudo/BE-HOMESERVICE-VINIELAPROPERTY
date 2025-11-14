const express = require("express");
const Route = express.Router();
const admin = require("../controllers/admin");

Route.post("/store-user", admin.storeUser);
Route.get("/tech-schedule", admin.techSchedule);

module.exports = Route;
