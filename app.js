require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

const config = require('./src/configs/configs');
const port = config.port;

const routerNav = require('./src/index');

/**
 * IMPORTANT:
 * - CORS harus dipasang PALING ATAS sebelum routes/middleware lain
 * - Tangani preflight OPTIONS untuk semua route
 */
const corsOptions = {
  origin: (origin, cb) => {
    // allow request tanpa origin (curl/postman/server-to-server)
    if (!origin) return cb(null, true);

    const allowed = ['https://homeservice.viniela.id'];
    return allowed.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400, // cache preflight 24 jam
};

app.use(cors(corsOptions));
// Preflight handler (wajib untuk mencegah preflight nyangkut)
app.options(/.*/, cors(corsOptions));

// Kalau pakai cookies di localhost, ini kadang diperlukan:
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// Body parsers sebaiknya sebelum fileUpload kalau kamu upload via multipart
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  fileUpload({
    useTempFiles: false,
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // optional
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
