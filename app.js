require("dotenv").config();

const express = require("express");
const fileUpload = require("express-fileupload");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const config = require("./src/configs/configs");
const port = config.port;

const routerNav = require("./src/index");

app.use(fileUpload());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);
app.use(compression());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", routerNav);

const server = app.listen(port, () => {
  console.log(`\n\t *** Server listening on PORT ${port}  ***`);
});

app.use((_, res) => {
  res.sendStatus(404);
});
module.exports = server;
