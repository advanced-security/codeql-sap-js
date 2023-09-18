// source is ui5-specific
function testXss1() {
    var value = jQuery.sap.syncGet("url", "param")
    $('myId').html(value) //UI5 Xss
    jQuery.sap.globalEval(value); //UI5 Xss
};

// source is not ui5-specific
function testXss2() {
    var value = document.location.search
    $('myId').html(value) //Xss
    jQuery.sap.globalEval(value); //UI5 Xss
};

// flow through ui5-specific summary node
function testXss3() {
    var value = document.location.search
    var value1 = jQuery.sap.camelCase(value);
    $('myId').html(value1); //Xss
    jQuery.sap.globalEval(value1); //UI5 Xss
};

// flow through ui5-specific sanitizer
function testXss4() {
    var value = document.location.search
    var value1 = jQuery.sap.encodeXML(value)
    $('myId').html(value1); //Xss
    jQuery.sap.globalEval(value1);//NO UI5 Xss
};