/**
 * @name Insertion of sensitive information into log files testfile for pieces of query
 * @ kind problem
 * @problem.severity warning
 * @id javascript/sensitive-log-test
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.CAPLogInjectionQuery

//annotations check
// from SensitiveAnnotatedElement c
// select c, ""

// class SensitiveExposureSource extends DataFlow::Node {
//     SensitiveExposureSource() {
//       exists(PropRead p, SensitiveAnnotatedElement c |
//         p.getPropertyName() = c.getEntityOrFieldName() and
//         this = p
//       )
//     }
//   }

//source check
// from SensitiveExposureSource s 
// select s, ""

//sink check
// from CdsLogSink s 
// select s , ""

from SensitiveAnnotatedElement c, string name
where 
name = c.(CdlEntity).getName()
or 
name = c.(CdlAttribute).getName()
select c, name