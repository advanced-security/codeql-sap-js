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

    return super.init()
  }
}
