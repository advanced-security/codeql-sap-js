import javascript
import semmle.javascript.dataflow.DataFlow
import advanced_security.javascript.frameworks.cap.TypeTrackers
import advanced_security.javascript.frameworks.cap.PackageJson
import advanced_security.javascript.frameworks.cap.CDL
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.RemoteFlowSources

/**
 * The CDS facade object that provides useful interfaces to the current CAP application.
 * It also acts as a shortcut to `cds.db`.
 *
 * ``` javascript
 * var cds = require("@sap/cds")
 * var cds = require("@sap/cds/lib")
 * ```
 *
 * Note that, despite not being recorded in the API documentation, this object can also
 * be obtained via a more specific import path `"@sap/cds/lib"`. The `cds_facade` object
 * defined this way is identical with the official `"@sap/cds"` down to the memory location
 * it is allocated in:
 *
 * ``` javascript
 * var cds = require("@sap/cds");
 * var cdslib = require("@sap/cds/lib");
 * assert(cds === cdslib)
 * ```
 */
class CdsFacade extends API::Node {
  string importPath;

  CdsFacade() {
    importPath = ["@sap/cds", "@sap/cds/lib"] and
    this = API::moduleImport(importPath)
  }
}

/**
 * A call to `entities` on a CDS facade.
 */
class CdsEntitiesCall extends DataFlow::CallNode {
  CdsEntitiesCall() { exists(CdsFacade cds | this = cds.getMember("entities").getACall()) }

  /**
   * Gets the namespace that this entity belongs to.
   */
  string getNamespace() { result = this.getArgument(0).getStringValue() }
}

/**
 * A call to `serve` on a CDS facade.
 */
class CdsServeCall extends DataFlow::CallNode {
  Expr serviceRepresentation;

  CdsServeCall() {
    exists(CdsFacade cds | this = cds.getMember("serve").getACall()) and
    serviceRepresentation = this.getArgument(0).asExpr()
  }

  Expr getServiceRepresentation() { result = serviceRepresentation }

  UserDefinedApplicationService getServiceDefinition() {
    /* 1. The argument to cds.serve is "all" */
    this.getServiceRepresentation().getStringValue() = "all" and
    result = any(UserDefinedApplicationService service)
    or
    /* 2. The argument to cds.serve is a name of the service */
    result.getUnqualifiedName() = this.getServiceRepresentation().getStringValue()
    or
    /* 3. The argument to cds.serve is a name by which the service is required */
    exists(RequiredService requiredService |
      requiredService.getName() = this.getServiceRepresentation().getStringValue() and
      result.getFile() = requiredService.getImplementationFile()
    )
    or
    /* 4. The argument to cds.serve is a service instance */
    exists(ServiceInstance serviceInstance |
      this.getServiceRepresentation() = serviceInstance.asExpr() and
      result = serviceInstance.getDefinition()
    )
  }

  CdsServeWithCall getWithCall() { result = this.getAMemberCall("with") }
}

/**
 * A `cds.connect.to(serveName)` call to connect to a local or remote service.
 */
class CdsConnectToCall extends DataFlow::CallNode {
  CdsConnectToCall() {
    exists(CdsFacade cds | this = cds.getMember("connect").getMember("to").getACall())
  }

  /**
   * Gets the service name that this call connects to.
   */
  string getServiceName() { result = this.getArgument(0).getALocalSource().getStringValue() }
}

/**
 * A data flow node that represents a service.
 * Note that its definition is a `UserDefinedApplicationService`, not a `ServiceInstance`.
 */
abstract class ServiceInstance extends SourceNode {
  abstract UserDefinedApplicationService getDefinition();

  /**
   * Gets a method call on this service instance.
   */
  MethodCallNode getASrvMethodCall() { result = this.getAMemberCall(_) }

  /**
   * Gets a method call on this service instance that has the given name.
   */
  MethodCallNode getASrvMethodCall(string methodName) { result = this.getAMemberCall(methodName) }
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
  string serviceName;

  ServiceInstanceFromCdsServe() { this = cdsServeCall().getAPropertyRead(serviceName) }

