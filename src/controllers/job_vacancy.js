const misc = require("../helpers/response");

module.exports = {
  store: async (req, res) => {
    const { title, location, type } = req.body;

    try {
      misc.response(
        res,
        200,
        false,
        "Job Vacancy created successfully",
        result
      );
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
    const { title, location, type } = req.body;

    try {
      misc.response(res, 200, false, "Job Vacany updated successfully");
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;

    try {
      misc.response(res, 200, false, "Job Vacancy deleted successfully");
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
