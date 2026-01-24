const misc = require('../helpers/response');
const { encryptPassword } = require('../helpers/utils');
const Admin = require('../models/admin');
const Applicant = require('../models/applicant');
const Role = require('../models/role');

const bcrypt = require('bcryptjs');

const path = require('path');
const fs = require('fs');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeExtFromMime(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mime] || null;
}

module.exports = {
  bookingPhotoUpload: async (req, res) => {
    try {
      /**
       * multipart/form-data
       * fields:
       * - form_id: number
       * - type: 'arrival' | 'before' | 'after'
       * - file: image
       */
      const formIdRaw = req.body?.form_id;
      const type = (req.body?.type || '').toString().toLowerCase();
      const form_id = Number(formIdRaw);

      if (!form_id || Number.isNaN(form_id)) {
        return misc.response(res, 400, true, 'INVALID_FORM_ID');
      }

      if (!['arrival', 'before', 'after'].includes(type)) {
        return misc.response(res, 400, true, 'INVALID_PHOTO_TYPE');
      }

      if (!req.files || !req.files.file) {
        return misc.response(res, 400, true, 'FILE_REQUIRED');
      }

      const file = req.files.file;

      // express-fileupload: kalau single file -> object, kalau multiple -> array
      const picked = Array.isArray(file) ? file[0] : file;

      const ext = safeExtFromMime(picked.mimetype);
      if (!ext) {
        return misc.response(res, 400, true, 'UNSUPPORTED_FILE_TYPE');
      }

      // limit size (opsional): 5MB
      const maxSize = 5 * 1024 * 1024;
      if (picked.size > maxSize) {
        return misc.response(res, 400, true, 'FILE_TOO_LARGE_MAX_5MB');
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'forms', String(form_id));
      ensureDir(uploadDir);

      const filename = `${type}-${Date.now()}.${ext}`;
      const absPath = path.join(uploadDir, filename);

      await picked.mv(absPath);

      // path public untuk disimpan ke DB (dipakai express.static('public'))
      const publicPath = `/uploads/forms/${form_id}/${filename}`;

      // mapping kolom forms
      const column =
        type === 'arrival' ? 'arrive_photo' : type === 'before' ? 'before_photo' : 'after_photo';

      await Admin.updateBookingPhoto({
        form_id,
        column,
        photo_path: publicPath,
      });

      return misc.response(res, 200, false, 'Photo uploaded successfully', {
        form_id,
        type,
        url: publicPath,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  bookingPhotoGet: async (req, res) => {
    try {
      const form_id = Number(req.query?.form_id);
      if (!form_id || Number.isNaN(form_id)) {
        return misc.response(res, 400, true, 'INVALID_FORM_ID');
      }

      const data = await Admin.getBookingPhotos({ form_id });

      return misc.response(res, 200, false, 'Booking photos fetched successfully', {
        form_id,
        photos: {
          arrival: data.arrive_photo || null,
          before: data.before_photo || null,
          after: data.after_photo || null,
        },
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // =========================
  // AUTH (LOGIN / ME / LOGOUT)
  // =========================

  authLogin: async (req, res) => {
    const { username, password } = req.body;

    try {
      if (!username || !password) {
        return misc.response(res, 400, true, 'USERNAME_PASSWORD_REQUIRED');
      }

      const user = await Admin.findUserForLogin(username);

      if (!user) {
        return misc.response(res, 401, true, 'INVALID_CREDENTIALS');
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return misc.response(res, 401, true, 'INVALID_CREDENTIALS');
      }

      req.session.user = {
        id: user.id,
        name: user.fullname,
        username: user.username,
        role: user.role || null,
        role_id: user.role_id || null,
      };

      return misc.response(res, 200, false, 'Login successfully', req.session.user);
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  authMe: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return misc.response(res, 401, true, 'UNAUTHORIZED');
      }
      return misc.response(res, 200, false, 'Me successfully', req.session.user);
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  authLogout: async (req, res) => {
    try {
      if (!req.session) {
        return misc.response(res, 200, false, 'Logout successfully');
      }

      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          return misc.response(res, 400, true, 'LOGOUT_FAILED');
        }

        res.clearCookie('connect.sid');
        return misc.response(res, 200, false, 'Logout successfully');
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  availabilityGet: async (_, res) => {
    try {
      const data = await Admin.getAvailability();

      return misc.response(res, 200, false, 'Availability fetched successfully', {
        fullyBookedDates: data.fully_booked_dates || [],
        bookedSlots: data.booked_slots || [],
        updatedAt: data.updated_at,
      });
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  availabilityUpdate: async (req, res) => {
    try {
      const fullyBookedDates = req.body?.fullyBookedDates;
      const bookedSlots = req.body?.bookedSlots;

      if (!Array.isArray(fullyBookedDates) || !Array.isArray(bookedSlots)) {
        return misc.response(res, 400, true, 'INVALID_PAYLOAD');
      }

      // basic validation format string (ringan aja)
      const allStrings =
        fullyBookedDates.every((x) => typeof x === 'string') &&
        bookedSlots.every((x) => typeof x === 'string');

      if (!allStrings) {
        return misc.response(res, 400, true, 'INVALID_PAYLOAD');
      }

      await Admin.updateAvailability({
        fully_booked_dates: fullyBookedDates,
        booked_slots: bookedSlots,
      });

      return misc.response(res, 200, false, 'Availability updated successfully');
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },

  // ---------------------------------------------------------------------------
  // USER MANAGEMENT
  // ---------------------------------------------------------------------------
  userManagementList: async (_, res) => {
    try {
      const users = await Admin.userManagementList();
      misc.response(res, 200, false, 'User management list successfully', users);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  userBookingList: async (_, res) => {
    try {
      const users = await Admin.userBookingList();
      misc.response(res, 200, false, 'User booking list successfully', users);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  userRoleList: async (_, res) => {
    try {
      const roles = await Role.list();
      misc.response(res, 200, false, 'User role list successfully', roles);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // ---------------------------------------------------------------------------
  // SERVICE
  // ---------------------------------------------------------------------------
  serviceList: async (_, res) => {
    try {
      const services = await Admin.serviceList();
      misc.response(res, 200, false, 'Service list successfully', services);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceCategoryList: async (_, res) => {
    try {
      const services = await Admin.serviceCategoryList();
      misc.response(res, 200, false, 'Service Category list successfully', services);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceStore: async (req, res) => {
    const {
      name,
      price,
      unit_price,
      service_category,
      category,
      duration_minute,
      duration_hour,
      is_guarantee,
      point,
    } = req.body;

    try {
      if (!name?.trim()) throw new Error('name wajib');
      if (price == null || String(price).trim() === '') throw new Error('price wajib');

      let categoryId = Number(service_category || 0);

      if (!categoryId) {
        const categoryName = String(category || '').trim();
        if (!categoryName) throw new Error('category wajib diisi');

        categoryId = await Admin.ensureServiceCategory(categoryName);
      }

      const data = {
        name: name.trim(),
        price,
        unit_price,
        service_category: categoryId,
        duration_minute,
        duration_hour,
        is_guarantee,
        point,
      };

      const services = await Admin.serviceStore(data);

      misc.response(res, 200, false, 'Service list successfully', services);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceUpdate: async (req, res) => {
    const {
      id,
      name,
      price,
      unit_price,
      service_category,
      duration_minute,
      duration_hour,
      is_guarantee,
      point,
    } = req.body;

    try {
      var data = {
        id: id,
        name: name,
        price: price,
        unit_price: unit_price,
        service_category: service_category,
        duration_minute: duration_minute,
        duration_hour: duration_hour,
        is_guarantee: is_guarantee,
        point: point,
      };

      const services = await Admin.serviceUpdate(data);
      misc.response(res, 200, false, 'Service list successfully', services);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceDelete: async (req, res) => {
    const { id } = req.body;

    try {
      var data = { id: id };
      await Admin.serviceDelete(data);
      misc.response(res, 200, false, 'Service delete successfully');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // ---------------------------------------------------------------------------
  // USER MANAGEMENT STORE/UPDATE/DELETE
  // ---------------------------------------------------------------------------
  userManagementStore: async (req, res) => {
    const { fullname, username, password, role_id } = req.body;

    try {
      var data = {
        fullname: fullname,
        username: username,
        password: await encryptPassword(password),
        role_id: role_id,
      };

      const userId = await Admin.userManagementStore(data);
      data.user_id = userId;

      await Admin.userRoleStore(data);

      misc.response(res, 200, false, 'User management store successfully');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  userManagementUpdate: async (req, res) => {
    const { id, fullname, username, password, role_id } = req.body;

    try {
      var data = {
        id: id,
        fullname: fullname,
        username: username,
        password: await encryptPassword(password),
        role_id: role_id,
      };

      await Admin.userManagementUpdate(data);

      // NOTE: ini bug di code lama kamu:
      // userRoleUpdate pakai data.user_id, tapi kamu gak set user_id
      // biar bener, set user_id = id
      data.user_id = id;
      await Admin.userRoleUpdate(data);

      misc.response(res, 200, false, 'User management store successfully');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  userManagementDelete: async (req, res) => {
    const { id } = req.body;

    try {
      var data = { id: id };
      await Admin.userManagementDelete(data);
      misc.response(res, 200, false, 'User management delete successfully');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // ---------------------------------------------------------------------------
  // BOOKING
  // ---------------------------------------------------------------------------
  storeBooking: async (req, res) => {
    const {
      fullname,
      whatsapp,
      service,
      status,
      address,
      lat,
      lng,
      arrival_time,
      start_time,
      end_time,
      work_duration_minutes,
      schedule_date,
      schedule_time,
    } = req.body;

    try {
      const data = {
        fullname,
        whatsapp,
        service,
        // kalau FE gak kirim status, set default (sesuaikan id status "pending" kamu)
        status: typeof status === 'undefined' || status === null || status === '' ? 1 : status,
        address,
        lat,
        lng,
        arrival_time,
        start_time,
        end_time,
        work_duration_minutes,
        schedule_date,
        schedule_time,
      };

      // ✅ ATOMIC: reserve slot + insert form
      // return: { form_id, slot, capacity, used, remaining }
      const result = await Admin.storeBookingAtomic(data);

      return misc.response(res, 201, false, 'Booking created successfully', {
        form_id: result.form_id,
        slot: result.slot,
        capacity: result.capacity,
        used: result.used,
        remaining: result.remaining,
      });
    } catch (e) {
      console.log(e);

      // reserveSlotAtomic melempar httpCode=409 untuk SLOT_FULL / DATE_NOT_AVAILABLE
      const code = e.httpCode || 400;

      // biar FE gampang, kamu bisa kirim code stringnya
      return misc.response(res, code, true, e.message);
    }
  },

  updateBookingStatus: async (req, res) => {
    try {
      var data = {
        form_id: req.body.form_id,
        user_id: req.body.user_id,
        status: req.body.status,
        arrival_time: req.body.arrival_time,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        work_duration_minutes: req.body.work_duration_minutes,
        note: req.body.note,
        additional_cost: req.body.additional_cost,
      };
      await Admin.updateBookingStatus(data);
      await Admin.updateBookingTechnician(data);

      await Admin.updateFormPatch(data);

      misc.response(res, 200, false, 'Update booking status successfully');
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  // ---------------------------------------------------------------------------
  // TECH SCHEDULE
  // ---------------------------------------------------------------------------
  techSchedule: async (req, res) => {
    const { schedule_date } = req.query;

    try {
      var data = { schedule_date: schedule_date };
      var schedules = await Applicant.getTechSchedule(data);

      misc.response(res, 200, false, 'List tech schedule successfully', schedules);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
