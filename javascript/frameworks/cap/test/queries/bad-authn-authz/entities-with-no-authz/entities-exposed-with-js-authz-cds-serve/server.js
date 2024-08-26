const cds = require("@sap/cds");
const app = require("express")();

cds.serve("all").in(app);

cds.serve("service-1").with(function () {
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
});

cds.serve("service-2").with((srv) => {
  /*
   * Protect the whole service using `on`.
   * Translation of @(requires: [ "authenticated-user" ]).
   */
  srv.on("*", (req) => {
    if (req.user.is("authenticated")) {
      /* Do something */
    } else req.reject(403);
  });

  /*
   * Protect the entity `Service2Entity` using `on`.
   * Translation of @(restrict: { grant: 'WRITE', to: 'Role1' }).
   */
  srv.on("WRITE", (req) => {
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
  srv.on(["WRITE", "UPDATE"], "Service2Entity", (req) => {
    if (req.user.is("Role2") && Service2Entity.Attribute3 == req.user.attr) {
      /* Do something */
    } else req.reject(403);
  });

  /*
   * Protect the action `send2` using `on`.
   * Translation of @(requires: "Role3").
   */
  srv.on("send2", (req) => {
    if (req.user.is("Role3")) {
      /* Do something */
    } else req.reject(403);
  });

  /*
   * Protect the function `fun2` using `on`.
   * Translation of @(restrict: [{ to: 'Role4' }]).
   */
  srv.on("fun2", (req) => {
    if (!req.user.is("authenticated")) {
      req.reject(403);
    } else {
      /* Do something */
    }
  });
});
