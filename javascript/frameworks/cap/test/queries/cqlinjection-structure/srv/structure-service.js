const cds = require('@sap/cds')

module.exports = class CqlStructureFixture extends cds.ApplicationService {
  init () {
    this.on('listAuthorsVulnerable', async req => {
      const entity = req.data.entity
      const columns = req.data.columns
      const where = req.data.where
      const groupBy = req.data.groupBy
      const orderBy = req.data.orderBy
      const { Authors } = cds.entities('sap.capire.bookshop')

      return SELECT.from(entity).columns(columns).where(where).groupBy(groupBy).orderBy(orderBy)
    })

    this.on('listAuthorsSafe', async req => {
      const { Authors } = cds.entities('sap.capire.bookshop')

      return SELECT.from(Authors).columns('ID', 'name').where('ID =', req.data.ID).groupBy('name').orderBy('name asc')
    })

    return super.init()
  }
}
