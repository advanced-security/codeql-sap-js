import cds from '@sap/cds'
const LOG = cds.log("logger");

const { Sample } = cds.entities('advanced_security.log_exposure.sample_entities')

class SampleVulnService extends cds.ApplicationService {
    init() {
        /* A sensitive info log sink. */
        LOG.info("Received: ", Sample.name); // CAP log exposure alert
    }

}
