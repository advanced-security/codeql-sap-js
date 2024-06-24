const cds = require("@sap/cds");

class Service1 extends cds.ApplicationService {
  init() {
    /*
     * FP: Service1 accessing its own entity that does not
     * require authorization, with a privileged user.
     */
    this.on("send1", async (req) => {
      return this.tx(
        { user: new cds.user.Privileged("privileged-user-1") },
        (tx) =>
          tx.run(
            SELECT.from`Service1Entity1` // Declared in service1.cds
              .where`Attribute1=${req.data.messageToPass}`,
          ),
      );
    });

    /*
     * Error: Service1 accessing its own entity that requires
     * authorization, with a privileged user.
     */
    this.on("send2", async (req) => {
      return this.tx(
        { user: new cds.user.Privileged("privileged-user-2") },
        (tx) =>
          tx.run(
            SELECT.from`Service1Entity2` // Declared in service1.cds
              .where`Attribute2=${req.data.messageToPass}`,
          ),
      );
    });

    /*
     * FP: Service1 accessing a local service's entity that does not
     * require authorization, with a privileged user.
     */
    this.on("send3", async (req) => {
      return this.tx(
        { user: new cds.user.Privileged("privileged-user-3") },
        (tx) =>
          tx.run(
            SELECT.from`Service2Entity1` // Declared in service2.cds
              .where`Attribute3=${req.data.messageToPass}`,
          ),
      );
    });

    /*
     * Error: Service1 accessing a local service's entity that
     * requires authorization, with a privileged user.
     */
    this.on("send4", async (req) => {
      return this.tx(
        { user: new cds.user.Privileged("privileged-user-4") },
        (tx) =>
          tx.run(
            SELECT.from`Service2Entity2` // Declared in service2.cds
              .where`Attribute4=${req.data.messageToPass}`,
          ),
      );
    });

    /*
     * Warning: Service1 accessing a remote service's entity whose
     * authorization requirements are unknown.
     */
    this.on("send5", async (req) => {
      return this.tx(
        { user: new cds.user.Privileged("privileged-user-5") },
        (tx) =>
          tx.run(
            SELECT.from`RemoteEntity` // Assume that it's declared in @example/sample
              .where`SomeAttribute=${req.data.messageToPass}`,
          ),
      );
    });
  }
}

module.exports = Service1;
