# CAP Insertion of Sensitive Information into Log File

If sensitive information is written to a log entry using the CAP Node.js logging API, a malicious user may be able to gain access to user data.

Data annotated as `@PersonalData` should not be logged.

## Recommendation

CAP applications should not log sensitive information. Check CDS declarations for annotations before logging certain data types or fields.

## Examples

This CAP service directly logs the sensitive information.

```cds
namespace advanced_security.log_exposure.sample_entities;

entity Sample {
    name         : String(111);
}

// annotations for Data Privacy
annotate Sample with
@PersonalData : { DataSubjectRole : 'Sample', EntitySemantics : 'DataSubject' }
{
  name  @PersonalData.IsPotentiallySensitive;
}
```

``` javascript
import cds from '@sap/cds'
const LOG = cds.log("logger");

const { Sample } = cds.entities('advanced_security.log_exposure.sample_entities')

class SampleVulnService extends cds.ApplicationService {
    init() {
        LOG.info("Received: ", Sample.name); // CAP log exposure alert
    }
}
```

## References

- OWASP 2021: [Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/).
- OWASP: [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- OWASP: [User Privacy Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html).
- SAP CAPire Documentation: [PersonalData Annotations](https://cap.cloud.sap/docs/guides/data-privacy/annotations).