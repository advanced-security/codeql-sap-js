const cds = require('@sap/cds')

module.exports = class CqlStructureFixture extends cds.ApplicationService {
  init () {
    this.on('vulnerable', async req => {
      const { Authors } = cds.entities('sap.capire.bookshop')

      SELECT.from(Authors).orderBy(req.data.orderBy) // NON_COMPLIANT
      await SELECT.from(Authors).columns(req.data.columns, 'first' + 'Name') // NON_COMPLIANT
      SELECT.from(Authors).groupBy('name').having(req.data.having, 1) // NON_COMPLIANT
      cds.ql.SELECT.from(req.data.facadeEntity) // NON_COMPLIANT
      SELECT.from(Authors, 1, req.data.fromColumns).alias(req.data.alias).hints(req.data.hint) // NON_COMPLIANT
      INSERT.into(req.data.insertEntity).columns(req.data.insertColumns) // NON_COMPLIANT
      UPSERT.into(req.data.upsertEntity) // NON_COMPLIANT
      UPDATE(req.data.updateEntity).set(req.data.updateSet).where(req.data.updateWhere) // NON_COMPLIANT
      DELETE.from(req.data.deleteEntity).where(req.data.deleteWhere) // NON_COMPLIANT
      SELECT.from(Authors).where({ ID: req.data.ID }).having({ count: req.data.count }) // COMPLIANT
      SELECT.from(Authors).where({ [req.data.field]: 1 }) // NON_COMPLIANT
      SELECT.from(Authors).where({ ...req.data.filter }) // NON_COMPLIANT
      UPDATE(Authors).set({ name: req.data.name }) // COMPLIANT
      const q = SELECT.from(Authors) // COMPLIANT
      q.orderBy(req.data.aliasedOrderBy) // NON_COMPLIANT
      return SELECT.from('sap.capire.bookshop.' + req.data.entity) // NON_COMPLIANT
    })

    return super.init()
  }
}
