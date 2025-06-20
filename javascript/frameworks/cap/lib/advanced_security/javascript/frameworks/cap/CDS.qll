import javascript
import semmle.javascript.dataflow.DataFlow
import advanced_security.javascript.frameworks.cap.TypeTrackers
import advanced_security.javascript.frameworks.cap.PackageJson
import advanced_security.javascript.frameworks.cap.CDL
import advanced_security.javascript.frameworks.cap.CQL
import advanced_security.javascript.frameworks.cap.RemoteFlowSources

/**
 * The CDS facade that provides useful interfaces to the current CAP application.
 * ```js
 * const cds = require('@sap/cds')
 * ```
 */
class CdsFacade extends API::Node {
  CdsFacade() { this = API::moduleImport(["@sap/cds", "@sap/cds/lib"]) }

  Node getNode() { result = this.asSource() }
}

/**
 * A call to `entities` on a CDS facade.
 */
class CdsEntitiesCall extends DataFlow::CallNode {
  CdsEntitiesCall() { exists(CdsFacade cds | this = cds.getMember("entities").getACall()) }

  /**
   * Gets the namespace that this entity belongs to.
   */
  string getNamespace() {
    result = this.getArgument(0).getALocalSource().asExpr().(StringLiteral).getValue()
  }
}

/**
 * The property `db` of on a CDS facade, often accessed as `cds.db`.
 */
class CdsDb extends SourceNode {
  CdsDb() { exists(CdsFacade cds | this = cds.getMember("db").asSource()) }

  MethodCallNode getRunCall() { result = this.getAMemberCall("run") }

  MethodCallNode getCreateCall() { result = this.getAMemberCall("create") }

  MethodCallNode getUpdateCall() { result = this.getAMemberCall("update") }

  MethodCallNode getDeleteCall() { result = this.getAMemberCall("delete") }

  MethodCallNode getInsertCall() { result = this.getAMemberCall("insert") }
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
 * A dataflow node that represents a service.
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
class ServiceInstanceFromCdsConnectTo extends ServiceInstance, SourceNode {
  string serviceName;

  ServiceInstanceFromCdsConnectTo() { this = serviceInstanceFromCdsConnectTo(serviceName) }

  override UserDefinedApplicationService getDefinition() {
    /* 1. The service  */
    exists(RequiredService serviceDecl |
      serviceDecl.getName() = serviceName and
      result.hasLocationInfo(serviceDecl.getImplementationFile().getAbsolutePath(), _, _, _, _)
    )
    or
    result.getUnqualifiedName() = serviceName
  }

  string getServiceName() { result = serviceName }
}

class DBServiceInstanceFromCdsConnectTo extends ServiceInstanceFromCdsConnectTo {
  DBServiceInstanceFromCdsConnectTo() { serviceName = "db" }
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
 * A read to `this` variable which represents the service whose definition encloses this variable access.
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

  ServiceInstanceFromServeWithParameter() {
    exists(CdsServeWithCall cdsServeWith |
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
    )
  }

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

/**
 * A call to `before`, `on`, or `after` on an `cds.ApplicationService`.
 * It registers an handler to be executed when an event is fired,
 * to do something with the incoming request or event as its parameter.
 */
class HandlerRegistration extends MethodCallNode {
  ServiceInstance srv;
  string methodName;

  HandlerRegistration() {
    this = srv.getASrvMethodCall(methodName) and
    methodName = ["before", "on", "after"]
  }

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
 * The handler that implements a service's logic to deal with the incoming request or message when a certain event is fired.
 * It is the last argument to the method calls that registers the handler: either `srv.before`, `srv.on`, or `srv.after`.
 * Its first parameter is of type `cds.Event` and handles the event in an asynchronous manner,
 * or is of type `cds.Request` and handles the event synchronously.
 */
class Handler extends FunctionNode {
  UserDefinedApplicationService srv;
  HandlerRegistration handlerRegistration;

  Handler() { this = handlerRegistration.getAnArgument() }

  /**
   * Gets the service registering this handler.
   */
  UserDefinedApplicationService getDefiningService() { result = srv }

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
      this.hasLocationInfo(serviceManifest.getImplementationFile().getAbsolutePath(), _, _, _, _) and
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
    exists(CdsFacade cds | this = cds.getMember("service").getMember("impl").getACall())
  }

  override FunctionNode getInitFunction() { result = this.getArgument(0) }
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

class CdsTransaction extends MethodCallNode {
  ServiceInstance srv;

  CdsTransaction() { this = srv.getAMemberCall("tx") }

  ServiceInstance getRunner() { result = srv }

  SourceNode getContextObject() {
    result = this.getAnArgument().getALocalSource() and not result instanceof FunctionNode
    or
    exists(Stmt stmt, CdsFacade cds |
      stmt = this.asExpr().getFirstControlFlowNode().getAPredecessor+() and
      result = cds.getMember("context").asSink() and
      stmt.getAChildExpr().(Assignment).getRhs().flow() = result
    )
  }

