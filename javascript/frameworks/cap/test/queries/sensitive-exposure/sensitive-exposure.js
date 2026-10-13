import cds from '@sap/cds'
const LOG = cds.log("logger");

const { Sample } = cds.entities('advanced_security.log_exposure.sample_entities')

class SampleVulnService extends cds.ApplicationService {
    init() {
        /* A sensitive info log sink. */
        LOG.info("Received: ", Sample.name); // CAP log exposure alert

        this.on('lookup', async req => {
            const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
            const author = await SELECT.one.from(Authors).where({ ID: req.data.ID })
            const projectedSensitive = await SELECT.one.from(Authors).columns('ID, email as contactEmail')
            const projectedSafe = await SELECT.one.from(Authors).columns('ID, emailVerified')
            const projectedTagged = await SELECT.one.from(Authors).columns`{ email, ID }`
            const query = SELECT.one.from(Authors)
            const localAuthor = await query
            const runAuthor = await cds.run(SELECT.one.from(Authors))
            const projectedWildcard = await SELECT.one.from(Authors).columns('ID, *')
            const projectedObject = await SELECT.one.from(Authors).columns([{ ref: ['email'], as: 'objectEmail' }])
            const authors = await SELECT.from(Authors)

            LOG.info('author:', author)
            console.log(`email=${author.email}`)
            LOG.info('author ID:', author.ID)
            LOG.info('projected sensitive:', projectedSensitive.contactEmail)
            LOG.info('projected safe:', projectedSafe)
            LOG.info('projected tagged:', projectedTagged)
            LOG.info('local author:', localAuthor)
            LOG.info('run author:', runAuthor)
            LOG.info('projected wildcard:', projectedWildcard)
            LOG.info('projected object:', projectedObject.objectEmail)
            console.log(authors[0].email)
            console.log(authors[0].ID)
        })
    }

}