  override UserDefinedApplicationService getDefinition() {
    none() // TODO: how should we deal with serve("all")?
  }
}

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
  string serviceDesignator;

  ServiceInstanceFromCdsConnectTo() { this = serviceInstanceFromCdsConnectTo(serviceDesignator) }

  override UserDefinedApplicationService getDefinition() {
    exists(RequiredService serviceDecl |
      serviceDecl.getName() = serviceDesignator and
      // Normalize path separators for cross-platform compatibility
      result
          .hasLocationInfo(serviceDecl
                .getImplementationFile()
                .getAbsolutePath()
                .regexpReplaceAll("\\\\", "/"), _, _, _, _)
    )
    or
    result.getUnqualifiedName() = serviceDesignator
  }

  string getServiceDesignator() { result = serviceDesignator }
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
  ServiceInstanceFromConstructor() { this = cdsApplicationServiceInstantiation() }

  override UserDefinedApplicationService getDefinition() { none() }
}

/**
 * A read to `this` variable which represents the service whose definition encloses
 * this variable access.
 * e.g.1. Given this code:
 * ``` javascript
 * const cds = require("@sap/cds");
 * module.exports = class SomeService extends cds.ApplicationService {
 *   init() {
 *     this.on("SomeEvent", (req) => { ... } )
 *   }
 * }
 * ```
 * This class captures the access to the `this` variable as in `this.on(...)`.
 *
 * e.g.2. Given this code:
 * ``` javascript
 * const cds = require('@sap/cds');
 * module.exports = cds.service.impl (function() {
 *   this.on("SomeEvent", (req) => { ... })
 * })
 * ```
 * This class captures the access to the `this` variable as in `this.on(...)`.
 */
class ServiceInstanceFromThisNode extends ServiceInstance, ThisNode {
  UserDefinedApplicationService userDefinedApplicationService;

  ServiceInstanceFromThisNode() {
    this.getBinder() = userDefinedApplicationService.getInitFunction()
  }

  override UserDefinedApplicationService getDefinition() { result = userDefinedApplicationService }
}

class CdsServeWithCall extends MethodCallNode {
  CdsServeCall cdsServe;

  CdsServeWithCall() { this = cdsServe.getAMemberCall("with") }

  Function getDecorator() { result = this.getArgument(0).(FunctionNode).getFunction() }

  HandlerRegistration getAHandlerRegistration() {
    result.getEnclosingFunction() = this.getDecorator()
  }
}

/**
 * The parameter node representing the service being served, given to a
 * callback argument to the `cds.serve(...).with` call. e.g.
 * ```js
 * cds.serve('./srv/some-service1').with ((srv) => {  // Parameter `srv` is captured.
 *   srv.on ('READ','SomeEntity1', (req) => req.reply([...]))
 * })
 *
 * cds.serve('./srv/some-service2').with (function() {  // Parameter `this` is captured.
 *   this.on ('READ','SomeEntity2', (req) => req.reply([...]))
 * })
 * ```
 * This is used to extend the given service's functionality.
 */
class ServiceInstanceFromServeWithParameter extends ServiceInstance {
  CdsServeCall cdsServe;
  CdsServeWithCall cdsServeWith;

  ServiceInstanceFromServeWithParameter() {
    /*
     * cds.serve('./srv/some-service1').with ((srv) => {  // Parameter `srv` is captured.
     *   srv.on ('READ','SomeEntity1', (req) => req.reply([...]))
     * })
     */

    this.(ThisNode).getBinder().asExpr() = cdsServeWith.getDecorator().(FunctionExpr)
    or
    /*
     * cds.serve('./srv/some-service2').with (function() {  // Parameter `this` is captured.
     *   this.on ('READ','SomeEntity2', (req) => req.reply([...]))
     * })
     */

    this = cdsServeWith.getDecorator().(ArrowFunctionExpr).getParameter(0).flow()
  }

  HandlerRegistration getAHandlerRegistration() { result = cdsServeWith.getAHandlerRegistration() }

  override UserDefinedApplicationService getDefinition() {
    /* 1. The argument to cds.serve is "all" */
    cdsServe.getServiceRepresentation().getStringValue() = "all" and
    result = any(UserDefinedApplicationService service)
    or
    /* 2. The argument to cds.serve is a name by which the service is required */
    exists(RequiredService requiredService |
      requiredService.getName() = cdsServe.getServiceRepresentation().getStringValue() and
      result.getFile() = requiredService.getImplementationFile()
    )
    or
    result.getUnqualifiedName() = cdsServe.getServiceRepresentation().getStringValue()
    or
    /* 3. The argument to cds.serve is a service instance */
    exists(ServiceInstance serviceInstance |
      cdsServe.getServiceRepresentation() = serviceInstance.asExpr() and
      result = serviceInstance.getDefinition()
    )
  }
}

