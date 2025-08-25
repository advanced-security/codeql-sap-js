const cds = require("@sap/cds");

class Service1 extends cds.ApplicationService {  // ES6ApplicationServiceDefinition
  init() {
    return super.init()
  }
}

module.exports = Service1