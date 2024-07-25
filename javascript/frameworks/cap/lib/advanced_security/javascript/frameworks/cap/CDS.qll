import javascript
import semmle.javascript.dataflow.DataFlow
import advanced_security.javascript.frameworks.cap.PackageJson
import advanced_security.javascript.frameworks.cap.CDL
import advanced_security.javascript.frameworks.cap.CQL
import TreeSitterXml

/**
 * ```js
 * const cds = require('@sap/cds')
 * ```
 */
class CdsFacade extends API::Node {
  CdsFacade() { this = API::moduleImport(["@sap/cds", "@sap/cds/lib"]) }

  Node getNode() { result = this.asSource() }
}

/**
 * A call to `serve` on a CDS facade.
 */
class CdsServeCall extends API::Node {
  CdsServeCall() { exists(CdsFacade cds | this = cds.getMember("serve")) }
}

/**
 * A `cds.connect.to(serveName)` call to connect to a local or remote service.
 */
class CdsConnectToCall extends API::Node {
  CdsConnectToCall() { exists(CdsFacade cds | this = cds.getMember("connect").getMember("to")) }

  /**
   * Gets a variable definition using either `cds.connect.to(...)` or awaiting that at its RHS.
   */
  VarDef getVarDefUsingCdsConnect() {
    result.getSource() = this.getACall().asExpr()
    or
    result.getSource().(AwaitExpr).getOperand() = this.getACall().asExpr()
  }

  /**
   * Gets the service name that this call connects to.
   */
  string getServiceName() {
    result = this.getACall().getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
  }
}

/**
 * A dataflow node that represents a service. Note that its definition is a `UserDefinedApplicationService`, not a `ServiceInstance`.
 */
abstract class ServiceInstance extends DataFlow::Node {
  abstract UserDefinedApplicationService getDefinition();

  abstract MethodCallNode getASrvMethodCall();
}

/**
 * A service instance obtained by the service's name, via serving
 * defined services via `cds.serve` and awaiting its promise. e.g.
 * ```javascript
 * // Obtained through `cds.serve`
 * const { Service1, Service2 } = await cds.serve("all");
 * const Service1 = await cds.serve("service-1");
 * ```
 */
class ServiceInstanceFromCdsServe extends ServiceInstance {
  ServiceInstanceFromCdsServe() { exists(CdsFacade cds | this = cds.getMember("serve").getACall()) }

  override UserDefinedApplicationService getDefinition() {
    none() // TODO: how should we deal with serve("all")?
  }

  override MethodCallNode getASrvMethodCall() {
    none() // TODO
  }
}

/* TODO: change `ServiceInstanceFromCdsConnectTo` to an VarAccess to the VarDef whose getSource() is CdsConnectToCall or an AwaitExpr wrapping it */
/**
 * A service instance obtained by the service's name, via connecting
 * to a service already being served and awaiting its promise. e.g.
 * ```javascript
 * // Obtained through `cds.connect.to`
 * const Service1 = await cds.connect.to("service-1");
 * const Service1 = cds.connect.to("service-2");
 * ```
 */
class ServiceInstanceFromCdsConnectTo extends ServiceInstance {
  string serviceName;

  ServiceInstanceFromCdsConnectTo() {
    exists(CdsConnectToCall cdsConnectTo |
      (
        this = cdsConnectTo.getACall() or
        this = cdsConnectTo.getVarDefUsingCdsConnect().getAVariable().getAnAccess().flow()
      ) and
      serviceName = cdsConnectTo.getServiceName()
    )
  }

  override UserDefinedApplicationService getDefinition() {
    exists(RequiredService serviceDecl, string abspath |
      serviceDecl.getName() = serviceName and
      abspath = serviceDecl.getImplementationFile().getAbsolutePath() and
      result.hasLocationInfo(abspath, _, _, _, _)
    )
  }

  string getServiceName() { result = serviceName }

  /**
   * Gets a method call on this service instance.
   */
  override MethodCallNode getASrvMethodCall() { result.getReceiver() = this }
}

/**
 * A service instance obtained by directly calling the constructor
 * of its class with a `new` keyword. e.g.
 * ```javascript
 * // A constructor call
 * const srv = new cds.ApplicationService(...);
 * const srv = new cds.Service(...);
 * ```
 */
class ServiceInstanceFromConstructor extends ServiceInstance {
  ServiceInstanceFromConstructor() {
    exists(CdsApplicationServiceClass cds | this = cds.getAnInstantiation())
  }

  override UserDefinedApplicationService getDefinition() { none() }

  /**
   * Gets a method call on this service instance.
   */
  override MethodCallNode getASrvMethodCall() {
    exists(VarDef definition |
      definition.getSource().flow() = this and
      definition.getAVariable().getAnAccess() = result.getReceiver().asExpr()
    )
  }
}

/**
 * A service instance that represents an w
 */
