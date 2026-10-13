const cds = require('@sap/cds')
const LOG = cds.log('admin-service')

module.exports = class AdminService extends cds.ApplicationService {
  init () {
    this.on('lookupAuthor', async req => {
      const { Authors } = cds.entities('sap.capire.bookshop')
      const author = await SELECT.one.from(Authors).where({ ID: req.data.ID })

      LOG.info('author:', author)
      console.log(`email=${author.email}`)
      LOG.info('author ID:', author.ID)

      return author
    })

    this.on('lookupProjectedAuthors', async () => {
      const { Authors } = cds.entities('sap.capire.bookshop')
      const projectedSensitive = await SELECT.one.from(Authors).columns('ID, email as contactEmail')
      const projectedSafe = await SELECT.one.from(Authors).columns('ID, emailVerified')

      LOG.info('projected sensitive:', projectedSensitive)
      LOG.info('projected safe:', projectedSafe)
    })

    return super.init()
  }
}