abstract class CdsDbService extends ServiceInstance {
  /* A DB service is implicitly defined. */
  override UserDefinedApplicationService getDefinition() { none() }
}

/**
 * The property `db` of a CDS facade, often accessed as `cds.db`.
 */
class CdsDb extends SourceNode, CdsDbService {
  CdsDb() {
    exists(CdsFacade cds |
      this = cds.getMember("db").asSource() or
      this = cds.asSource()
    )
  }

  MethodCallNode getRunCall() { result = this.getAMemberCall("run") }

  MethodCallNode getCreateCall() { result = this.getAMemberCall("create") }

  MethodCallNode getUpdateCall() { result = this.getAMemberCall("update") }

  MethodCallNode getDeleteCall() { result = this.getAMemberCall("delete") }

  MethodCallNode getInsertCall() { result = this.getAMemberCall("insert") }
}

class DbServiceInstanceFromCdsConnectTo extends ServiceInstanceFromCdsConnectTo, CdsDbService {
  DbServiceInstanceFromCdsConnectTo() { this = serviceInstanceFromCdsConnectTo("db") }

  /* A DB service is implicitly defined. */
  override UserDefinedApplicationService getDefinition() { none() }
}

/**
 * The 0-th parameter of an exported closure that represents the service being implemented. e.g.
 * ``` javascript
 * const cds = require('@sap/cds')
 * module.exports = (srv) => {
 *   srv.on("SomeEvent1", (req) => { ... })
 * }
 * ```
 * This class captures the `srv` parameter of the exported arrow function. Also see
 * `ServiceInstanceFromImplMethodCallClosureParameter` which is similar to this.
 */
class ServiceInstanceFromExportedClosureParameter extends ServiceInstance, ParameterNode {
  ExportedClosureApplicationServiceDefinition exportedClosure;

  ServiceInstanceFromExportedClosureParameter() { this = exportedClosure.getParameter(0) }

  override UserDefinedApplicationService getDefinition() { result = exportedClosure }
}

/**
 * The 0-th parameter of a callback (usually an arrow function) passed to `cds.service.impl` that
 * represents the service being implemented. e.g.
 * ``` javascript
 * const cds = require('@sap/cds')
 * module.exports = cds.service.impl((srv) => {
 *   srv.on("SomeEvent1", (req) => { ... })
 * })
 * ```
 * This class captures the `srv` parameter of the exported arrow function. Also see
 * `ServiceInstanceFromExportedClosureParameter` which is similar to this.
 */
class ServiceInstanceFromImplMethodCallClosureParameter extends ServiceInstance, ParameterNode {
  ImplMethodCallApplicationServiceDefinition implMethodCallApplicationServiceDefinition;

  ServiceInstanceFromImplMethodCallClosureParameter() {
    this = implMethodCallApplicationServiceDefinition.getInitFunction().getParameter(0)
  }

  override UserDefinedApplicationService getDefinition() {
    result = implMethodCallApplicationServiceDefinition
  }
}

/**
 * A call to `before`, `on`, or `after` on an `cds.ApplicationService`.
 * It registers an handler to be executed when an event is fired,
 * to do something with the incoming request or event as its parameter.
 */
class HandlerRegistration extends MethodCallNode {
  /** The instance of the service a handler is registered on. */
  ServiceInstance srv;
  string methodName;

  HandlerRegistration() {
    this = srv.getASrvMethodCall(methodName) and
    methodName = ["before", "on", "after"]
  }

  /**
   * Gets the instance of the service a handler is registered on.
   */
  ServiceInstance getService() { result = srv }

  /**
   * Get the name of the event that the handler is registered for.
   */
  string getAnEventName() {
    result = this.getArgument(0).getStringValue()
    or
    result = this.getArgument(0).(ArrayLiteralNode).getAnElement().getStringValue()
  }

  /**
   * Get the name of the entity that the handler is registered for, if any.
   */
  string getEntityName() { result = this.getArgument(1).getStringValue() }

  /**
   * Gets the handler that is being registrated to an event by this registering function call.
   */
  Handler getHandler() { result = this.getAnArgument() }

  /**
   * Holds if this is registering a handler to be run before some event.
   */
  predicate isBefore() { methodName = "before" }

  /**
   * Holds if this is registering a handler to be run on some event.
   */
  predicate isOn() { methodName = "on" }

