/* 1. Creating a custom middleware that fulfills `req.user` */

const cds = require("@sap/cds");
class CustomPrivilegedUser1 extends cds.User {
  is() {
    return true;
  }
}
module.exports = (req, res, next) => {
  req.user = new CustomPrivilegedUser1("privileged");
  next();
};
