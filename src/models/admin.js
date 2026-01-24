// repositories/admin.js
const { promisePool } = require('../configs/db');

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
  // AUTH: Find user for login (users + roles)
  // ---------------------------------------------------------------------------
  findUserForLogin: async (username) => {
    const sql = `
      SELECT
        u.id,
        u.fullname,
        u.username,
        u.password,
        ur.role_id,
        r.name AS role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.username = ?
      LIMIT 1
    `;

    const rows = await safeQuery(sql, [username]);
    return rows?.[0] || null;
  },

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
      f.arrival_time,
      f.start_time, 
      f.end_time,
      f.work_duration_minutes,
      f.note,
      f.additional_cost,
      f.arrive_photo,
      f.before_photo,
      f.after_photo,
      f.lat,
      f.lng
    FROM forms f
    -- relasi form ke teknisi (boleh null)
    LEFT JOIN apply_technicians ats 
      ON ats.form_id = f.id
    LEFT JOIN users u 
      ON u.id = ats.user_id
    LEFT JOIN user_roles ur 
      ON ur.user_id = u.id
    LEFT JOIN roles r 
      ON r.id = ur.role_id
      AND r.name = 'technician'  -- filter role di ON, bukan di WHERE

    INNER JOIN form_statuses fs 
      ON fs.id = f.status
    INNER JOIN services s
      ON s.id = f.service

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
      s.icon,
      s.name,
      s.price,
      s.is_guarantee,
      s.unit_price,
      s.duration_hour,
      s.duration_minute,
      s.service_category,
      s.point,              
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
      is_guarantee,
      point
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const params = [
      data.name,
      data.price,
      data.unit_price,
      data.service_category,
      data.duration_minute,
      data.duration_hour,
      data.is_guarantee,
      data.point,
    ];

    const result = await safeQuery(sql, params);
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
      arrival_time,
      start_time,
      end_time,
      work_duration_minutes,
      service,
      status,
      schedule_date,
      schedule_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const params = [
      data.fullname,
      data.whatsapp,
      data.address,
      data.lat,
      data.lng,
      data.arrival_time,
      data.start_time,
      data.end_time,
      data.work_duration_minutes,
      data.service,
      data.status,
      data.schedule_date,
      data.schedule_time,
    ];

    const result = await safeQuery(sql, params);
    return result.insertId;
  },

  updateFormPatch: async (data) => {
    const sets = [];
    const params = [];

    const push = (col, val) => {
      if (typeof val === 'undefined') return;
      sets.push(`${col} = ?`);
      params.push(val);
    };

    push('arrival_time', data.arrival_time);
    push('start_time', data.start_time);
    push('end_time', data.end_time);
    push('work_duration_minutes', data.work_duration_minutes);
    push('note', data.note);
    push('additional_cost', data.additional_cost);

    if (sets.length === 0) {
      return { affectedRows: 0 };
    }

    const sql = `UPDATE forms SET ${sets.join(', ')} WHERE id = ?`;
    params.push(data.form_id);

    return await safeQuery(sql, params);
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
    const updateSql = `
    UPDATE apply_technicians
    SET user_id = ?
    WHERE form_id = ?
  `;
    const upd = await safeQuery(updateSql, [data.user_id, data.form_id]);

    if (!upd || upd.affectedRows === 0) {
      const insertSql = `
      INSERT INTO apply_technicians (form_id, user_id)
      VALUES (?, ?)
    `;
      return await safeQuery(insertSql, [data.form_id, data.user_id]);
    }

    return upd;
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
    return result;
  },

  // ---------------------------------------------------------------------------
  // User Management Delete
  // ---------------------------------------------------------------------------
  userManagementDelete: async (data) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    const params = [data.id];
    const result = await safeQuery(sql, params);
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

  getAvailability: async () => {
    const sql = `
      SELECT
        fully_booked_dates,
        booked_slots,
        updated_at
      FROM availability_settings
      WHERE id = 1
      LIMIT 1
    `;

    const rows = await safeQuery(sql);

    if (!rows || rows.length === 0) {
      return {
        fully_booked_dates: [],
        booked_slots: [],
        updated_at: null,
      };
    }

    const row = rows[0];

    const fullyBooked =
      typeof row.fully_booked_dates === 'string'
        ? JSON.parse(row.fully_booked_dates || '[]')
        : row.fully_booked_dates || [];

    const bookedSlots =
      typeof row.booked_slots === 'string'
        ? JSON.parse(row.booked_slots || '[]')
        : row.booked_slots || [];

    return {
      fully_booked_dates: Array.isArray(fullyBooked) ? fullyBooked : [],
      booked_slots: Array.isArray(bookedSlots) ? bookedSlots : [],
      updated_at: row.updated_at || null,
    };
  },

  updateAvailability: async ({ fully_booked_dates, booked_slots }) => {
    const sql = `
      UPDATE availability_settings
      SET fully_booked_dates = ?, booked_slots = ?
      WHERE id = 1
    `;

    // Pastikan JSON string valid
    const params = [JSON.stringify(fully_booked_dates), JSON.stringify(booked_slots)];
    const result = await safeQuery(sql, params);
    return result;
  },

  updateBookingPhoto: async ({ form_id, column, photo_path }) => {
    const allowed = new Set(['arrive_photo', 'before_photo', 'after_photo']);
    if (!allowed.has(column)) throw new Error('INVALID_PHOTO_COLUMN');

    const sql = `
      UPDATE forms
      SET ${column} = ?
      WHERE id = ?
    `;

    return safeQuery(sql, [photo_path, form_id]);
  },

  getBookingPhotos: async ({ form_id }) => {
    const sql = `
      SELECT arrive_photo, before_photo, after_photo
      FROM forms
      WHERE id = ?
      LIMIT 1
    `;
    const rows = await safeQuery(sql, [form_id]);
    return rows?.[0] || { arrive_photo: null, before_photo: null, after_photo: null };
  },
};
