import cds from '@sap/cds'
const LOG = cds.log("logger");

const { Sample } = cds.entities('advanced_security.log_exposure.sample_entities')

class SampleVulnService extends cds.ApplicationService {
    init() {
        /* A sensitive info log sink. */
        LOG.info("Received: ", Sample.name); // CAP log exposure alert

        this.on('lookupAuthor', async req => {
            const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
            const author = await SELECT.one.from(Authors).where({ ID: req.data.ID })

            LOG.info('author:', author)
            console.log(`email=${author.email}`)
            LOG.info('author ID:', author.ID)
        })

        this.on('lookupProjectedAuthors', async () => {
            const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
            const projectedSensitive = await SELECT.one.from(Authors).columns('ID, email as contactEmail')
            const projectedSafe = await SELECT.one.from(Authors).columns('ID, emailVerified')

            LOG.info('projected sensitive:', projectedSensitive.contactEmail)
            LOG.info('projected safe:', projectedSafe)
        })

        this.on('lookupTaggedAuthors', async () => {
            const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
            const projectedTagged = await SELECT.one.from(Authors).columns`{ email, ID }`

            LOG.info('projected tagged:', projectedTagged)
        })

        this.on('lookupExecutionForms', async () => {
            const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
            const query = SELECT.one.from(Authors)
            const localAuthor = await query
            const runAuthor = await cds.run(SELECT.one.from(Authors))

            LOG.info('local author:', localAuthor)
            LOG.info('run author:', runAuthor)
        })
    }

}