  /**
   * Holds if this is registering a handler to be run after some event.
   */
  predicate isAfter() { methodName = "after" }
}

/**
 * The first parameter of a handler, representing the request object received either directly
 * from a user, or from another service that may be internal (defined in the same application)
 * or external (defined in another application, or even served from a different server).
 * e.g.
 * ``` javascript
 * module.exports = class Service1 extends cds.ApplicationService {
 *   this.on("SomeEvent", "SomeEntity", (req) => { ... });
 *   this.before("SomeEvent", "SomeEntity", (req, next) => { ... });
 *   this.after("SomeEvent", "SomeEntity", (req, next) => { ... });
 * }
 * ```
 * All parameters named `req` above are captured. Also see
 * `RemoteflowSources::HandlerParameterOfExposedService`
 * for a subset of this class that is only about handlers exposed to some protocol.
 */
class HandlerParameter extends ParameterNode {
  Handler handler;

  HandlerParameter() { this = isHandlerParameter(handler) }

  Handler getHandler() { result = handler }
}

/**
 * The handler that implements a service's logic to deal with the incoming request or message when a certain event is fired.
 * It is the last argument to the method calls that registers the handler: either `srv.before`, `srv.on`, or `srv.after`.
 * Its first parameter is of type `cds.Event` and handles the event in an asynchronous manner,
 * or is of type `cds.Request` and handles the event synchronously.
 */
class Handler extends FunctionNode {
  HandlerRegistration handlerRegistration;

  Handler() { this = handlerRegistration.getAnArgument() }

  /**
   * Gets a name of one of the event this handler is registered for.
   */
  string getAnEventName() { result = handlerRegistration.getAnEventName() }

  /**
   * Gets a name of the entity this handler is registered for.
   */
  string getEntityName() { result = handlerRegistration.getEntityName() }

  /**
   * Gets the request that this handler is registered for, as represented as its first parameter.
   */
  CdsRequest getRequest() { result = this.getParameter(0) }

  HandlerRegistration getHandlerRegistration() { result = handlerRegistration }
}

class CdsRequest extends ParameterNode {
  CdsRequest() { exists(Handler handler | this = handler.getParameter(0)) }

  MethodCallNode getARejectCall() { result = this.getAMemberCall("reject") }
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

class CdsApplicationServiceClass extends API::Node {
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
      // Normalize path separators for cross-platform compatibility
      this.hasLocationInfo(serviceManifest
            .getImplementationFile()
            .getAbsolutePath()
            .regexpReplaceAll("\\\\", "/"), _, _, _, _) and
      result = serviceManifest.getName()
    )
  }

  /**
   * Gets the name of this service as declared in the `package.json`.
   */
  string getUnqualifiedName() {
    exists(CdlService cdlService |
      this = cdlService.getImplementation() and
      result = cdlService.getUnqualifiedName()
    )
  }

  /**
   * Gets the CDS definition of this service.
   */
  CdlService getCdsDeclaration() { result.getImplementation() = this }

  /**
   * Gets the name of this service.
   */
  string getServiceName() { result = this.getCdsDeclaration().getName() }

  /**
   * Holds if this service supports access from the outside through any kind of protocol.
   */
  predicate isExposed() { exists(this.getCdsDeclaration()) and not this.isInternal() }

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
 * e.g.1. Given this code:
 * ``` javascript
 * const cds = require('@sap/cds')
 * module.exports = cds.service.impl (function() {
 *   this.on("SomeEvent1", (req) => { ... })
 * })
 * ```
 * This class captures the call `cds.service.impl (function() { ... })`.
 *
 * e.g.2. Given this code:
 * ``` javascript
 * const cds = require('@sap/cds')
 * module.exports = cds.service.impl ((srv) => {
 *   srv.on("SomeEvent1", (req) => { ... })
 * })
 * ```
 */
class ImplMethodCallApplicationServiceDefinition extends MethodCallNode,
  UserDefinedApplicationService
{
  ImplMethodCallApplicationServiceDefinition() {
    exists(CdsFacade cds | this = cds.getMember("service").getMember("impl").getACall())
  }

  override FunctionNode getInitFunction() { result = this.getArgument(0) }
}

