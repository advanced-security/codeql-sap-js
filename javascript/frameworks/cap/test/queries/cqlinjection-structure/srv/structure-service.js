const cds = require('@sap/cds')

module.exports = class CqlStructureFixture extends cds.ApplicationService {
  init () {
    this.on('listAuthorsVulnerable', async req => {
      const orderBy = req.data.orderBy
      const { Authors } = cds.entities('sap.capire.bookshop')

      return SELECT.from(Authors).orderBy(orderBy)
    })

    this.on('listAuthorsSafe', async () => {
      const { Authors } = cds.entities('sap.capire.bookshop')

      return SELECT.from(Authors).orderBy('name asc')
    })

    return super.init()
  }
}
