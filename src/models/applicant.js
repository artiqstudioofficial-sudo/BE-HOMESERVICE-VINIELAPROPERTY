const conn = require("../configs/db");

module.exports = {
  list: () => {
    return new Promise((resolve, reject) => {
      var query = `SELECT f.id,
        f.fullname, f.whatsapp, f.address, f.service, f.schedule_date, f.schedule_time, f.lat, f.lng, f.note,
        f.additional_cost, f.arrive_photo, f.before_photo, f.after_photo, fs.name AS status, f.created_at, f.updated_at
        FROM forms f
        INNER JOIN form_statuses fs ON fs.id = f.status
      `;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },

  getTechSchedule: (data) => {
    return new Promise((resolve, reject) => {
      // pastikan hanya YYYY-MM-DD, potong kalau ada jam / timezone
      const scheduleDate = (data.schedule_date || "").slice(0, 10);

      // 1) Ambil semua teknisi (atau semua user kalau belum ada flag teknisi)
      const sqlUsers = `
      SELECT
        u.id        AS user_id,
        u.fullname,
        u.position
      FROM users AS u
      -- kalau mau khusus teknisi, aktifkan ini dan sesuaikan value-nya:
      -- WHERE u.position = 'Teknisi'
      ORDER BY u.fullname
    `;

      // 2) Ambil semua job di tanggal tsb
      const sqlJobs = `
      SELECT
        at.user_id,
        at.id        AS apply_id,
        f.id         AS form_id,
        f.address,
        f.service,
        f.schedule_date,
        f.schedule_time,
        f.status
      FROM apply_technicians AS at
      INNER JOIN forms AS f ON f.id = at.form_id
      WHERE f.schedule_date = ?
    `;

      // Jalankan query users dulu
      conn.query(sqlUsers, (errUsers, users) => {
        if (errUsers) return reject(errUsers);

        // Lalu query jobs
        conn.query(sqlJobs, [scheduleDate], (errJobs, jobs) => {
          if (errJobs) return reject(errJobs);

          // group jobs by user_id
          const jobsByUser = new Map();
          for (const j of jobs) {
            if (!jobsByUser.has(j.user_id)) {
              jobsByUser.set(j.user_id, []);
            }
            jobsByUser.get(j.user_id).push({
              apply_id: j.apply_id,
              form_id: j.form_id,
              address: j.address,
              service: j.service,
              schedule_date: j.schedule_date,
              schedule_time: j.schedule_time,
              status: j.status,
            });
          }

          // bentukkan final result: 1 row per teknisi
          const result = users.map((u) => ({
            user_id: u.user_id,
            fullname: u.fullname,
            position: u.position,
            // kalau teknisi tidak punya job di tanggal tsb -> []
            schedules: jobsByUser.get(u.user_id) || [],
          }));

          resolve(result);
        });
      });
    });
  },

  getTechnician: (data) => {
    return new Promise((resolve, reject) => {
      var query = `SELECT u.fullname, u.username, u.position 
        FROM users u
        INNER JOIN apply_technicians at ON at.user_id = u.id
        WHERE at.form_id = ?
      `;
      conn.query(query, [data.form_id], (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },
};
