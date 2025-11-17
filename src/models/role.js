const conn = require('../configs/db');

module.exports = {
  list: () => {
    return new Promise((resolve, reject) => {
      var query = `SELECT id, name FROM roles`;
      conn.query(query, (e, result) => {
        if (e) {
          reject(new Error(e));
        } else {
          resolve(result);
        }
      });
    });
  },
};