/**
 * A user-defined application service that comes in a form of an exported
 * closure. e.g. Given the below code,
 * ``` javascript
 * const cds = require("@sap/cds");
 *
 * module.exports = (srv) => {
 *   srv.before("SomeEvent1", "SomeEntity", (req, res) => { ... })
 *   srv.on("SomeEvent2", (req) => { ... } )
 *   srv.after("SomeEvent3", (req) => { ... } )
 * }
 * ```
 * This class captures the entire `(srv) => { ... }` function that is
 * exported.
 */
class ExportedClosureApplicationServiceDefinition extends FunctionNode,
  UserDefinedApplicationService
{
  ExportedClosureApplicationServiceDefinition() {
    /*
     * ==================== HACK ====================
     * See issue #221.
     */

    exists(PropWrite moduleExports |
      moduleExports.getBase().asExpr().(VarAccess).getName() = "module" and
      moduleExports.getPropertyName() = "exports" and
      this = moduleExports.getRhs()
    )
  }

  override FunctionNode getInitFunction() { result = this }
}

abstract class InterServiceCommunicationMethodCall extends MethodCallNode {
  string name;
  ServiceInstance recipient;

  InterServiceCommunicationMethodCall() { this = recipient.getASrvMethodCall(name) }

  ServiceInstance getRecipient() { result = recipient }
}

class SrvRun extends InterServiceCommunicationMethodCall {
  SrvRun() { name = "run" }

  CqlClause getCql() {
    result.asMethodCall() = this.getArgument(0).asExpr() or
    result.asDotExpr() = this.getArgument(0).asExpr()
  }
}

class SrvEmit extends InterServiceCommunicationMethodCall {
  ServiceInstance emittingService;

  SrvEmit() { name = "emit" }

  ServiceInstance getEmitter() { result = emittingService }

  string getEmittedEvent() { result = this.getArgument(0).getALocalSource().getStringValue() }
}

class SrvSend extends InterServiceCommunicationMethodCall {
  SrvSend() { name = "send" }
}

class CdsUser extends API::Node {
  CdsUser() { exists(CdsFacade c | this = c.getMember("User")) }

  PropRef getDefaultUser() {
    exists(PropRead cdsUser |
      cdsUser = this.getInducingNode() and
      cdsUser.flowsTo(result.getBase()) and
      result.getPropertyName() = "default"
    )
  }

  PropRef getPrivilegedUser() {
    exists(PropRead cdsUser |
      cdsUser = this.getInducingNode() and
      cdsUser.flowsTo(result.getBase()) and
      result.getPropertyName() = "Privileged"
    )
  }
}

/**
 * A transaction object to be carried out by a service that it is initialized
 * with through a call to `tx`. Note that there are two types of styles when
 * it comes to using the transaction object, that is, within a callback or in a
 * `try`-`catch` block:
 *
 * ``` javascript
 * // 1. The transaction object is bound to a callback and is used in its body.
 * await srv.tx({ user: someUser }, async (tx) => {
 *  tx.run(SELECT.from`Entity`.where`attr=${attr}`);
 * });
 *
 * // 2. The transaction object is used in a try-catch block, in a manual manner.
 * let tx = this.tx();
 * try {
 *   tx.run(SELECT.from`Entity`.where`attr=${attr}`);
 *   await tx.commit();
 * } catch (e) {
 *   await tx.rollback(e);
 * }
 * ```
 *
 * The former style allows for automatic transaction management by the framework
 * (notice there are no `commit` and `rollback` calls), while the latter style
 * makes the low-level transaction operations explicit.
 *
 * To accommodate for both styles, this class captures both the transaction call
 * itself, and the parameter of the callback.
 *
 * Note that the call to `tx` can optionally take a context object as its first
 * parameter that lets overriding of certain options such as `user`.
 */
class CdsTransaction extends SourceNode {
  ServiceInstance srv;
  CallNode txCall;

  CdsTransaction() {
    txCall = srv.getAMemberCall("tx") and
    (
      this = txCall or
      this =
        txCall
            .getABoundCallbackParameter([
                0, // When the context object is absent
                1 // When the context object is present
              ], 0)
    )
  }

  ServiceInstance getRunner() { result = srv }

  SourceNode getContextObject() {
    /* 1. An object node passed as the first argument to a call to `srv.tx`. */
    result = txCall.getArgument(0).getALocalSource() and not result instanceof FunctionNode
    or
    /* 2. A manually overriden `cds.context`. */
    exists(Stmt stmt, CdsFacade cds |
      stmt = this.asExpr().getFirstControlFlowNode().getAPredecessor+() and
      result = cds.getMember("context").asSink() and
      stmt.getAChildExpr().(Assignment).getRhs().flow() = result
    )
  }

