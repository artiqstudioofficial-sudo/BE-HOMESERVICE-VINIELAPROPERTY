const misc = require("../helpers/response");
const { encryptPassword } = require("../helpers/utils");
const admin = require("../models/admin");

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

      await admin.storeUser(data);

      misc.response(res, 200, false, "User created successfully");
    } catch (e) {
      console.log(e);
      misc.response(res, 400, true, e.message);
    }
  },
};
