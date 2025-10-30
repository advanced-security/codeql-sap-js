import javascript
import advanced_security.javascript.frameworks.cap.CDS

/**
 * The request parameter of a handler belonging to a service that is exposed to
 * a protocol. e.g. All parameters named `req` is captured in the below example.
 * ``` javascript
 * // srv/service1.js
 * module.exports = class Service1 extends cds.ApplicationService {
 *   this.on("SomeEvent", "SomeEntity", (req) => { ... });
 *   this.before("SomeEvent", "SomeEntity", (req, next) => { ... });
 * }
 * ```
 * ``` cds
 * // srv/service1.cds
 * service Service1 @(path: '/service-1') { ... }
 * ```
 *
 * NOTE: CDS extraction can fail for various reasons, and if so the detection
 * logic falls back on overapproximating on the parameters and assume they are
 * exposed.
 */
class HandlerParameterOfExposedService extends HandlerParameter {
  HandlerParameterOfExposedService() {
    /* 1. The CDS definition is there and we can determine it is exposed. */
    this.getHandler().getHandlerRegistration().getService().getDefinition().isExposed()
    or
    /*
     * 2. (Fallback) The CDS definition is not there, so no precise service definition
     * is known.
     */

    not exists(
      this.getHandler().getHandlerRegistration().getService().getDefinition().getCdsDeclaration()
    )
  }
}

/**
 * Reads of property belonging to a request parameter that is exposed to a protocol.
 * It currently models the following access paths:
 * - `req.data` (from `cds.Event.data`)
 * - `req.params` (from `cds.Request.params`)
 * - `req.headers` (from `cds.Event.headers`)
 * - `req.http.req.*` (from `cds.EventContext.http.req`)
 * - `req.id` (from `cds.EventContext.id`)
 *
 * Note that `req.http.req` has type `require("@express").Request`, so their uses are
 * completely identical. Subsequently, the models for this access path follow Express'
 * API descriptions (as far back as 3.x). Also see `Express::RequestInputAccess`,
 * `Express::RequestHeaderAccess`, and `Express::RequestBodyAccess` of the standard
 * library.
 */
class UserProvidedPropertyReadOfHandlerParameterOfExposedService extends RemoteFlowSource {
  HandlerParameterOfExposedService handlerParameterOfExposedService;

  UserProvidedPropertyReadOfHandlerParameterOfExposedService() {
    /* 1. `req.(data|params|headers|id)` */
    this =
      handlerParameterOfExposedService
          .getAPropertyRead(["data", "params", "headers", "id", "_queryOptions"])
    or
    /* 2. APIs stemming from `req.http.req`: Defined by Express.js */
    exists(PropRead reqHttpReq |
      reqHttpReq = handlerParameterOfExposedService.getAPropertyRead("http").getAPropertyRead("req")
    |
      this = reqHttpReq.getAPropertyRead(["originalUrl", "hostname"]) or
      this =
        reqHttpReq
            .getAPropertyRead(["query", "body", "params", "headers", "cookies"])
            .getAPropertyRead() or
      this = reqHttpReq.getAMemberCall(["get", "is", "header", "param"])
    )
  }

  HandlerParameterOfExposedService getHandlerParameter() {
    result = handlerParameterOfExposedService
  }

  Handler getHandler() { result = handlerParameterOfExposedService.getHandler() }

  override string getSourceType() {
    result =
      "Tainted property read of the request parameter of an event handler belonging to an exposed service"
  }
}
