const cds = require("@sap/cds");
const other = require("another-framework");

class BaseService extends cds.Service {
  init() { return super.init(); }
}
class ApplicationService extends cds.ApplicationService {
  init() { return super.init(); }
}
class UnrelatedService extends other.Service {
  init() { return super.init(); }
}

cds.service.impl((
  srv,
  notAService
) => {
  srv.on("READ", "Books", () => []);
  notAService.on("READ", "Books", () => []);
});

other.service.impl((notACapService) => {
  notACapService.on("READ", "Books", () => []);
});

module.exports = { BaseService, ApplicationService, UnrelatedService };