  DataFlow::Node getUser() { result = this.getContextObject().getAPropertyWrite("user").getRhs() }

  MethodCallNode getATransactionCall() {
    exists(ControlFlowNode exprOrStmt |
      exprOrStmt =
        this.getAnArgument().(FunctionNode).getALocalSource().asExpr().(Function).getABodyStmt() and
      exprOrStmt.(Stmt).getAChildExpr().flow().(MethodCallNode).getReceiver().getALocalSource() =
        this.getAnArgument().(FunctionNode).getParameter(_) and
      result = exprOrStmt.(Stmt).getAChildExpr().flow()
      or
      exprOrStmt =
        this.getAnArgument().(FunctionNode).getALocalSource().asExpr().(Function).getAChildExpr() and
      exprOrStmt.(Expr).flow().(MethodCallNode).getReceiver().getALocalSource() =
        this.getAnArgument().(FunctionNode).getParameter(_) and
      result = exprOrStmt.(MethodCallExpr).flow()
      or
      exprOrStmt = this.asExpr().getFirstControlFlowNode().getASuccessor+() and
      exprOrStmt.(Expr).flow().(MethodCallNode).getReceiver().getALocalSource() = this and
      result = exprOrStmt.(MethodCallExpr).flow()
    )
  }

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
class EntityReferenceFromEntities extends EntityReference instanceof PropRead {
  /**
   * Property or call to entities
   */
  DataFlow::SourceNode entitiesAccess;
  /**
   * Receiver of the entities call or the base of propread
   */
  DataFlow::Node receiver;
  /**
   * Name of the (unqualified) entity being accessed
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
 * db.entities, db.entities(...), cds.entities, cds.entities(...)
 */
class EntityReferenceFromDbOrCdsEntities extends EntityReferenceFromEntities {
  EntityReferenceFromDbOrCdsEntities() {
    this.getReceiver().getALocalSource() instanceof DBServiceInstanceFromCdsConnectTo or
    exists(CdsFacade cds | this.getReceiver().getALocalSource() = cds.getNode()) or
    exists(CdsFacade cds | this.getReceiver().getALocalSource() = cds.getMember("db").asSource())
  }

  override CdlEntity getCqlDefinition() {
    /* NOTE: the result may be multiple; but they are all identical so we don't really care. */
    result.getName() =
      this.getEntities().(MethodCallNode).getArgument(0).getStringValue() + "." + entityName
  }

  override UserDefinedApplicationService getServiceDefinition() {
    /* TODO: Always get the DB service definition. */
    none()
    // result.getServiceName() = this.(CdsEntitiesCall).getNamespace()
  }
}

class EntityReferenceFromCqlClause extends EntityReference, ExprNode {
  CqlClause cql;

  EntityReferenceFromCqlClause() { this = cql.getAccessingEntityReference() }

  override CdlEntity getCqlDefinition() { result = cql.getAccessingEntityDefinition() }
}

/**
 * The `"data"` property of the handler's parameter that represents the request or message passed to this handler.
 * This property carries the user-provided payload provided to the CAP application. e.g.
 * ``` javascript
 * srv.on("send", async (msg) => {
 *   const { payload } = msg.data;
 * })
 * ```
 * The `payload` carries the data that is sent to this application on the action or event named `send`.
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
      handlerRegistration = handlerParameter.getHandlerRegistration() and
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
    this = base.getAMemberCall(methodName) and
    (
      /*
       * 1. Method call on the CDS facade or the base database service,
       * accessed as `cds.db`.
       */

      exists(CdsFacade cds | base = cds.asSource()) or
      exists(CdsDb cdsDb | base = cdsDb) or
      /* 2. Method call on a service instance object. */
      exists(ServiceInstance srv | base = srv)
    )
  }
}

class CqlRunMethodCall extends CqlQueryRunnerCall {
  CqlRunMethodCall() { this.getMethodName() = "run" }
}

class CqlReadMethodCall extends CqlQueryRunnerCall {
  CqlReadMethodCall() { this.getMethodName() = "read" }
}

class CqlCreateMethodCall extends CqlQueryRunnerCall {
  CqlCreateMethodCall() { this.getMethodName() = "create" }
}

class CqlUpdateMethodCall extends CqlQueryRunnerCall {
  CqlUpdateMethodCall() { this.getMethodName() = "update" }
}

class CqlDeleteMethodCall extends CqlQueryRunnerCall {
  CqlDeleteMethodCall() { this.getMethodName() = "delete" }
}

class CqlInsertMethodCall extends CqlQueryRunnerCall {
  CqlInsertMethodCall() { this.getMethodName() = "insert" }
}
