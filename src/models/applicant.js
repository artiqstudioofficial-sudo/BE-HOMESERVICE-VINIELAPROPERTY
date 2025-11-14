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
