require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');

const app = express();

const config = require('./src/configs/configs');
const port = config.port;

const routerNav = require('./src/index');

// =======================
// CORS - ALLOW ALL ORIGIN
// =======================
const corsOptions = {
  origin: true, // allow semua origin (akan reflect origin request)
  credentials: true, // supaya cookie/session tetap jalan
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // preflight aman untuk semua route

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =======================
// SESSION
// =======================
const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use(
  fileUpload({
    useTempFiles: false,
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 },
  }),
);

app.use(compression());
app.use(express.static('public'));

app.use('/', routerNav);

app.use((_, res) => {
  res.sendStatus(404);
});

const server = app.listen(port, () => {
  console.log(`\n\t *** Server listening on PORT ${port}  ***`);
});

module.exports = server;
