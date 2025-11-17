const conn = require("../configs/db");

module.exports = {
  userManagementList: () => {
    return new Promise((resolve, reject) => {
      var query = `SELECT u.id, u.fullname, u.username, r.name AS role, u.created_at 
      FROM users u
      INNER JOIN user_roles ur 
      ON u.id = ur.user_id
      INNER JOIN roles r 
      ON r.id = ur.role_id`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        }

        resolve(result);
      });
    });
  },
  userBookingList: () => {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT 
        ats.id            AS apply_id,
        f.id              AS form_id,

        u.id              AS technician_id,
        u.fullname        AS technician_name,
        u.username        AS technician_username,
        r.name            AS role,
        u.created_at      AS user_created_at,

        f.fullname        AS customer_name,
        f.whatsapp              AS customer_wa,
        f.address,
        s.name AS service,
        f.schedule_date,
        f.schedule_time,
        fs.name           AS status,
        f.note,
        f.additional_cost,
        f.arrive_photo,
        f.before_photo,
        f.after_photo,
        f.lat,
        f.lng

      FROM users u
      INNER JOIN user_roles ur 
        ON u.id = ur.user_id
      INNER JOIN roles r 
        ON r.id = ur.role_id
      INNER JOIN apply_technicians ats 
        ON ats.user_id = u.id
      INNER JOIN forms f 
        ON f.id = ats.form_id
      INNER JOIN form_statuses fs 
        ON fs.id = f.status
      INNER JOIN services s
        ON s.id = f.service
      WHERE r.name = 'technician'
      ORDER BY f.schedule_date DESC, f.schedule_time ASC
    `;

      conn.query(query, (e, result) => {
        if (e) {
          return reject(new Error(e));
        }
        resolve(result);
      });
    });
  },

  serviceList: () => {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT
        s.id,
        s.name,
        s.price,
        s.unit_price,
        s.service_category,      
        sc.name AS category      
      FROM services s
      LEFT JOIN service_categories sc
        ON sc.id = s.service_category
      ORDER BY sc.id, s.id
    `;

      conn.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      });
    });
  },

  serviceStore: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO services (name, price, unit_price, service_category, duration_minute, duration_hour, is_guarantee) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

      conn.query(
        query,
        [
          data.name,
          data.price,
          data.unit_price,
          data.service_category,
          data.duration_minute,
          data.duration_hour,
          data.is_guarantee,
        ],
        (err, result) => {
          if (err) {
            return reject(err);
          }

          resolve(result);
        }
      );
    });
  },

  serviceUpdate: (data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE services SET name = ?, price = ?, unit_price = ?, service_category = ?, 
      duration_minute = ?, duration_hour = ?, is_guarantee = ?
      WHERE id = ?`;

      conn.query(
        query,
        [
          data.name,
          data.price,
          data.unit_price,
          data.service_category,
          data.duration_minute,
          data.duration_hour,
          data.is_guarantee,
          data.id,
        ],
        (err, result) => {
          if (err) {
            return reject(err);
          }

          resolve(result);
        }
      );
    });
  },

  updateBookingStatus: (data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE forms SET status = ? WHERE id = ?`;

      conn.query(query, [data.status, data.form_id], (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      });
    });
  },

  updateBookingTechnician: (data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE apply_technicians SET user_id = ? WHERE form_id = ?`;

      conn.query(query, [data.user_id, data.form_id], (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      });
    });
  },

  userManagementStore: (data) => {
    return new Promise((resolve, reject) => {
      const query = `
      INSERT INTO users (fullname, username, password)
      VALUES (?, ?, ?)
    `;

      conn.query(
        query,
        [data.fullname, data.username, data.password],
        (err, result) => {
          if (err) {
            return reject(err);
          }

          resolve(result.insertId);
        }
      );
    });
  },

  userManagementUpdate: (data) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE users SET fullname = ?, username = ?, password = ? WHERE id = ?
    `;

      conn.query(
        query,
        [data.fullname, data.username, data.password, data.id],
        (err, result) => {
          if (err) {
            return reject(err);
          }

          resolve(result.insertId);
        }
      );
    });
  },

  userRoleStore: (data) => {
    return new Promise((resolve, reject) => {
      var query = `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`;
      conn.query(query, [data.user_id, data.role_id], (e, result) => {
        if (e) {
          reject(new Error(e));
        }

        resolve(result);
      });
    });
  },

  userRoleUpdate: (data) => {
    return new Promise((resolve, reject) => {
      var query = `UPDATE user_roles SET role_id = ? 
      WHERE user_id = ?`;
      conn.query(query, [data.role_id, data.user_id], (e, result) => {
        if (e) {
          reject(new Error(e));
        }

        resolve(result);
      });
    });
  },
};
