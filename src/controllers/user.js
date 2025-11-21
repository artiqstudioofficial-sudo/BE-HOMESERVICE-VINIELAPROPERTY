const misc = require('../helpers/response');
const User = require('../models/user');

module.exports = {
  storeBooking: async (req, res) => {
    const { fullname, whatsapp, service, address, lat, lng, schedule_date, schedule_time } =
      req.body;

    try {
      const data = {
        fullname,
        whatsapp,
        service,
        address,
        lat,
        lng,
        schedule_date,
        schedule_time,
      };

      await User.storeBooking(data);

      return misc.response(res, 201, false, 'Booking created successfully');
    } catch (e) {
      console.log(e);
      return misc.response(res, 400, true, e.message);
    }
  },
};
