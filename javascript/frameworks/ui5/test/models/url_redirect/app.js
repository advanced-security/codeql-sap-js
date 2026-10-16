sap.ui.define(["sap/m/library"], function (mobileLibrary) {
  "use strict";

  return function redirect(targetUrl) {
    mobileLibrary.URLHelper.redirect(targetUrl);
  };
});
