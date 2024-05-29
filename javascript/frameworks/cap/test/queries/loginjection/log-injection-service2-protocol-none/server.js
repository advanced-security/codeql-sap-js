const cds = require('@sap/cds');
const app = require('express')();

cds.serve('all').in(app);
