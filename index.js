const express = require("express");

const interior = require("./src/index");

const Route = express.Router();

Route.use("/api/v1/interior", interior);

module.exports = Route;
