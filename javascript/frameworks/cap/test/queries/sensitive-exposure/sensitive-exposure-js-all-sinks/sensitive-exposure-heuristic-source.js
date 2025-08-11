import cds from '@sap/cds'
const LOG = cds.log("logger");

class SampleVulnService extends cds.ApplicationService {
    init() {
        LOG.info(`[INFO] Environment: ${JSON.stringify(process.env)}`); // CAP log exposure alert

        var obj = {
            x: password
        };
        LOG.info(obj); // CAP log exposure alert

        LOG.info(obj.x.replace(/./g, "*")); // NO CAP log exposure alert - replace as sanitizer 

        var user = {
            password: encryptLib.encryptPassword(password)
        };
        LOG.info(user); // NO CAP log exposure alert - encrypted data is fine
    }
}