class ServiceInstanceFromThisNode extends ServiceInstance {
  ServiceInstanceFromThisNode() {
    exists(ThisNode thisNode | thisNode.flowsTo(this) and this != thisNode)
  }

  override UserDefinedApplicationService getDefinition() {
    result.getInitFunction().asExpr() = this.asExpr().getEnclosingFunction+()
  }

  /**
   * Gets a method call on this service instance.
   */
  override MethodCallNode getASrvMethodCall() { result.getReceiver() = this }
}

/**
 * The parameter node representing the service being served, given to a
 * callback argument to the `cds.serve(...).with` call. e.g.
 * ```js
 * cds.serve('./srv/some-service').with ((srv) => {
 *   srv.on ('READ','SomeEntity', (req) => req.reply([...]))
 * })
 * ```
 * This is used to extend the given service's functionality.
 */
class ServiceInstanceFromServeWithParameter extends ParameterNode, ServiceInstance {
  ServiceInstanceFromServeWithParameter() {
    exists(MethodCallNode withCall, CdsServeCall cdsServe |
      withCall.getMethodName() = "with" and
      withCall.getReceiver() = cdsServe.getACall() and
      this = withCall.getArgument(0).(FunctionNode).getParameter(0)
    )
  }

  override UserDefinedApplicationService getDefinition() {
    none() // TODO
  }

  override MethodCallNode getASrvMethodCall() {
    none() // TODO
  }
}

/**
 * A call to `before`, `on`, or `after` on an `cds.ApplicationService`.
 * It registers an handler to be executed when an event is fired,
 * to do something with the incoming request or event as its parameter.
 */
class HandlerRegistration extends MethodCallNode {
  HandlerRegistration() {
    exists(ServiceInstance srv |
      (
        srv.(SourceNode).flowsTo(this.getReceiver())
        or
        srv = this.getReceiver()
      ) and
      (
        this.getMethodName() = "before" or
        this.getMethodName() = "on" or
        this.getMethodName() = "after"
      )
    )
  }

  /**
   * Get the name of the event that the handler is registered for.
   */
  string getAnEventName() {
    exists(StringLiteral stringLiteral |
      stringLiteral = this.getArgument(0).asExpr() and
      result = stringLiteral.getValue()
    )
    or
    exists(ArrayLiteralNode arrayLiteral |
      arrayLiteral = this.getArgument(0) and
      result = arrayLiteral.getAnElement().asExpr().(StringLiteral).getValue()
    )
  }

  /**
   * Get the name of the entity that the handler is registered for, if any.
   */
  string getEntityName() { result = this.getArgument(1).asExpr().(StringLiteral).getValue() }

  /**
   * Gets the handler that is being registrated to an event by this registering function call.
   */
  Handler getHandler() { result = this.getAnArgument() }
}

/**
 * The handler that implements a service's logic to deal with the incoming request or message when a certain event is fired.
 * It is the last argument to the method calls that registers the handler: either `srv.before`, `srv.on`, or `srv.after`.
 * Its first parameter is of type `cds.Event` and handles the event in an asynchronous manner,
 * or is of type `cds.Request` and handles the event synchronously.
 */
class Handler extends FunctionNode {
  UserDefinedApplicationService srv;
  string eventName;

  Handler() {
    exists(HandlerRegistration handlerRegistration |
      this = handlerRegistration.getAnArgument() and
      eventName = handlerRegistration.getArgument(0).asExpr().(StringLiteral).getValue()
    )
  }

  /**
   * Gets the service registering this handler.
   */
  UserDefinedApplicationService getDefiningService() { result = srv }

  /**
   * Gets a name of one of the event this handler is registered for.
   */
  string getAnEventName() { result = eventName }
}

/**
 * Built-in event names to use to talk to a service.
 * - Event names for [REST-style API](https://cap.cloud.sap/docs/node.js/core-services#rest-style-api)
 *   - GET
 *   - PUT
 *   - POST
 *   - PATCH
 *   - DELETE
 * - Event names for [CRUD-style API](https://cap.cloud.sap/docs/node.js/core-services#crud-style-api)
 *   - READ
 *   - CREATE
 *   - INSERT
 *   - UPSERT
 *   - UPDATE
 *   - DELETE
 */
class BuiltInEventNames extends string {
  BuiltInEventNames() {
    /* 1. REST-style API names. */
    this = ["GET", "PUT", "POST", "PATCH", "DELETE"]
    or
    /* 2. CRUD-style API names. */
    this = ["READ", "CREATE", "INSERT", "UPSERT", "UPDATE", "DELETE"]
  }

  predicate isRestStyle() { this = ["GET", "PUT", "POST", "PATCH", "DELETE"] }

  predicate isCrudStyle() { this = ["READ", "CREATE", "INSERT", "UPSERT", "UPDATE", "DELETE"] }
}

