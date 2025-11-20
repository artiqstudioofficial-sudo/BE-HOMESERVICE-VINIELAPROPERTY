const mysql = require("mysql2");
const config = require("./configs");

const pool = mysql.createPool({
  ...config.database.mysql,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const promisePool = pool.promise();

module.exports = { pool, promisePool };
