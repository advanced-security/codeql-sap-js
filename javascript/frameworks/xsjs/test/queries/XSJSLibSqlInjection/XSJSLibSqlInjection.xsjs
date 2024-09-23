var requestParameters = $.request.parameters;

let t1=$.import("lib/injection1.xsjslib");
t1.test1(requestParameters);

let param = JSON.parse(requestParameters.get("param"));

let t2=$.import("lib/injection2.xsjslib");
t2.test2(param);

$.import("lib.test3","injection3");
var t3 = $.lib.test3.injection3;
te.test3(param);
