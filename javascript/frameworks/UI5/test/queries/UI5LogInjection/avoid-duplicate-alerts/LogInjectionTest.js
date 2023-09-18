const http = require('http');
const url = require('url');

// source is ui5-specific
function ui5loginjectionXss() {
    let value = jQuery.sap.syncGet("url", "param")
    console.info(`[INFO] User: ${value}`); //UI5 log-injection 
    jQuery.sap.log.debug(value); //UI5 log-injection
};

// source is not ui5-specific
const server1 = http.createServer((req, res) => {
    let q = url.parse(req.url, true);
    let value = q.query.username;
    console.info(`[INFO] User: ${value}`); //log-injection 
    jQuery.sap.log.debug(value); //UI5 log-injection
});

// flow through ui5-specific summary node
const server2 = http.createServer((req, res) => {
    let q = url.parse(req.url, true);
    let value = q.query.username;
    var value1 = jQuery.sap.camelCase(value);
    console.info(`[INFO] User: ${value1}`); // log-injection
    jQuery.sap.log.debug(value1); //UI5 log-injection 
});

