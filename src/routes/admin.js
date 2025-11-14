const express = require("express");
const Route = express.Router();
const admin = require("../controllers/admin");

Route.post("/store-user", admin.storeUser);

module.exports = Route;
