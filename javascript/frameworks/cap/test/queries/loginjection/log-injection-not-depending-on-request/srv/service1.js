const cds = require("@sap/cds");

/* Emit a "Received1" event upon receiving a READ request on its entity. */
module.exports = class Service1 extends cds.ApplicationService {
    init() {
        this.on("READ", "Entity1/Attribute1", (req) => {
            let datetime = new Date();
            this.emit("Received1", { datetime.toString() });
        });
    }
}