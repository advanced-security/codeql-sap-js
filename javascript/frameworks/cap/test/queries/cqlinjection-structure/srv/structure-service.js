const cds = require('@sap/cds')

module.exports = class CqlStructureFixture extends cds.ApplicationService {
  init () {
    this.on('vulnerable', async req => {
      const { Authors } = cds.entities('sap.capire.bookshop')

      SELECT.from(Authors).orderBy(req.data.orderBy)
      await SELECT.from(Authors).columns(req.data.columns, 'first' + 'Name')
      SELECT.from(Authors).groupBy('name').having(req.data.having, 1)
      cds.ql.SELECT.from(req.data.facadeEntity)
      SELECT.from(Authors, 1, req.data.fromColumns).alias(req.data.alias).hints(req.data.hint)
      INSERT.into(req.data.insertEntity).columns(req.data.insertColumns)
      UPSERT.into(req.data.upsertEntity)
      UPDATE(req.data.updateEntity).set(req.data.updateSet).where(req.data.updateWhere)
      DELETE.from(req.data.deleteEntity).where(req.data.deleteWhere)
      SELECT.from(Authors).where({ ID: req.data.ID }).having({ count: req.data.count })
      return SELECT.from('sap.capire.bookshop.' + req.data.entity)
    })

    return super.init()
  }
}