  DataFlow::Node getUser() { result = this.getContextObject().getAPropertyWrite("user").getRhs() }

  /**
   * Gets a method call on this transaction object.
   */
  MethodCallNode getATransactionCall() { result = this.getAMemberCall(_) }

  CqlClause getAnExecutedCqlClause() {
    result.asExpr() = this.getATransactionCall().getAnArgument().asExpr()
  }
}

abstract class CdsReference extends DataFlow::Node { }

/**
 * A reference object to an entity that belongs to a service. e.g.
 *
 * ```javascript
 * // 1. Obtained through `cds.entities`
 * const { Entity1 } = cds.entities("sample.application.namespace");
 * // 2. Obtained through `Service.entities`, in this case the `Service`
 * // being a `this` variable of the service.
 * const { Entity2 } = this.entities;
 * // 3. A direct mention of a name in a literal pass to the fluent API builder.
 * SELECT.from`Books`.where(`ID=${id}`)
 * ```
 */
abstract class EntityReference extends CdsReference {
  abstract CdlEntity getCqlDefinition();
}

/**
 * A reference object to an entity that belongs to a service, either
 * obtained through a method call to `entities`, or a read from property
 * `entities`. e.g.
 *
 * ```javascript
 * // 1. Obtained through `cds.entities`
 * const { Entity1 } = cds.entities("sample.application.namespace");
 * // 2. Obtained through `Service.entities`, in this case the `Service`
 * // being a `this` variable of the service.
 * const { Entity2 } = this.entities;
 * // 3. A direct mention of a name in a literal pass to the fluent API builder.
 * SELECT.from`Books`.where(`ID=${id}`)
 * ```
 */
class EntityReferenceFromEntities extends EntityReference, SourceNode instanceof PropRead {
  /**
   * A read from property `entities` or a method call to `entities`.
   */
  DataFlow::SourceNode entitiesAccess;
  /**
   * The receiver of the call to `entities` or the base of the read from `entities`.
   */
  DataFlow::Node receiver;
  /**
   * The unqualified name of the entity being accessed.
   */
  string entityName;

  EntityReferenceFromEntities() {
    /*
     * 1. Reference obtained through a call to `entities` on the
     * service instance.
     */

    exists(MethodCallNode entitiesCall |
      entitiesAccess = entitiesCall and
      receiver = entitiesCall.getReceiver() and
      entitiesCall.getMethodName() = "entities" and
      this = entitiesCall.getAPropertyRead(entityName)
    )
    or
    /*
     * 2. Reference obtained through a read from property `entities` of the
     * service instance.
     */

    exists(PropRead entitiesRead |
      entitiesAccess = entitiesRead and
      receiver = entitiesRead.getBase() and
      entitiesRead.getPropertyName() = "entities" and
      this = entitiesRead.getAPropertyRead(entityName)
    )
  }

  DataFlow::SourceNode getEntities() { result = entitiesAccess }

  DataFlow::Node getReceiver() { result = receiver }

  string getEntityName() { result = entityName }

  predicate isFromEntitiesCall() { entitiesAccess instanceof MethodCallNode }

  string getEntitiesCallNamespace() {
    result = entitiesAccess.(MethodCallNode).getArgument(0).getStringValue()
  }

  abstract override CdlEntity getCqlDefinition();

  abstract UserDefinedApplicationService getServiceDefinition();
}

/**
 * srv.entities or srv.entities(...) where the receiver is a ServiceInstance
 */
class EntityReferenceFromUserDefinedServiceEntities extends EntityReferenceFromEntities instanceof PropRead
{
  ServiceInstance service;

  EntityReferenceFromUserDefinedServiceEntities() { this.getReceiver().getALocalSource() = service }

  override CdlEntity getCqlDefinition() {
    this.getEntities() instanceof PropRead and
    result =
      service
          .getDefinition()
          .getCdsDeclaration()
          .getEntity(service.getDefinition().getServiceName() + "." + entityName)
    or
    result =
      service
          .getDefinition()
          .getCdsDeclaration()
          .getEntity(this.getEntities().(MethodCallNode).getArgument(0).getStringValue() + "." +
              entityName)
  }

  override UserDefinedApplicationService getServiceDefinition() { result = service.getDefinition() }
}

/**
 * cds.entities, cds.entities(...), cds.db.entities, cds.db.entities(...)
 */
