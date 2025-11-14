const mysql = require("mysql2");
const config = require("./configs");

const pool = mysql.createPool({
  ...config.database.mysql,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // timezone: "Z", // UTC
  // dateStrings: true, // balikan waktu dalam string (kamu yang kontrol konversi) berubah langsung gini : 2025-11-01 00:00:51 semua tipe datetime atau timestamp ga gini 2025-10-31T17:00:51.000Z
});

// Set session time_zone = UTC untuk setiap koneksi baru di pool
// pool.on("connection", (connection) => {
// connection.query("SET time_zone = 'UTC'", (err) => {
//   if (err) {
//     console.error(
//       "Failed to SET time_zone for a pooled connection:",
//       err.message
//     );
//   }
// });
// connection.query(
//   "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
// );
// });

const conn = pool;
conn.promise = pool.promise();

module.exports = conn;
