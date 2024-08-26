const cds = require("@sap/cds");

class Service1 extends cds.ApplicationService {
  init() {
    /*
     * ========== 1. srv.tx(context, callback) ==========
     * context is overriding `cds.context` and callback is using it
     */
    this.on("send1", async (req) => {
      await this.tx(
        { user: new cds.user.Privileged("privileged-user-1") },
        (tx) =>
          tx.run(
            SELECT.from`Service1Entity1`
              .where`Attribute1=${req.data.messageToPass}`
          )
      );
    });

    /*
     * ========== 2. srv.tx(context) ==========
     * context is overriding `cds.context` but the transaction is executed
     * outside in the following statements
     */
    this.on("send2", async (req) => {
      let tx = this.tx({ user: new cds.user.Privileged("privileged-user-1") });
      try {
        tx.run(
          SELECT.from`Service2Entity1`
            .where`Attribute3=${req.data.messageToPass}`
        );
        await tx.commit();
      } catch (e) {
        await tx.rollback(e);
      }
    });

    /*
     * ========== 3-1. srv.tx(callback) ==========
     * `cds.context` is overridden in the preceding statements
     */
    this.on("send31", async (req) => {
      cds.context = { user: new cds.user.Privileged("privileged-user-1") };
      await this.tx((tx) =>
        tx.run(
          SELECT.from`Service2Entity1`
            .where`Attribute3=${req.data.messageToPass}`
        )
      );
    });

    /*
     * ========== 3-2. srv.tx(callback) ==========
     * `cds.context` is not overridden in the preceding statements
     */
    this.on("send32", async (req) => {
      await this.tx((tx) =>
        tx.run(
          SELECT.from`Service2Entity1`
            .where`Attribute3=${req.data.messageToPass}`
        )
      );
    });

    /*
     * ========== 4-1. srv.tx() ==========
     * `cds.context` is overridden in the preceding statements
     */
    this.on("send41", async (req) => {
      cds.context = { user: new cds.user.Privileged("privileged-user-1") };
      let tx = this.tx();
      try {
        tx.run(
          SELECT.from`Service2Entity1`
            .where`Attribute3=${req.data.messageToPass}`
        );
        await tx.commit();
      } catch (e) {
        await tx.rollback(e);
      }
    });

    /*
     * ========== 4-2. srv.tx() ==========
     * `cds.context` is not overridden in the preceding statements
     */
    this.on("send42", async (req) => {
      let tx = this.tx();
      try {
        tx.run(
          SELECT.from`Service2Entity1`
            .where`Attribute3=${req.data.messageToPass}`
        );
        await tx.commit();
      } catch (e) {
        await tx.rollback(e);
      }
    });
  }
}

module.exports = Service1;
