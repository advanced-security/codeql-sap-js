/* ========== obtained through module ========== */
const cds = require('@sap/cds');
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;
var select = SELECT.one.from(Table);

/* ========== not a use of the API ========== */
foo.SELECT
require("SELECT")()