/**
 * A handler that handles errors.
 */
class ErrorHandler extends Handler {
  ErrorHandler() { this.getAnEventName() = "error" }
}

private class CdsServiceClass extends API::Node {
  CdsServiceClass() { exists(CdsFacade c | this = c.getMember("Service")) }
}

private class CdsApplicationServiceClass extends API::Node {
  CdsApplicationServiceClass() { exists(CdsFacade c | this = c.getMember("ApplicationService")) }
}

abstract class UserDefinedService extends DataFlow::Node {
  abstract FunctionNode getInitFunction();
}

abstract class UserDefinedBaseService extends UserDefinedService { }

class ES6BaseServiceDefinition extends ClassNode, UserDefinedBaseService {
  ES6BaseServiceDefinition() {
    exists(CdsServiceClass cdsService | this.getASuperClassNode() = cdsService.asSource())
  }

  override FunctionNode getInitFunction() { result = this.getInstanceMethod("init") }
}

/**
 * A custom application service of type `cds.ApplicationService`, where parts of the business logic are implemented.
 */
abstract class UserDefinedApplicationService extends UserDefinedService {
  HandlerRegistration getHandlerRegistration(string eventName) {
    result.getEnclosingFunction() = this.getInitFunction().asExpr() and
    result.getAnEventName() = eventName
  }

  HandlerRegistration getAHandlerRegistration() { result = this.getHandlerRegistration(_) }

  /**
   * Gets the name of this service as declared in the `package.json`.
   */
  string getManifestName() {
    exists(RequiredService serviceManifest |
      this.hasLocationInfo(serviceManifest.getImplementationFile().getAbsolutePath(), _, _, _, _) and
      result = serviceManifest.getName()
    )
  }

  /**
   * Gets the CDS definition of this service.
   */
  CdlService getCdsDeclaration() {
    exists(CdsFile cdsFile |
      cdsFile.getStem() = this.getFile().getStem() + ".cds" and
      cdsFile.getParentContainer() = this.getFile().getParentContainer() and
      result.getFile() = cdsFile
    )
  }

  /**
   * Holds if this service supports access from the outside through any kind of protocol.
   */
  predicate isExposed() { not this.isInternal() }

  /**
   * Holds if this service does not support access from the outside through any kind of protocol, thus being internal only.
   */
  predicate isInternal() {
    exists(CdlService cdsDeclaration | cdsDeclaration = this.getCdsDeclaration() |
      cdsDeclaration.getAnnotation("protocol").(ProtocolAnnotation).getAnExposedProtocol() = "none" and
      not exists(CdlAnnotation annotation |
        annotation = cdsDeclaration.getAnnotation(["rest", "odata", "graphql"])
      )
    )
  }
}

/**
 * Subclassing `cds.ApplicationService` via a ES6 class definition.
 * ```js
 * class SomeService extends cds.ApplicationService { init() { ... } }
 * ```
 */
class ES6ApplicationServiceDefinition extends ClassNode, UserDefinedApplicationService {
  ES6ApplicationServiceDefinition() {
    exists(CdsApplicationServiceClass cdsApplicationService |
      this.getASuperClassNode() = cdsApplicationService.asSource()
    )
  }

  override FunctionNode getInitFunction() { result = this.getInstanceMethod("init") }
}

/**
 * Subclassing `cds.ApplicationService` via a call to `cds.service.impl`.
 * ```js
 * const cds = require('@sap/cds')
 * module.exports = cds.service.impl (function() { ... })
 * ```
 */
class ImplMethodCallApplicationServiceDefinition extends MethodCallNode,
  UserDefinedApplicationService
{
  ImplMethodCallApplicationServiceDefinition() {
    exists(CdsFacade cds |
      this.getReceiver() = cds.getMember("service").asSource() and
      this.getMethodName() = "impl"
    )
  }

  override FunctionNode getInitFunction() { result = this.getArgument(0) }
}

abstract class InterServiceCommunicationMethodCall extends MethodCallNode {
  InterServiceCommunicationMethodCall() {
    exists(ServiceInstance srv | this = srv.getASrvMethodCall())
  }
}

class SrvRun extends InterServiceCommunicationMethodCall {
  SrvRun() { this.getMethodName() = "run" }

  CqlClause getCql() {
    result.asMethodCall() = this.getArgument(0).asExpr() or
    result.asDotExpr() = this.getArgument(0).asExpr()
  }
}

class SrvEmit extends InterServiceCommunicationMethodCall {
  ServiceInstance emittingService;

  SrvEmit() {
    this.getMethodName() = "emit" and
    emittingService = this.getReceiver()
  }

  ServiceInstance getEmitter() { result = emittingService }

  string getEmittedEvent() {
    result = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
  }
}

class SrvSend extends InterServiceCommunicationMethodCall {
  SrvSend() { this.getMethodName() = "send" }
}
