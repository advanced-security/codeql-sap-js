function htmlHeader() {
  const value = $.request.parameters.get("html");
  $.response.headers.set("Content-Type", "text/html");
  $.response.setBody(value);
}

function plainHeader() {
  const value = $.request.parameters.get("plain");
  $.response.headers.set("Content-Type", "text/plain");
  $.response.setBody(value);
}

function multipartHeader() {
  const value = $.request.parameters.get("multipart");
  $.response.entities[0].headers.set("Content-Type", "text/xml");
  $.response.entities[0].setBody(value);
}

function unrelatedHeader() {
  const value = $.request.parameters.get("unrelated");
  const other = { headers: { set: function () {} } };
  other.headers.set("Content-Type", "text/html");
  $.response.setBody(value);
}

function wrongHeaderName() {
  const value = $.request.parameters.get("wrong");
  $.response.headers.set("X-Content-Type", "text/html");
  $.response.setBody(value);
}

function taintedHeader() {
  const value = $.request.parameters.get("body");
  const contentType = $.request.parameters.get("type");
  $.response.headers.set("Content-Type", contentType);
  $.response.setBody(value);
}
