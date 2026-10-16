/**
 * @name CQL query built from user-controlled sources
 * @description Building a CQL query from user-controlled sources is vulnerable to insertion of
 *              malicious code by the user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 8.8
 * @precision high
 * @id js/cap-sql-injection
 * @tags security
 */

import javascript
import advanced_security.javascript.frameworks.cap.CAPCqlInjectionQuery

module CqlInjectionConfigurationFlow = TaintTracking::Global<CqlInjectionConfiguration>;

import CqlInjectionConfigurationFlow::PathGraph

from CqlInjectionConfigurationFlow::PathNode source, CqlInjectionConfigurationFlow::PathNode sink
where CqlInjectionConfigurationFlow::flowPath(source, sink)
select sink.getNode().(CqlInjectionSink).getQuery(), source, sink,
  "This CQL query contains a string concatenation with a $@.", source.getNode(),
  "user-provided value"
