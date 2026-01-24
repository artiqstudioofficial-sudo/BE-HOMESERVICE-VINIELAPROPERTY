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

/**
 * ✅ Helper transaksi: jalankan fn(conn) dalam 1 transaksi
 * NOTE: transaksi tidak bisa pakai safeQuery (karena safeQuery ambil koneksi random dari pool)
 */
async function withTransaction(fn) {
  const conn = await promisePool.getConnection();
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

// ---------- helpers for reserve ----------
function parseJsonSafe(v, fallback) {
  try {
    if (typeof v === 'string') return JSON.parse(v || JSON.stringify(fallback));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeBookedToMap(bookedRaw) {
  const map = {};

  // legacy array => count occurrences
  if (Array.isArray(bookedRaw)) {
    for (const k of bookedRaw) {
      if (typeof k !== 'string' || !k) continue;
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }

  // object map
  if (bookedRaw && typeof bookedRaw === 'object') {
    for (const [k, v] of Object.entries(bookedRaw)) {
      if (typeof k !== 'string' || !k) continue;
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      map[k] = Number.isFinite(n) && n > 0 ? n : 0;
    }
    return map;
  }

  return {};
}

/**
 * ✅ Reserve 1 kapasitas untuk slotKey (YYYY-MM-DD-HH:MM) secara ATOMIC.
 * Wajib dipanggil di dalam transaksi (pakai withTransaction).
 *
 * Return:
 * { status: "OK"|"FULL"|"DATE_BLOCKED", capacity, used, remaining }
 */
async function reserveSlotAtomic(conn, { slotKey }) {
  // lock row id=1
  const [rows] = await conn.query(
    `
    SELECT fully_booked_dates, booked_slots, max_capacity_per_slot
    FROM availability_settings
    WHERE id = 1
    FOR UPDATE
    `,
  );

  // kalau row belum ada, buat default
  if (!rows || rows.length === 0) {
    await conn.query(
      `
      INSERT INTO availability_settings (id, fully_booked_dates, booked_slots, max_capacity_per_slot, updated_at)
      VALUES (1, JSON_ARRAY(), JSON_OBJECT(), 1, NOW())
      `,
    );
  }

  // ambil lagi (tetap lock)
  const [[row]] = await conn.query(
    `
    SELECT fully_booked_dates, booked_slots, max_capacity_per_slot
    FROM availability_settings
    WHERE id = 1
    FOR UPDATE
    `,
  );

  const fullyBookedArr = parseJsonSafe(row?.fully_booked_dates, []);
  const bookedRaw = parseJsonSafe(row?.booked_slots, {});
  const bookedMap = normalizeBookedToMap(bookedRaw);

  const capRaw = row?.max_capacity_per_slot;
  const capNum = typeof capRaw === 'number' ? capRaw : parseInt(String(capRaw ?? ''), 10);
  const capacity = Number.isFinite(capNum) && capNum > 0 ? capNum : 1;

  const dateKey = String(slotKey).slice(0, 10); // "YYYY-MM-DD"

  // tanggal full => reject
  if (Array.isArray(fullyBookedArr) && fullyBookedArr.includes(dateKey)) {
    return { status: 'DATE_BLOCKED', capacity, used: 0, remaining: 0 };
  }

  const used = bookedMap[slotKey] || 0;

  // slot full => reject
  if (used >= capacity) {
    return { status: 'FULL', capacity, used, remaining: 0 };
  }

  // increment
  bookedMap[slotKey] = used + 1;

  // update JSON object map
  await conn.query(
    `
    UPDATE availability_settings
    SET booked_slots = ?, updated_at = NOW()
    WHERE id = 1
    `,
    [JSON.stringify(bookedMap)],
  );

  return {
    status: 'OK',
    capacity,
    used: used + 1,
    remaining: capacity - (used + 1),
  };
}

module.exports = {
  // ✅ export helper transaksi & reserve
  withTransaction,
  reserveSlotAtomic,

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
    LEFT JOIN apply_technicians ats 
      ON ats.form_id = f.id
    LEFT JOIN users u 
      ON u.id = ats.user_id
    LEFT JOIN user_roles ur 
      ON ur.user_id = u.id
    LEFT JOIN roles r 
      ON r.id = ur.role_id
      AND r.name = 'technician'
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

    return safeQuery(sql, params);
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

    return safeQuery(sql, params);
  },

  // ---------------------------------------------------------------------------
  // Service Delete
  // ---------------------------------------------------------------------------
  serviceDelete: async (data) => {
    const sql = `
      DELETE FROM services 
      WHERE id = ?
    `;
    return safeQuery(sql, [data.id]);
  },

  // ---------------------------------------------------------------------------
  // Store Booking (LEGACY - tidak atomic)
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

  /**
   * ✅ Store Booking ATOMIC:
   * reserve slot + insert forms dalam 1 transaksi
   * kalau slot full -> throw Error("SLOT_FULL") / Error("DATE_NOT_AVAILABLE")
   */
  storeBookingAtomic: async (data) => {
    return withTransaction(async (conn) => {
      const slotKey = `${data.schedule_date}-${data.schedule_time}`;

      const r = await reserveSlotAtomic(conn, { slotKey });

      if (r.status === 'DATE_BLOCKED') {
        const err = new Error('DATE_NOT_AVAILABLE');
        err.httpCode = 409;
        throw err;
      }
      if (r.status === 'FULL') {
        const err = new Error('SLOT_FULL');
        err.httpCode = 409;
        throw err;
      }

      // insert forms pakai conn (bukan safeQuery)
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

      const [ins] = await conn.query(sql, params);

      return {
        form_id: ins.insertId,
        slot: slotKey,
        capacity: r.capacity,
        used: r.used,
        remaining: r.remaining,
      };
    });
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

    if (sets.length === 0) return { affectedRows: 0 };

    const sql = `UPDATE forms SET ${sets.join(', ')} WHERE id = ?`;
    params.push(data.form_id);

    return await safeQuery(sql, params);
  },

  updateBookingStatus: async (data) => {
    const sql = `
      UPDATE forms 
      SET status = ? 
      WHERE id = ?
    `;
    return safeQuery(sql, [data.status, data.form_id]);
  },

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

  userManagementUpdate: async (data) => {
    const sql = `
      UPDATE users 
      SET fullname = ?, username = ?, password = ? 
      WHERE id = ?
    `;
    const params = [data.fullname, data.username, data.password, data.id];
    return safeQuery(sql, params);
  },

  userManagementDelete: async (data) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    return safeQuery(sql, [data.id]);
  },

  userRoleStore: async (data) => {
    const sql = `
      INSERT INTO user_roles (user_id, role_id) 
      VALUES (?, ?)
    `;
    return safeQuery(sql, [data.user_id, data.role_id]);
  },

  userRoleUpdate: async (data) => {
    const sql = `
      UPDATE user_roles 
      SET role_id = ? 
      WHERE user_id = ?
    `;
    return safeQuery(sql, [data.role_id, data.user_id]);
  },

  getAvailability: async () => {
    const sql = `
      SELECT
        fully_booked_dates,
        booked_slots,
        max_capacity_per_slot,
        updated_at
      FROM availability_settings
      WHERE id = 1
      LIMIT 1
    `;

    const rows = await safeQuery(sql);

    const base = {
      fully_booked_dates: [],
      booked_slots: {}, // map counter
      max_capacity_per_slot: 1,
      updated_at: null,
    };

    if (!rows || rows.length === 0) return base;

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
      fully_booked_dates,
      booked_slots,
      max_capacity_per_slot,
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
