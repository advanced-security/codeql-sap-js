$.request.body.asString();
$.response.setBody("first");
$.request.parameters.get("value");
$.response.setBody("second");

function unrelated() {
  $.request.body.asString();
}
