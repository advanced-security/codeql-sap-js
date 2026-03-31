/**
 * @name Client-side cross-site scripting
 * @description Writing user input directly to the DOM allows for
 *              a cross-site scripting vulnerability.
 * @ kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision high
 * @id js/xss
 * @tags security
 *       external/cwe/cwe-079
 *       external/cwe/cwe-116
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery
import DataFlow::DeduplicatePathGraph<DomBasedXssFlow::PathNode, DomBasedXssFlow::PathGraph>

from PathNode source, PathNode sink
where DomBasedXssFlow::flowPath(source.getAnOriginalPathNode(), sink.getAnOriginalPathNode())
select sink.getNode(), source, sink,
  sink.getNode().(Sink).getVulnerabilityKind() + " vulnerability due to $@.", source.getNode(),
  "user-provided value"
//mport semmle.javascript.security.dataflow.XssThroughDomQuery
//import XssThroughDomFlow::PathGraph
// from XssThroughDomFlow::PathNode source, XssThroughDomFlow::PathNode sink
// where
//   XssThroughDomFlow::flowPath(source, sink) and
//   not isIgnoredSourceSinkPair(source.getNode(), sink.getNode())
// select sink.getNode(), source, sink,
//   "$@ is reinterpreted as HTML without escaping meta-characters.", source.getNode(), "DOM text"
//import advanced_security.javascript.frameworks.ui5.Fragment
//import semmle.javascript.security.dataflow.DomBasedXssQuery
// import DataFlow::DeduplicatePathGraph<DomBasedXssFlow::PathNode, DomBasedXssFlow::PathGraph>
// from PathNode source, PathNode sink
// where DomBasedXssFlow::flowPath(source.getAnOriginalPathNode(), sink.getAnOriginalPathNode())
// select sink.getNode(), source, sink,
//   sink.getNode().(Sink).getVulnerabilityKind() + " vulnerability due to $@.", source.getNode(),
//   "user-provided value"
// import semmle.javascript.security.dataflow.ClientSideUrlRedirectQuery
// import DataFlow::DeduplicatePathGraph<ClientSideUrlRedirectFlow::PathNode, ClientSideUrlRedirectFlow::PathGraph>
// from PathNode source, PathNode sink
// where
//   ClientSideUrlRedirectFlow::flowPath(source.getAnOriginalPathNode(), sink.getAnOriginalPathNode())
// select sink.getNode(), source, sink, "Untrusted URL redirection depends on a $@.", source.getNode(),
//   "user-provided value"
// import javascript
// import semmle.javascript.security.dataflow.XssThroughDomQuery
// import XssThroughDomFlow::PathGraph
// from XssThroughDomFlow::PathNode source, XssThroughDomFlow::PathNode sink
// where
//   XssThroughDomFlow::flowPath(source, sink) and
//   not isIgnoredSourceSinkPair(source.getNode(), sink.getNode())
// select sink.getNode(), source, sink,
//   "$@ is reinterpreted as HTML without escaping meta-characters.", source.getNode(), "DOM text"
//private import semmle.javascript.security.dataflow.XssThroughDomCustomizations
// private class TestSource2 extends RemoteFlowSource {
//   TestSource2() { this = any(DataFlow::CallNode call | this = call) }
//   override string getSourceType() { result = "test" }
// }
// from DataFlow::Node n
// where DomBasedXssConfig::isSource(n, _)
// select n
// select sink
// from DomBasedXss::Sink sink
// select sink
// from XssThroughDom::Source source
// select source
// from RemoteFlowSource s
// select s, s.getSourceType()
// from DataFlow::InvokeNode i
// where i instanceof FragmentLoad
// select i, i.getABoundCallbackParameter(_, _)
// from CallNode c, CallNode all
// where
//   all = c.getAMemberCall(_) and
//   c instanceof FragmentLoad
// select c, all, all.getABoundCallbackParameter(_, _)
