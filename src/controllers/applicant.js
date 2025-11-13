const Banner = require("../models/Banner");
const misc = require("../helpers/response");

module.exports = {
  store: async (req, res) => {
    const { position, applicant, cv, message } = req.body;

    try {
      misc.response(res, 200, false, "Applicant created successfully", result);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  list: async (_, res) => {
    try {
      misc.response(res, 200, false, "", []);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { position, applicant, cv, messsage } = req.body;

    try {
      misc.response(res, 200, false, "Applicant updated successfully", result);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;

    try {
      misc.response(res, 200, false, "Applicant deleted successfully", result);
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