class EntityReferenceFromDbOrCdsEntities extends EntityReferenceFromEntities {
  EntityReferenceFromDbOrCdsEntities() {
    this.getReceiver().getALocalSource() instanceof CdsDbService
  }

  override CdlEntity getCqlDefinition() {
    /* NOTE: the result may be multiple; but they are all identical so we don't really care. */
    result.getName() =
      this.getEntities().(MethodCallNode).getArgument(0).getStringValue() + "." + entityName
  }

  override UserDefinedApplicationService getServiceDefinition() { none() }
}

class EntityReferenceFromCqlClause extends EntityReference, ExprNode {
  CqlClause cql;

  EntityReferenceFromCqlClause() { this = cql.getAccessingEntityReference() }

  override CdlEntity getCqlDefinition() { result = cql.getAccessingEntityDefinition() }
}

/**
 * The `"data"` property of the handler's parameter that represents the request or message
 * passed to this handler. This property carries the user-provided payload provided to the
 * CAP application. e.g.
 * ``` javascript
 * srv.on("send", async (msg) => {
 *   const { payload } = msg.data;
 * })
 * ```
 * The `payload` carries the data that is sent to this application on the action or event
 * named `send`.
 */
class HandlerParameterData instanceof PropRead {
  HandlerParameter handlerParameter;
  string dataName;

  HandlerParameterData() {
    this = handlerParameter.getAPropertyRead("data").getAPropertyRead(dataName)
  }

  /**
   * Gets the type of this handler parameter data.
   */
  string getType() {
    /*
     * The result string is the type of this parameter if:
     * - There is an actionName which is this HandlerRegistration's action/function name, and
     * - The actionName in the CDS declaration has params with the same name of this parameter, and
     * - The result is the name of the type of the parameter.
     */

    exists(
      UserDefinedApplicationService userDefinedApplicationService,
      CdlActionOrFunction cdlActionOrFunction, HandlerRegistration handlerRegistration
    |
      handlerRegistration = userDefinedApplicationService.getAHandlerRegistration() and
      handlerRegistration = handlerParameter.getHandler().getHandlerRegistration() and
      handlerRegistration.getAnEventName() = cdlActionOrFunction.getUnqualifiedName() and
      cdlActionOrFunction =
        userDefinedApplicationService.getCdsDeclaration().getAnActionOrFunction() and
      result = cdlActionOrFunction.getParameter(dataName).getType()
    )
  }

  string toString() { result = super.toString() }
}

/**
 * A call to a method capable of running a CQL query. This includes the following:
 * - Generic query runners: `cds.run`, `cds.db.run`, `srv.run`
 * - Shortcut to CQL's `READ`: `cds.read`, `cds.db.read`, `srv.read`
 * - Shortcut to CQL's `CREATE`: `cds.create`, `cds.db.create`, `srv.create`
 * - Shortcut to CQL's `INSERT`: `cds.insert`, `cds.db.insert`, `srv.insert`
 * - Shortcut to CQL's `UPSERT`: `cds.upsert`, `cds.db.upsert`, `srv.upsert`
 * - Shortcut to CQL's `UPDATE`: `cds.update`, `cds.db.update`, `srv.update`
 * - Shortcut to CQL's `DELETE`: `cds.delete`, `cds.db.delete`, `srv.delete`
 */
abstract class CqlQueryRunnerCall extends MethodCallNode {
  SourceNode base;
  string methodName;

  CqlQueryRunnerCall() {
    this = base.getAMemberInvocation(methodName) and
    (
      /*
       * 1. Method call on the CDS facade or the base database service,
       * accessed as `cds.db`.
       */

      exists(CdsFacade cds | base = cds.asSource()) or
      exists(CdsDb cdsDb | base = cdsDb) or
      /*
       * 2. Method call on a service instance object.
       */

      exists(ServiceInstance srv | base.getALocalSource() = srv) or
      /*
       * 3. Method call on a transaction object.
       */

      exists(CdsTransaction tx | base = tx)
    )
  }

  /**
   * Gets an argument to this runner call, including the subsequent builder functions
   * called in a chained manner on this one.
   */
  abstract DataFlow::Node getAQueryParameter();
}

class CqlRunMethodCall extends CqlQueryRunnerCall {
  CqlRunMethodCall() { this.getMethodName() = "run" }

  override DataFlow::Node getAQueryParameter() { result = this.getArgument(0) }
}

