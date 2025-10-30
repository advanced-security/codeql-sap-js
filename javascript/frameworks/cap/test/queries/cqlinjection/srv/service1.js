/**
 * This module houses test cases for the CQL injection query with some safe cases
 * (does not trigger the vulnerability) cases plus some unsafe cases (does trigger
 * the vulnerability).
 */

const cds = require("@sap/cds");

module.exports = class Service1 extends cds.ApplicationService {
  init() {
    /* ========== 1. Service1 running query on the database service using `cds.run` and friends using Fluent API ========== */
    this.on("send00111", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where("ID=" + id);
      cds.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00112", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where(`ID=` + id);
      cds.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00113", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where(`ID=${id}`);
      cds.run(query);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send00114", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where`ID=${id}`;
      cds.run(query);  // SAFE: tagged template expression
    });

    this.on("send00121", async (req) => {
      const { id } = req.data;
      cds.read("Entity1").where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00122", async (req) => {
      const { id } = req.data;
      cds.read("Entity1").where(`ID =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00123", async (req) => {
      const { id } = req.data;
      cds.read("Entity1").where(`ID=${id}`);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send00124", async (req) => {
      const { id } = req.data;
      cds.read("Entity1").where`ID=${id}`;  // SAFE: tagged template expression
    });

    this.on("send00131", async (req) => {
      const { id } = req.data;
      cds.create("Entity1").entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00132", async (req) => {
      const { id } = req.data;
      cds.create("Entity1").entries({id: `` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00133", async (req) => {
      const { id } = req.data;
      cds.create("Entity1").entries({id: `${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00141", async (req) => {
      const { id, amount } = req.data;
      cds.update("Entity1").set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00142", async (req) => {
      const { id, amount } = req.data;
      cds.update("Entity1").set("col1 = col1" + amount).where(`col1 = ` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00143", async (req) => {
      const { id, amount } = req.data;
      cds.update("Entity1").set("col1 = col1" + amount).where(`col1 = ${id}`);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send00144", async (req) => {
      const { id, amount } = req.data;
      cds.update("Entity1").set("col1 = col1" + amount).where`col1 = ${id}`;  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00151", async (req) => {
      const { id } = req.data;
      cds.insert("Entity1").entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00152", async (req) => {
      const { id } = req.data;
      cds.insert("Entity1").entries({id: `` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00153", async (req) => {
      const { id } = req.data;
      cds.insert("Entity1").entries({id: `${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00161", async (req) => {
      const { id } = req.data;
      cds.upsert("Entity1").entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00162", async (req) => {
      const { id } = req.data;
      cds.upsert("Entity1").entries({id: `` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00163", async (req) => {
      const { id } = req.data;
      cds.upsert("Entity1").entries({id: `${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00171", async (req) => {
      const { id } = req.data;
      cds.delete("Entity1").where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00172", async (req) => {
      const { id } = req.data;
      cds.delete("Entity1").where(`ID =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00173", async (req) => {
      const { id } = req.data;
      cds.delete("Entity1").where(`ID = ${id}`);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send00174", async (req) => {
      const { id } = req.data;
      cds.delete("Entity1").where`ID = ${id}`;  // SAFE: tagged template expression
    });

    /* ========== 2. Service1 running query on itself by `await`-ing the query ========== */
    this.on("send00211", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await SELECT.from(Service1Entity).where("ID=" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00212", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await SELECT.from(Service1Entity).where(`ID=` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00213", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await SELECT.from(Service1Entity).where(`ID=${id}`);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send00214", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await SELECT.from(Service1Entity).where`ID=${id}`;  // SAFE: tagged template expression
    });

    this.on("send00221", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await INSERT.into(Service1Entity).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00222", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await INSERT.into(Service1Entity).entries({id: `ID =` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00223", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await INSERT.into(Service1Entity).entries({id: `ID = ${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00231", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPDATE.entity(Service1Entity).set("col1 = col1 + " + id).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00232", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPDATE.entity(Service1Entity).set("col1 = col1 + " + id).where(`ID =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00233", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPDATE.entity(Service1Entity).set("col1 = col1 + " + id).where(`ID = ${id}`);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00234", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPDATE.entity(Service1Entity).set("col1 = col1 + " + id).where`ID = ${id}`;  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00241", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPSERT.into(Service1Entity).entries({ id: "" + id });  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00242", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPSERT.into(Service1Entity).entries({ id: `` + id });  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00243", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await UPSERT.into(Service1Entity).entries({ id: `${id}` });  // SAFE: `entries` call safely parses the property value
    });

    this.on("send00251", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await DELETE.from(Service1Entity).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00252", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await DELETE.from(Service1Entity).where(`ID =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send00253", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await DELETE.from(Service1Entity).where(`ID = ${id}`);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send00254", async (req) => {
      const { id } = req.data;
      const { Service1Entity } = this.entities;
      await DELETE.from(Service1Entity).where`ID = ${id}`;  // SAFE: tagged template expression
    });

    /* ========== 3. Service1 running query on itself using `this.run` and friends using Fluent API ========== */
    this.on("send31", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Service1Entity`.where("ID=" + id);  // UNSAFE: direct concatenation with `+`
      this.run(query);
    });

    this.on("send32", async (req) => {
      const { id } = req.data;
      this.read(`Service1Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send33", async (req) => {
      const { id } = req.data;
      this.create(`Service1Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send34", async (req) => {
      const { id, amount } = req.data;
      this.update(`Service1Entity`).set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send35", async (req) => {
      const { id } = req.data;
      this.insert(`Service1Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send36", async (req) => {
      const { id } = req.data;
      this.upsert(`Service1Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send37", async (req) => {
      const { id } = req.data;
      this.delete(`Service1Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    /* ========== 4. Service1 running query on Service2 using `Service2.run` and friends ========== */
    this.on("send41", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = SELECT.from`Service1Entity`.where("ID=" + id);
      Service2.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send42", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.read(`Service2Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send43", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.create(`Service2Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send44", async (req) => {
      const { id, amount } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.update(`Service2Entity`).set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send45", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.insert(`Service2Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send46", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.upsert(`Service2Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send47", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.delete(`Service2Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    /* ========== 5. Service1 running query on Service2 using CQN parsed with `cds.ql` ========== */
    this.on("send51", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = cds.ql("SELECT * from Service1Entity where ID =" + id);
      Service2.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send51", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = cds.ql(`SELECT * from Service1Entity where ID =` + id);
      Service2.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send53", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = cds.ql(`SELECT * from Service1Entity where ID = ${id}`);
      Service2.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send54", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = cds.ql`SELECT * from Service1Entity where ID = ${id}`;
      Service2.run(query);  // SAFE: tagged template expression
    });

    /* ========== 6. Service1 running query on the database service using CQN parsed with `cds.parse.cql` ========== */
    this.on("send61", async (req) => {
      const { id } = req.data;
      const query = cds.parse.cql("SELECT * from Entity1 where ID =" + id);
      cds.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send62", async (req) => {
      const { id } = req.data;
      const query = cds.parse.cql(`SELECT * from Entity1 where ID =` + id);
      cds.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send63", async (req) => {
      const { id } = req.data;
      const query = cds.parse.cql(`SELECT * from Entity1 where ID = ${id}`);
      cds.run(query);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send64", async (req) => {
      const { id } = req.data;
      const query = cds.parse.cql`SELECT * from Entity1 where ID = ${id}`;
      cds.run(query);  // SAFE: tagged template expression
    });

    /* ========== 7. Service1 running query on the database service using CQN parsed with global function `CQL` ========== */
    this.on("send71", async (req) => {
      const { id } = req.data;
      const query = CQL("SELECT * from Entity1 where ID =" + id);
      cds.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send72", async (req) => {
      const { id } = req.data;
      const query = CQL(`SELECT * from Entity1 where ID =` + id);
      cds.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send73", async (req) => {
      const { id } = req.data;
      const query = CQL(`SELECT * from Entity1 where ID = ${id}`);
      cds.run(query);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send74", async (req) => {
      const { id } = req.data;
      const query = CQL`SELECT * from Entity1 where ID = ${id}`;
      cds.run(query);  // SAFE: tagged template expression
    });

    /* ========== 8. Service1 running query on Service2 using an unparsed CDL string (only valid in old versions of CAP) ========== */
    this.on("send81", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = "SELECT * from Entity1 where ID =" + id;
      Service2.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send82", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = `SELECT * from Entity1 where ID =` + id;
      Service2.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send83", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = `SELECT * from Entity1 where ID = ${id}`;
      Service2.run(query);  // UNSAFE: direct interpolation in a template literal
    });

    /* ========== 9. Service1 running query on Service2 using `Service2.tx( tx => tx.run(...) )` and friends ========== */
    this.on("send91", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      const query = SELECT.from`Service2Entity`.where("ID=" + id);
      Service2.tx(async (tx) => {
        tx.run(query);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send92", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.tx(async (tx) => {
        tx.read(`Service2Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send93", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.tx(async (tx) => {
        tx.create(`Service2Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send94", async (req) => {
      const { id, amount } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.tx(async (tx) => {
        tx.update(`Service2Entity`).set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send95", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.tx(async (tx) => {
        tx.insert(`Service2Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send96", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.tx(async (tx) => {
        tx.upsert(`Service2Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send97", async (req) => {
      const { id } = req.data;
      const Service2 = await cds.connect.to("Service2");
      Service2.tx(async (tx) => {
        tx.delete(`Service2Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    /* ========== 10. Service1 running query on itself using `this.tx( tx => tx.run(...) )` and friends ========== */
    this.on("send101", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Service1Entity`.where("ID=" + id);
      this.tx(async (tx) => {
        tx.run(query);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send102", async (req) => {
      const { id } = req.data;
      this.tx(async (tx) => {
        tx.read(`Service1Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send103", async (req) => {
      const { id } = req.data;
      this.tx(async (tx) => {
        tx.create(`Service1Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send104", async (req) => {
      const { id, amount } = req.data;
      this.tx(async (tx) => {
        tx.update(`Service1Entity`).set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send105", async (req) => {
      const { id } = req.data;
      this.tx(async (tx) => {
        tx.insert(`Service1Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send106", async (req) => {
      const { id } = req.data;
      this.tx(async (tx) => {
        tx.upsert(`Service1Entity`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send107", async (req) => {
      const { id } = req.data;
      this.tx(async (tx) => {
        tx.delete(`Service1Entity`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    /* ========== 11. Service1 running query on the database service using `cds.tx( tx => tx.run(...) )` and friends ========== */
    this.on("send111", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where("ID=" + id);
      cds.tx(async (tx) => {
        tx.run(query);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send112", async (req) => {
      const { id } = req.data;
      cds.tx(async (tx) => {
        tx.read(`Entity1`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send113", async (req) => {
      const { id } = req.data;
      cds.tx(async (tx) => {
        tx.create(`Entity1`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send114", async (req) => {
      const { id, amount } = req.data;
      cds.tx(async (tx) => {
        tx.update(`Entity1`).set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send115", async (req) => {
      const { id } = req.data;
      cds.tx(async (tx) => {
        tx.insert(`Entity1`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send116", async (req) => {
      const { id } = req.data;
      cds.tx(async (tx) => {
        tx.upsert(`Entity1`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send117", async (req) => {
      const { id } = req.data;
      cds.tx(async (tx) => {
        tx.delete(`Entity1`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    /* ========== 12. Service1 running query on the database service using `cds.db.tx( tx => tx.run(...) )` and friends ========== */
    this.on("send121", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where("ID=" + id);
      cds.db.tx(async (tx) => {
        tx.run(query);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send122", async (req) => {
      const { id } = req.data;
      cds.db.tx(async (tx) => {
        tx.read(`Entity1`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send123", async (req) => {
      const { id } = req.data;
      cds.db.tx(async (tx) => {
        tx.create(`Entity1`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send124", async (req) => {
      const { id, amount } = req.data;
      cds.db.tx(async (tx) => {
        tx.update(`Entity1`).set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    this.on("send125", async (req) => {
      const { id } = req.data;
      cds.db.tx(async (tx) => {
        tx.insert(`Entity1`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send126", async (req) => {
      const { id } = req.data;
      cds.db.tx(async (tx) => {
        tx.upsert(`Entity1`).entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
      });
    });

    this.on("send127", async (req) => {
      const { id } = req.data;
      cds.db.tx(async (tx) => {
        tx.delete(`Entity1`).where("ID =" + id);  // UNSAFE: direct concatenation with `+`
      });
    });

    /* ========== 13. Service1 running query on the database service using `cds.run` and friends using Fluent API ========== */
    this.on("send001311", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where("ID=" + id);
      cds.db.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001312", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where(`ID=` + id);
      cds.db.run(query);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001313", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where(`ID=${id}`);
      cds.db.run(query);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send001314", async (req) => {
      const { id } = req.data;
      const query = SELECT.from`Entity1`.where`ID=${id}`;
      cds.db.run(query);  // SAFE: tagged template expression
    });

    this.on("send001321", async (req) => {
      const { id } = req.data;
      cds.db.read("Entity1").where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001322", async (req) => {
      const { id } = req.data;
      cds.db.read("Entity1").where(`ID =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001323", async (req) => {
      const { id } = req.data;
      cds.db.read("Entity1").where(`ID=${id}`);  // UNSAFE: direct interpolation in a template literal
    });

    this.on("send001324", async (req) => {
      const { id } = req.data;
      cds.db.read("Entity1").where`ID=${id}`;  // SAFE: tagged template expression
    });

    this.on("send001331", async (req) => {
      const { id } = req.data;
      cds.db.create("Entity1").entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001332", async (req) => {
      const { id } = req.data;
      cds.db.create("Entity1").entries({id: `` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001333", async (req) => {
      const { id } = req.data;
      cds.db.create("Entity1").entries({id: `${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001341", async (req) => {
      const { id, amount } = req.data;
      cds.db.update("Entity1").set("col1 = col1" + amount).where("col1 = " + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001342", async (req) => {
      const { id, amount } = req.data;
      cds.db.update("Entity1").set("col1 = col1" + amount).where(`col1 =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001343", async (req) => {
      const { id, amount } = req.data;
      cds.db.update("Entity1").set("col1 = col1" + amount).where(`col1 = ${id}`);  // UNSAFE: direct concatenation with `+`, direct interpolation in a template literal
    });

    this.on("send001344", async (req) => {
      const { id, amount } = req.data;
      cds.db.update("Entity1").set("col1 = col1" + amount).where`col1 = ${id}`;  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001351", async (req) => {
      const { id } = req.data;
      cds.db.insert("Entity1").entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001352", async (req) => {
      const { id } = req.data;
      cds.db.insert("Entity1").entries({id: `` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001353", async (req) => {
      const { id } = req.data;
      cds.db.insert("Entity1").entries({id: `${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001361", async (req) => {
      const { id } = req.data;
      cds.db.upsert("Entity1").entries({id: "" + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001362", async (req) => {
      const { id } = req.data;
      cds.db.upsert("Entity1").entries({id: `` + id});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001363", async (req) => {
      const { id } = req.data;
      cds.db.upsert("Entity1").entries({id: `${id}`});  // SAFE: `entries` call safely parses the property value
    });

    this.on("send001371", async (req) => {
      const { id } = req.data;
      cds.db.delete("Entity1").where("ID =" + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001372", async (req) => {
      const { id } = req.data;
      cds.db.delete("Entity1").where(`ID =` + id);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001373", async (req) => {
      const { id } = req.data;
      cds.db.delete("Entity1").where(`ID = ${id}`);  // UNSAFE: direct concatenation with `+`
    });

    this.on("send001374", async (req) => {
      const { id } = req.data;
      cds.db.delete("Entity1").where`ID = ${id}`;  // SAFE: tagged template expression
    });

    /* ========== FP cases that don't involve CAP APIs ========== */

    const pg = require("pg");
    let pool = new pg.Pool(config);
    pool.query(req.params.category, [], function (err, results) { // non-CQL injection alert
    });

    const app = require("express")();
    app.get("search", function handler(req2, res) {
      pool.query(req2.params.category, [], function (err, results) { // non-CQL injection alert
      });
    });
  }
};
