let requestParameters = $.request.parameters;
let param = JSON.parse(requestParameters.get("param"));

let t1=$.import("lib/injection1.xsjslib");
t1.test1(requestParameters);

let t2=$.import("lib/injection2.xsjslib");
$.lib.injection2.test2(param);

let t3 = $.import("lib.test3","injection3");
t3.test3(param);

$.lib.test3.injection3.test3(param);
