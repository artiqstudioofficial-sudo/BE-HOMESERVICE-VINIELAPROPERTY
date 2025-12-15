// repositories/admin.js (misal nama file ini)
const { promisePool } = require('../configs/db');
const { storeBooking } = require('../controllers/admin');

/**
 * Helper query dengan retry sekali kalau kena error koneksi
 */
async function safeQuery(sql, params = [], retries = 1) {
  try {
    const [rows] = await promisePool.query(sql, params);
    return rows;
  } catch (err) {
    if (retries > 0 && (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
      console.warn('MySQL query error, retrying once:', err.code);
      return safeQuery(sql, params, retries - 1);
    }
    throw err;
  }
}

module.exports = {
  // ---------------------------------------------------------------------------
  // Store Booking
  // ----------------------------------------------------------------------------

  storeBooking: async (data) => {
    const sql = `
      INSERT INTO forms (
        fullname,
        whatsapp,
        address,
        lat,
        lng,
        service,
        schedule_date,
        schedule_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.fullname,
      data.whatsapp,
      data.address,
      data.lat,
      data.lng,
      data.service,
      data.schedule_date,
      data.schedule_time,
    ];

    const result = await safeQuery(sql, params);

    return result.insertId;
  },
};
