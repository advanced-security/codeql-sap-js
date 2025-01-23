import javascript
import advanced_security.javascript.frameworks.cap.CDS

/**
 * A parameter of a handler registered for a service on an event. e.g.
 * ```javascript
 * this.on("SomeEvent", "SomeEntity", (req) => { ... });
 * this.before("SomeEvent", "SomeEntity", (req, next) => { ... }); // only `req` is captured
 * SomeService.on("SomeEvent", "SomeEntity", (msg) => { ... });
 * SomeService.after("SomeEvent", "SomeEntity", (msg) => { ... });
 * ```
 * All the parameters named `req` and `msg` are captured in the above example.
 */
class HandlerParameter extends ParameterNode, RemoteFlowSource {
  Handler handler;
  HandlerRegistration handlerRegistration;

  HandlerParameter() {
    exists(UserDefinedApplicationService service |
      handler = handlerRegistration.getHandler() and
      this = handler.getParameter(0) and
      service.getAHandlerRegistration() = handlerRegistration and
      service.isExposed()
    )
  }

  override string getSourceType() {
    result = "Parameter of an event handler belonging to an exposed service"
  }

  /**
   * Gets the handler this is a parameter of.
   */
  Handler getHandler() { result = handler }

  /**
   * Gets the handler registration registering the handler it is a parameter of.
   */
  HandlerRegistration getHandlerRegistration() { result = handlerRegistration }
}

/**
 * A service may be described only in a CDS file, but event handlers may still be registered in a format such as:
 * ```javascript
 * module.exports = srv => {
 *   srv.before('CREATE', 'Media', req => { // an entity name is used to describe which to register this handler to.
 *     ...
 *   });
 * }
 * ```
 * parameters named `req` are captured in the above example.
 */
class ServiceinCDSHandlerParameter extends ParameterNode, RemoteFlowSource {
  ServiceinCDSHandlerParameter() {
    exists(MethodCallNode m, CdlEntity entity, string entityName |
      entity.getName().regexpReplaceAll(".*\\.", "") = entityName and
      m.getArgument(1).asExpr().getStringValue().regexpReplaceAll("'", "") = entityName and
      this = m.getArgument(m.getNumArgument() - 1).(FunctionNode).getParameter(0) and
      m.getMethodName() in ["on", "before", "after"]
    )
  }

  override string getSourceType() {
    result = "Parameter of an event handler belonging to an exposed service defined in a cds file"
  }
}
