const conn = require("../configs/db");

module.exports = {
  storeUser: (data) => {
    console.log(data);
    return new Promise((resolve, reject) => {
      var query = `INSERT INTO users (fullname, username, password, position) 
      VALUES (?, ?, ?, ?)`;
      conn.query(
        query,
        [data.fullname, data.username, data.password, data.position],
        (e, result) => {
          if (e) {
            reject(new Error(e));
          } else {
            resolve(result);
          }
        }
      );
    });
  },
};
