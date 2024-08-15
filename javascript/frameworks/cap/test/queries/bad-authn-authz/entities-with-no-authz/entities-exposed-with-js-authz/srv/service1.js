const cds = require("@sap/cds");

module.exports = class Service1 extends cds.ApplicationService {
  init() {
    /*
     * Protect the whole service using `before`.
     * Translation of @(requires: [ "authenticated-user" ]).
     */
    this.before("*", (req) => {
      req.user.is("authenticated") || req.reject(403);
    });

    /*
     * Protect the entity `Service1Entity` using `before`.
     * Translation of @(restrict: { grant: 'WRITE', to: 'Role1' }).
     */
    this.before("WRITE", (req) => req.user.is("Role1") || req.reject(403));

    /*
     * Protect the entity `Service1Entity` using `before`.
     * Translation of @(restrict: { grant: [ 'WRITE', 'UPDATE' ], to: 'Role2', where: 'Attribute1 = $user.attr' }).
     */
    this.before(["WRITE", "UPDATE"], "Service1Entity", (req) => {
      (req.user.is("Role2") && Service1Entity.Attribute1 == req.user.attr) ||
        req.reject(403);
    });

    /*
     * Protect the action `send1` using `before`.
     * Translation of @(requires: "Role3").
     */
    this.before("send1", (req) => {
      req.user.is("Role3") || req.reject(403);
    });

    /*
     * Protect the function `fun1` using `before`.
     * Translation of @(restrict: [{ to: 'Role4' }]).
     */
    this.before("fun1", (req) => req.user.is("Role4") || req.reject(403));

    this.on("send1", async (req) => {
      const { messageToPass } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.send("send2", { messageToPass });
    });

    super.init();
  }
};
