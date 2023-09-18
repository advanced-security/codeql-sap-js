////////
// Datflow and taintflow summary models
////////
sap.ui.require(["sap/base/strings/camelize"], function (camelize) {
    var value = jQuery.sap.syncGet("url", "param")
    var value1 = camelize(value);
    jQuery.sap.globalEval(value1);
});

sap.ui.require(["sap/base/strings/camelize"], function (myfun) {
    var value = jQuery.sap.syncGet("url", "param")
    var value1 = myfun(value);
    jQuery.sap.globalEval(value1);
});

sap.ui.require(["sap/base/strings/capitalize"], function (capitalize) {
    var value = jQuery.sap.syncGet("url", "param")
    var value1 = capitalize(value);
    jQuery.sap.globalEval(value1);
});

sap.ui.require(["sap/base/strings/escapeRegExp"], function (escapeRegExp) {
    var value = jQuery.sap.syncGet("url", "param")
    var value1 = escapeRegExp(value);
    jQuery.sap.globalEval(value1);
});

sap.ui.require(["sap/base/strings/formatMessage"], function (formatMessage) {
    var value = jQuery.sap.syncGet("url", "param")
    var value1 = formatMessage(value);
    jQuery.sap.globalEval(value1);
});

sap.ui.require(["sap/base/strings/hyphenate"], function (hyphenate) {
    var value = jQuery.sap.syncGet("url", "param")
    var value1 = hyphenate(value);
    jQuery.sap.globalEval(value1);
});
