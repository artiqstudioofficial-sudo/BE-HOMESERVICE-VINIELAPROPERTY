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

async function withTransaction(fn) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, promisePool, withTransaction };
