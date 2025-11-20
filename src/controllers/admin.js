const misc = require("../helpers/response");
const { encryptPassword } = require("../helpers/utils");
const Admin = require("../models/admin");
const Applicant = require("../models/applicant");
const Role = require("../models/role");

module.exports = {
  userManagementList: async (_, res) => {
    try {
      const users = await Admin.userManagementList();

      misc.response(
        res,
        200,
        false,
        "User management list successfully",
        users
      );
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  userBookingList: async (_, res) => {
    try {
      const users = await Admin.userBookingList();

      misc.response(res, 200, false, "User booking list successfully", users);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  userRoleList: async (_, res) => {
    try {
      const roles = await Role.list();

      misc.response(res, 200, false, "User role list successfully", roles);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceList: async (_, res) => {
    try {
      const services = await Admin.serviceList();
      misc.response(res, 200, false, "Service list successfully", services);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceCategoryList: async (_, res) => {
    try {
      const services = await Admin.serviceCategoryList();
      misc.response(
        res,
        200,
        false,
        "Service Category list successfully",
        services
      );
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
      duration_minute,
      duration_hour,
      is_guarantee,
    } = req.body;
    try {
      var data = {
        name: name,
        price: price,
        unit_price: unit_price,
        service_category: service_category,
        duration_minute: duration_minute,
        duration_hour: duration_hour,
        is_guarantee: is_guarantee,
      };
      const services = await Admin.serviceStore(data);

      misc.response(res, 200, false, "Service list successfully", services);
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
      };
      const services = await Admin.serviceUpdate(data);

      misc.response(res, 200, false, "Service list successfully", services);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  serviceDelete: async (req, res) => {
    const { id } = req.body;

    try {
      var data = {
        id: id,
      };

      await Admin.serviceDelete(data);

      misc.response(res, 200, false, "Service delete successfully");
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

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

      misc.response(res, 200, false, "User management store successfully");
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
      await Admin.userRoleUpdate(data);

      misc.response(res, 200, false, "User management store successfully");
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  updateBookingStatus: async (req, res) => {
    try {
      var data = {
        form_id: req.body.form_id,
        user_id: req.body.user_id,
        status: req.body.status,
      };
      await Admin.updateBookingStatus(data);
      await Admin.updateBookingTechnician(data);

      misc.response(res, 200, false, "Update booking status successfully");
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  techSchedule: async (req, res) => {
    const { schedule_date } = req.query;

    try {
      var data = {
        schedule_date: schedule_date,
      };

      var schedules = await Applicant.getTechSchedule(data);

      misc.response(
        res,
        200,
        false,
        "List tech schedule successfully",
        schedules
      );
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