/**
 * A [CRUD-style call](https://cap.cloud.sap/docs/node.js/core-services#crud-style-api)
 * that translates to running a CQL query internally.
 */
class CqlShortcutMethodCall extends CqlQueryRunnerCall {
  CqlShortcutMethodCall() {
    this.getMethodName() = ["read", "create", "update", "delete", "insert", "upsert"]
  }

  abstract override DataFlow::Node getAQueryParameter();

  /**
   * Gets the final method call that is transitively chained on this method call. e.g.
   * given these fluent API calls on `srv.update`:
   * ``` javascript
   * srv.update(Entity1).set("col=col+1").where("col=" + id)
   * srv.update(Entity1).set("col=col+1").where`col=${id}`
   * srv.update(Entity1).set`col=col+1`.where("col=${id}")
   * srv.update(Entity1).set`col=col+1`.where`col=${id}`
   * ```
   * This predicate gets the entire `srv.update(Entity1).set....where...` call.
   */
  DataFlow::CallNode getFinalChainedMethodCall() {
    result = this.getAChainedMethodCall(_) and
    not exists(result.asExpr().getParentExpr())
  }
}

class CqlReadMethodCall extends CqlShortcutMethodCall {
  CqlReadMethodCall() { this.getMethodName() = "read" }

  override DataFlow::Node getAQueryParameter() {
    result = this.getAChainedMethodCall(_).getAnArgument()
  }
}

class CqlCreateMethodCall extends CqlShortcutMethodCall {
  CqlCreateMethodCall() { this.getMethodName() = "create" }

  override DataFlow::Node getAQueryParameter() {
    exists(DataFlow::CallNode chainedMethodCall |
      chainedMethodCall = this.getAChainedMethodCall(_)
    |
      result = chainedMethodCall.getAnArgument()
    )
  }
}

class CqlUpdateMethodCall extends CqlShortcutMethodCall {
  CqlUpdateMethodCall() { this.getMethodName() = "update" }

  override DataFlow::Node getAQueryParameter() {
    result = this.getAChainedMethodCall(_).getAnArgument()
  }
}

class CqlDeleteMethodCall extends CqlShortcutMethodCall {
  CqlDeleteMethodCall() { this.getMethodName() = "delete" }

  override DataFlow::Node getAQueryParameter() {
    result = this.getAChainedMethodCall(_).getAnArgument()
  }
}

class CqlInsertMethodCall extends CqlShortcutMethodCall {
  CqlInsertMethodCall() { this.getMethodName() = "insert" }

  override DataFlow::Node getAQueryParameter() {
    exists(DataFlow::CallNode chainedMethodCall |
      chainedMethodCall = this.getAChainedMethodCall(_)
    |
      result = chainedMethodCall.getAnArgument()
    )
  }
}

class CqlUpsertMethodCall extends CqlShortcutMethodCall {
  CqlUpsertMethodCall() { this.getMethodName() = "upsert" }

  override DataFlow::Node getAQueryParameter() {
    exists(DataFlow::CallNode chainedMethodCall |
      chainedMethodCall = this.getAChainedMethodCall(_)
    |
      result = chainedMethodCall.getAnArgument()
    )
  }
}

/**
 * A call to APIs that takes the given input string written in CDL and parses it according to
 * the CQN specification.
 *
 * Note that the outcome of calling the fluent APIs is also a CQN, which means both can be run
 * against a service with `srv.run`.
 */
abstract class CqlClauseParserCall extends DataFlow::CallNode {
  DataFlow::ExprNode cdlString;

  /**
   * Gets the data flow node that represents the CDL string to be parsed.
   */
  DataFlow::ExprNode getCdlString() { result = cdlString }
}

class GlobalCQLFunction extends CqlClauseParserCall {
  GlobalCQLFunction() {
    this = DataFlow::globalVarRef("CQL").getACall() and
    cdlString = this.getArgument(0)
  }
}

class CdsParseCqlCall extends CqlClauseParserCall {
  CdsParseCqlCall() {
    exists(CdsFacade cds |
      this = cds.getMember("parse").getMember("cql").getACall() and
      cdlString = this.getArgument(0)
    )
  }
}

class CdsQlCall extends CqlClauseParserCall {
  CdsQlCall() {
    exists(CdsFacade cds |
      this = cds.getMember("ql").getACall() and
      cdlString = this.getArgument(0)
    )
  }
}
