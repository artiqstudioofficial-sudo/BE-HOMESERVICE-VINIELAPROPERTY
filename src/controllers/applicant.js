const Applicant = require("../models/applicant");

const misc = require("../helpers/response");

module.exports = {
  form: async (req, res) => {
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
      const applicants = await Applicant.list();

      var result = [];

      for (const i in applicants) {
        var data = {
          form_id: applicants[i].id,
        };

        var technicians = await Applicant.getTechnician(data);

        result.push({
          fullname: applicants[i].fullname,
          address: applicants[i].address,
          whatsapp: applicants[i].whatsapp,
          lat: applicants[i].lat,
          lng: applicants[i].lng,
          service: applicants[i].service,
          note: applicants[i].note,
          additional_cost: applicants[i].additional_cost,
          status: applicants[i].status,
          schedule_date: applicants[i].schedule_date,
          schedule_time: applicants[i].schedule_time,
          arrive_photo: applicants[i].arrive_photo,
          before_photo: applicants[i].before_photo,
          after_photo: applicants[i].after_photo,
          technician:
            technicians.length == 0
              ? {
                  fullname: "-",
                  username: "-",
                  position: "-",
                }
              : technicians[0],
        });
      }

      misc.response(res, 200, false, "", result);
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
