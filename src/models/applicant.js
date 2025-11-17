const conn = require('../configs/db');
const { removeTimezone, formatDate } = require('../helpers/utils');

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
      const scheduleDate = removeTimezone(data.schedule_date);

      const sqlUsers = `SELECT
        u.id AS user_id,
        u.fullname
        FROM users AS u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'technician'
        ORDER BY u.fullname
      `;

      const sqlJobs = `
        SELECT
        ats.user_id,
        ats.id AS apply_id,
        f.id   AS form_id,
        f.address,
        f.fullname,
        f.whatsapp,
        s.name AS service,
        f.schedule_date,
        f.schedule_time,
        fs.name AS status
        FROM apply_technicians AS ats
        INNER JOIN forms AS f ON f.id = ats.form_id
        INNER JOIN form_statuses fs ON fs.id = f.status
        INNER JOIN services s ON s.id = f.service
        AND DATE(f.schedule_date) = ? 
      `;

      conn.query(sqlUsers, (errUsers, users) => {
        if (errUsers) return reject(errUsers);

        conn.query(sqlJobs, [scheduleDate], (errJobs, jobs) => {
          if (errJobs) return reject(errJobs);

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

          const result = users.map((u) => ({
            user_id: u.user_id,
            fullname: u.fullname,
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
