$.import("lib/injection1.xsjslib");
let t1=$.import("lib/injection2.xsjslib");
$.import("lib/injection3.xsjslib");
$.import("lib/injection4.xsjslib");

var requestParameters = $.request.parameters;

test1(requestParameters);
t1.test1(requestParameters);
