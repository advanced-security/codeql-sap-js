import javascript
import DataFlow
import XSJSLibModules

/**
 * The root XSJS namespace, accessed as a dollar sign (`$`) symbol.
 */
class XSJSDollarNode extends DataFlow::SourceNode {
  XSJSDollarNode() {
    this.accessesGlobal("$") and
    this.getFile().getExtension() = ["xsjs", "xsjslib"]
  }
}

/**
 * `TypeModel` for `XSJSDollarNode`.
 */
class XSJSDollarTypeModel extends ModelInput::TypeModel {
  override DataFlow::Node getASource(string type) {
    type = "XsjsDollar" and
    result = any(XSJSDollarNode dollar)
  }

  /**
   * Prevents model pruning for type `XsjsDollar`
   */
  override predicate isTypeUsed(string type) { type = "XsjsDollar" }
}

/**
 * A reference to either a response or a request. A single-part request or response
 * is accessed through `$.request` or `$.response`, but the multi-part ones are acceesed
 * through `$.request.entities[n]` or `$.response.entities[n]`, respectively.
 */
class XSJSRequestOrResponse extends SourceNode instanceof PropRef {
  string fieldName;

  XSJSRequestOrResponse() {
    fieldName = ["request", "response"] and
    (
      exists(XSJSDollarNode dollar | this = dollar.getAPropertyReference(fieldName))
      or
      exists(XSJSDollarNode dollar |
        this =
          dollar
              .getAPropertyReference(fieldName)
              .(SourceNode)
              .getAPropertyReference("entities")
              .(SourceNode)
              .getAPropertyReference() and
        this.asExpr() instanceof IndexExpr
      )
    )
  }

  predicate isResponse() { fieldName = "response" }

  predicate isRequest() { fieldName = "request" }

  PropRef getHeaders() { result = this.getAPropertyReference("headers") }

  /**
   * Get the immediate node corresponding to the `Content-Type` of this response or request.
   */
  DataFlow::Node getContentType() {
    /* 1. Setting Content-Type via `$.response.contentType` */
    result = this.getAPropertyWrite("contentType").getRhs()
    or
    /* 2. Setting Content-Type via `$.response.headers.set("Content-Type", ...)` */
    exists(MethodCallNode headersSetCall |
      headersSetCall.getReceiver().getALocalSource() = this.getHeaders() and
      headersSetCall.getMethodName() = "set" and
      headersSetCall.getArgument(0).getALocalSource().asExpr().getStringValue() = "Content-Type" and
      result = headersSetCall.getArgument(1)
    )
  }

  /**
   * Holds if the `Content-Type` is scriptable, i.e. able to include a JavaScript source.
   */
  predicate isScriptableContentType() {
    exists(string scriptableMimeType |
      scriptableMimeType in ["text/html", "text/xml", "image/svg+xml"]
    |
      this.getContentType().getALocalSource().asExpr().getStringValue() = scriptableMimeType or
      this.getContentType().asExpr().getStringValue() = scriptableMimeType
    )
  }

  /**
   * Holds if the `Content-Type` is dependent on a remote data.
   */
  predicate contentTypeIsDependentOnRemote() {
    this.getContentType().getALocalSource() instanceof RemoteFlowSource
  }
}

/**
 * A reference to a request. A single-part request is accessed through `$.request`,
 * but a multi-part one is accessed through `$.request.entities[n]`.
 */
class XSJSRequest extends XSJSRequestOrResponse {
  XSJSRequest() { this.isRequest() }

  /**
   * Gets an intraprocedural predecessor or a successor of this request, control-flow wise.
   */
  XSJSRequest getAPredOrSuccRequest() {
    exists(ControlFlowNode cfgNode |
      (
        cfgNode = this.asExpr().getFirstControlFlowNode().getAPredecessor+() or
        cfgNode = this.asExpr().getFirstControlFlowNode().getASuccessor+()
      ) and
      result.asExpr().getFirstControlFlowNode() = cfgNode
    )
  }
}

/**
 * A reference to a response. A single-part request is accessed through `$.response`,
 * but a multi-part one is accessed through `$.response.entities[n]`.
 */
class XSJSResponse extends XSJSRequestOrResponse {
  XSJSResponse() { this.isResponse() }

  /**
   * Gets an intraprocedural predecessor or a successor of this response, control-flow wise.
   */
  XSJSResponse getAPredOrSuccResponse() {
    exists(ControlFlowNode cfgNode |
      (
        cfgNode = this.asExpr().getFirstControlFlowNode().getAPredecessor+() or
        cfgNode = this.asExpr().getFirstControlFlowNode().getASuccessor+()
      ) and
      result.asExpr().getFirstControlFlowNode() = cfgNode
    )
  }
}

/**
 * A reference to a header of a request or a response.
 */
class XSJSRequestOrResponseHeaders extends SourceNode instanceof PropRef {
  XSJSRequestOrResponseHeaders() {
    exists(XSJSRequestOrResponse requestOrResponse |
      this = requestOrResponse.getAPropertyReference("headers")
    )
  }

  /**
   * Given a header property name, gets a call to `$.web.TupelList.set(name, value, options?)`
   * on this reference, which sets a header property to a value.
   */
  MethodCallNode getHeaderSetCall(string name) {
    result.getReceiver().getALocalSource() = this and
    result.getMethodName() = "set" and
    result.getArgument(0).getALocalSource().asExpr().getStringValue() = name
  }

  /**
   * Gets a call to `$.web.TupelList.set(name, value, options?)` on this reference, which sets
   * a header property to a value.
   */
  MethodCallNode getAHeaderSetCall() { result = this.getHeaderSetCall(_) }
}

/**
 * A reference to a database connection obtained either via the deprecated `$.db` namespace
 * or the now-preferred `$.hdb` namespace.
 */
class XSJSDatabaseConnectionReference extends MethodCallNode {
  string subNamespace;

  XSJSDatabaseConnectionReference() {
    exists(XSJSDollarNode dollar |
      this.getMethodName() = "getConnection" and
      this.getReceiver().getALocalSource() = dollar.getAPropertyReference(subNamespace)
    )
  }

  predicate isDbSubNamespace() { subNamespace = "db" }

  predicate isHdbSubNamespace() { subNamespace = "hdb" }

  /**
   * Gets the call that prepares the statement depending on the namespace.
   */
  abstract MethodCallNode getStatementPreparingCall();
}

/**
 * A reference to a database connection obtained via the deprecated `$.db` namespace.
 */
class XSJSDBConnectionReference extends XSJSDatabaseConnectionReference {
  XSJSDBConnectionReference() { this.isDbSubNamespace() }

  override MethodCallNode getStatementPreparingCall() {
    result = this.getAMemberCall("prepareStatement")
  }
}

/**
 * A reference to a database connection obtained via the now-preferred `$.hdb` namespace.
 */
class XSJSHDBConnectionReference extends XSJSDatabaseConnectionReference {
  XSJSHDBConnectionReference() { this.isHdbSubNamespace() }

  override MethodCallNode getStatementPreparingCall() {
    result = this.getAMemberCall("executeQuery")
  }
}

class XSJSUtilNamespace extends SourceNode instanceof PropRef {
  XSJSUtilNamespace() {
    exists(XSJSDollarNode dollar | this = dollar.getAPropertyReference("util"))
  }
}

class XSJSZipInstance extends NewNode {
  XSJSZipInstance() {
    exists(XSJSUtilNamespace util | this = util.getAConstructorInvocation("Zip"))
  }
}
