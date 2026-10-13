const cds = require('@sap/cds')

module.exports = class CqlStructureFixture extends cds.ApplicationService {
  init () {
    this.on('listAuthorsVulnerable', async req => {
      const orderBy = req.data.orderBy
      const { Authors } = cds.entities('sap.capire.bookshop')

      return SELECT.from(Authors).orderBy(orderBy)
    })

    this.on('listEntityVulnerable', async req => {
      return SELECT.from('sap.capire.bookshop.' + req.data.entity)
    })

    this.on('listColumnsVulnerable', async req => {
      const { Authors } = cds.entities('sap.capire.bookshop')

      return await SELECT.from(Authors).columns(req.data.columns, 'first' + 'Name')
    })

    this.on('listAuthorsSafe', async () => {
      const { Authors } = cds.entities('sap.capire.bookshop')

      return SELECT.from(Authors).orderBy('name asc')
    })

    return super.init()
  }
}
