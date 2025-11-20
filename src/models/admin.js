// repositories/admin.js (misal nama file ini)
const { promisePool } = require("../configs/db");

/**
 * Helper query dengan retry sekali kalau kena error koneksi
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
  // ---------------------------------------------------------------------------
  // User Management List
  // ---------------------------------------------------------------------------
  userManagementList: async () => {
    const sql = `
      SELECT 
        u.id, 
        u.fullname, 
        u.username, 
        r.name AS role, 
        u.created_at 
      FROM users u
      INNER JOIN user_roles ur 
        ON u.id = ur.user_id
      INNER JOIN roles r 
        ON r.id = ur.role_id
    `;

    return safeQuery(sql);
  },

  // ---------------------------------------------------------------------------
  // User Booking List
  // ---------------------------------------------------------------------------
  userBookingList: async () => {
    const sql = `
      SELECT 
        ats.id            AS apply_id,
        f.id              AS form_id,

        u.id              AS technician_id,
        u.fullname        AS technician_name,
        u.username        AS technician_username,
        r.name            AS role,
        u.created_at      AS user_created_at,

        f.fullname        AS customer_name,
        f.whatsapp        AS customer_wa,
        f.address,
        s.name            AS service,
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

    return safeQuery(sql);
  },

  // ---------------------------------------------------------------------------
  // Service List
  // ---------------------------------------------------------------------------
  serviceList: async () => {
    const sql = `
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

    return safeQuery(sql);
  },

  // ---------------------------------------------------------------------------
  // Service Category List
  // ---------------------------------------------------------------------------
  serviceCategoryList: async () => {
    const sql = `
      SELECT sc.id, sc.name 
      FROM service_categories sc
    `;

    return safeQuery(sql);
  },

  // ---------------------------------------------------------------------------
  // Service Store
  // ---------------------------------------------------------------------------
  serviceStore: async (data) => {
    const sql = `
      INSERT INTO services (
        name, 
        price, 
        unit_price, 
        service_category, 
        duration_minute, 
        duration_hour, 
        is_guarantee
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.name,
      data.price,
      data.unit_price,
      data.service_category,
      data.duration_minute,
      data.duration_hour,
      data.is_guarantee,
    ];

    const result = await safeQuery(sql, params);
    // result di sini adalah ResultSetHeader (mysql2) -> ada insertId
    return result;
  },

  // ---------------------------------------------------------------------------
  // Service Update
  // ---------------------------------------------------------------------------
  serviceUpdate: async (data) => {
    const sql = `
      UPDATE services 
      SET 
        name = ?, 
        price = ?, 
        unit_price = ?, 
        service_category = ?, 
        duration_minute = ?, 
        duration_hour = ?, 
        is_guarantee = ?
      WHERE id = ?
    `;

    const params = [
      data.name,
      data.price,
      data.unit_price,
      data.service_category,
      data.duration_minute,
      data.duration_hour,
      data.is_guarantee,
      data.id,
    ];

    const result = await safeQuery(sql, params);
    return result;
  },

  // ---------------------------------------------------------------------------
  // Service Delete
  // ---------------------------------------------------------------------------
  serviceDelete: async (data) => {
    const sql = `
      DELETE FROM services 
      WHERE id = ?
    `;

    const result = await safeQuery(sql, [data.id]);
    return result;
  },

  // ---------------------------------------------------------------------------
  // Update Booking Status
  // ---------------------------------------------------------------------------
  updateBookingStatus: async (data) => {
    const sql = `
      UPDATE forms 
      SET status = ? 
      WHERE id = ?
    `;

    const result = await safeQuery(sql, [data.status, data.form_id]);
    return result;
  },

  // ---------------------------------------------------------------------------
  // Update Booking Technician
  // ---------------------------------------------------------------------------
  updateBookingTechnician: async (data) => {
    const sql = `
      UPDATE apply_technicians 
      SET user_id = ? 
      WHERE form_id = ?
    `;

    const result = await safeQuery(sql, [data.user_id, data.form_id]);
    return result;
  },

  // ---------------------------------------------------------------------------
  // User Management Store
  // ---------------------------------------------------------------------------
  userManagementStore: async (data) => {
    const sql = `
      INSERT INTO users (
        fullname, 
        username, 
        password
      )
      VALUES (?, ?, ?)
    `;

    const params = [data.fullname, data.username, data.password];
    const result = await safeQuery(sql, params);
    // result.insertId tersedia di sini
    return result.insertId;
  },

  // ---------------------------------------------------------------------------
  // User Management Update
  // ---------------------------------------------------------------------------
  userManagementUpdate: async (data) => {
    const sql = `
      UPDATE users 
      SET fullname = ?, username = ?, password = ? 
      WHERE id = ?
    `;

    const params = [data.fullname, data.username, data.password, data.id];

    const result = await safeQuery(sql, params);
    // UPDATE tidak punya insertId; biasanya pakai affectedRows
    return result;
  },

  // ---------------------------------------------------------------------------
  // User Role Store
  // ---------------------------------------------------------------------------
  userRoleStore: async (data) => {
    const sql = `
      INSERT INTO user_roles (user_id, role_id) 
      VALUES (?, ?)
    `;

    const result = await safeQuery(sql, [data.user_id, data.role_id]);
    return result;
  },

  // ---------------------------------------------------------------------------
  // User Role Update
  // ---------------------------------------------------------------------------
  userRoleUpdate: async (data) => {
    const sql = `
      UPDATE user_roles 
      SET role_id = ? 
      WHERE user_id = ?
    `;

    const result = await safeQuery(sql, [data.role_id, data.user_id]);
    return result;
  },
};
