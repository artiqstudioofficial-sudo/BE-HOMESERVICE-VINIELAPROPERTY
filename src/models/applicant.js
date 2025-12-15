const { promisePool } = require('../configs/db');
const { removeTimezone, formatDate } = require('../helpers/utils');

/**
 * Helper query dengan retry 1x kalau kena error koneksi
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
  // List semua form
  // ---------------------------------------------------------------------------
  list: async () => {
    const sql = `
      SELECT 
        f.id,
        f.fullname,
        f.whatsapp,
        f.address,
        f.service,
        f.schedule_date,
        f.schedule_time,
        f.lat,
        f.lng,
        f.note,
        f.additional_cost,
        f.arrive_photo,
        f.before_photo,
        f.after_photo,
        fs.name AS status,
        f.created_at,
        f.updated_at
      FROM forms f
      INNER JOIN form_statuses fs 
        ON fs.id = f.status
    `;

    return safeQuery(sql);
  },

  // ---------------------------------------------------------------------------
  // Jadwal teknisi per tanggal
  // ---------------------------------------------------------------------------
  getTechSchedule: async (data) => {
    const scheduleDate = removeTimezone(data.schedule_date);

    // Ambil semua teknisi
    const sqlUsers = `
      SELECT
        u.id   AS user_id,
        u.fullname
      FROM users AS u
      INNER JOIN user_roles ur 
        ON ur.user_id = u.id
      INNER JOIN roles r 
        ON ur.role_id = r.id
      WHERE r.name = 'technician'
      ORDER BY u.fullname
    `;

    // Ambil semua job di tanggal tsb
    const sqlJobs = `
      SELECT
        ats.user_id,
        ats.id        AS apply_id,
        f.id          AS form_id,
        f.address,
        f.fullname,
        f.whatsapp,
        s.name        AS service,
        f.schedule_date,
        f.schedule_time,
        fs.name       AS status
      FROM apply_technicians AS ats
      INNER JOIN forms AS f 
        ON f.id = ats.form_id
      INNER JOIN form_statuses fs 
        ON fs.id = f.status
      INNER JOIN services s 
        ON s.id = f.service
      WHERE DATE(f.schedule_date) = ?
    `;

    const users = await safeQuery(sqlUsers);
    const jobs = await safeQuery(sqlJobs, [scheduleDate]);

    // Group jobs by user_id
    const jobsByUser = new Map();
    for (const j of jobs) {
      if (!jobsByUser.has(j.user_id)) {
        jobsByUser.set(j.user_id, []);
      }
      jobsByUser.get(j.user_id).push({
        apply_id: j.apply_id,
        form_id: j.form_id,
        fullname: j.fullname,
        wa: j.whatsapp,
        address: j.address,
        service: j.service,
        schedule_date: formatDate(j.schedule_date),
        schedule_time: j.schedule_time,
        status: j.status,
      });
    }

    // Bentuk response: 1 row per teknisi
    const result = users.map((u) => ({
      user_id: u.user_id,
      fullname: u.fullname,
      schedules: jobsByUser.get(u.user_id) || [],
    }));

    return result;
  },

  // ---------------------------------------------------------------------------
  // Detail teknisi untuk 1 form
  // ---------------------------------------------------------------------------
  getTechnician: async (data) => {
    const sql = `
      SELECT 
        u.fullname, 
        u.username
      FROM users u
      INNER JOIN apply_technicians at 
        ON at.user_id = u.id
      WHERE at.form_id = ?
    `;

    return safeQuery(sql, [data.form_id]);
  },
};
