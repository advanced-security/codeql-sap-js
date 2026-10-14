sap.ui.define(["sap/m/Input"], function (Input) {
  "use strict";

  var input = new Input("requestUrl");
  input.placeAt("content");

  var url = sap.ui.getCore().byId("requestUrl").getValue();
  fetch(url);
});
