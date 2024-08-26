const cds = require("@sap/cds");

module.exports = cds.service.impl(function () {
  /*
   * Protect the whole service using `on`.
   * Translation of @(requires: [ "authenticated-user" ]).
   */
  this.on("*", (req) => {
    if (req.user.is("authenticated")) {
      /* Do something */
    } else req.reject(403);
  });

  /*
   * Protect the entity `Service2Entity` using `on`.
   * Translation of @(restrict: { grant: 'WRITE', to: 'Role1' }).
   */
  this.on("WRITE", (req) => {
    if (!req.user.is("Role1")) {
      req.reject(403);
    } else {
      /* Do something */
    }
  });

  /*
   * Protect the entity `Service2Entity` using `on`.
   * Translation of @(restrict: { grant: [ 'WRITE', 'UPDATE' ], to: 'Role2', where: 'Attribute3 = $user.attr' }).
   */
  this.on(["WRITE", "UPDATE"], "Service2Entity", (req) => {
    if (req.user.is("Role2") && Service2Entity.Attribute3 == req.user.attr) {
      /* Do something */
    } else req.reject(403);
  });

  /*
   * Protect the action `send2` using `on`.
   * Translation of @(requires: "Role3").
   */
  this.on("send2", (req) => {
    if (req.user.is("Role3")) {
      /* Do something */
    } else req.reject(403);
  });

  /*
   * Protect the function `fun2` using `on`.
   * Translation of @(restrict: [{ to: 'Role4' }]).
   */
  this.on("fun2", (req) => {
    if (!req.user.is("authenticated")) {
      req.reject(403);
    } else {
      /* Do something */
    }
  });

  this.on("send2", async (msg) => {
    const { messageToPass } = msg.data;
    const doSomething = console.log;
    doSomething(messageToPass);
  });
});
