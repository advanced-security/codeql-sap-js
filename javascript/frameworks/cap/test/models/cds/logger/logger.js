import cds from '@sap/cds'

cds.log('nodejs').trace(`test`);
cds.log('nodejs').debug(`test`);
cds.log('nodejs').info(`test`);
cds.log('nodejs').log(`test`);
cds.log('nodejs').warn(`test`);
cds.log('nodejs').error(`test`);

const LOG = cds.log("nodejs");
LOG.info("test");