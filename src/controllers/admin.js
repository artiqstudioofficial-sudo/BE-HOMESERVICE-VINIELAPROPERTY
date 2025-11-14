const misc = require("../helpers/response");
const { encryptPassword } = require("../helpers/utils");
const Admin = require("../models/admin");
const Applicant = require("../models/applicant");

module.exports = {
  storeUser: async (req, res) => {
    const { fullname, username, password, position } = req.body;

    try {
      var data = {
        fullname,
        username,
        password: await encryptPassword(password),
        position,
      };

      await Admin.storeUser(data);

      misc.response(res, 200, false, "User created successfully");
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

      console.log(schedules);

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
