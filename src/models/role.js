// repositories/roles.js (misal)
const { promisePool } = require("../configs/db");

/**
 * Helper query dengan retry 1x kalau kena error koneksi
 */
async function safeQuery(sql, params = [], retries = 1) {
  try {
    const [rows] = await promisePool.query(sql, params);
    return rows;
  } catch (err) {
    if (
      retries > 0 &&
      (err.code === "ECONNRESET" || err.code === "PROTOCOL_CONNECTION_LOST")
    ) {
      console.warn("MySQL query error, retrying once:", err.code);
      return safeQuery(sql, params, retries - 1);
    }
    throw err;
  }
}

module.exports = {
  list: async () => {
    const sql = `SELECT id, name FROM roles`;
    return safeQuery(sql);
  },
};
