const cds = require("@sap/cds");

class Service1 extends cds.ApplicationService {
  init() {
    this.on("READ", "Service1Entity1", async (req) => {
      console.log(req.data.messageToPass);
    });

    /*
     * FP: Service1 accessing its own entity that does not
     * require authorization, with a privileged user.
     */
    this.on("send1", async (req) => {
      return this.tx(
        { user: new cds.User.Privileged("privileged-user-1") },
        (tx) =>
          tx.run(
            SELECT.from`Service1.Service1Entity1` // Declared in service1.cds
              .where`Attribute1=${req.data.messageToPass}`
          )
      );
    });

    /*
     * ERROR: Service1 accessing its own entity that requires
     * authorization, with a privileged user.
     */
    this.on("send2", async (req) => {
      return this.tx(
        { user: new cds.User.Privileged("privileged-user-2") },
        (tx) =>
          tx.run(
            SELECT.from`Service1.Service1Entity2` // Declared in service1.cds
              .where`Attribute2=${req.data.messageToPass}`
          )
      );
    });

    /*
     * FP: Service1 accessing a local service's entity that does not
     * require authorization, with a privileged user.
     */
    this.on("send3", async (req) => {
      const Service2 = await cds.connect.to("Service2");
      const { Service2Entity1 } = Service2.entities;
      return this.tx(
        { user: new cds.User.Privileged("privileged-user-3") },
        (tx) =>
          tx.run(
            SELECT.from(Service2Entity1) // Declared in service2.cds
              .where`Attribute3=${req.data.messageToPass}`
          )
      );
    });

    /*
     * ERROR: Service1 accessing a local service's entity that
     * requires authorization, with a privileged user.
     */
    this.on("send4", async (req) => {
      const Service2 = await cds.connect.to("Service2");
      const { Service2Entity2 } = Service2.entities;
      return this.tx(
        { user: new cds.User.Privileged("privileged-user-4") },
        (tx) =>
          tx.run(
            SELECT.from(Service2Entity2) // Declared in service2.cds
              .where`Attribute4=${req.data.messageToPass}`
          )
      );
    });

    /*
     * Warning: Service1 accessing a remote service's entity whose
     * authorization requirements are unknown.
     */
    this.on("send5", async (req) => {
      const RemoteService = await cds.connect.to("RemoteService");
      return RemoteService.tx(
        { user: new cds.User.Privileged("privileged-user-5") },
        (tx) =>
          tx.run(
            SELECT.from`RemoteEntity` // Assume that it's declared in @advanced-security/remote-service
              .where`SomeAttribute=${req.data.messageToPass}`
          )
      );
    });
  }
}

module.exports = Service1;
