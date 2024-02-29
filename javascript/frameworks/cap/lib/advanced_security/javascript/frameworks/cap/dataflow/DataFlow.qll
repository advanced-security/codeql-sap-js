/**
 * Security-related `DataFlow::Node`s or relations between two `DataFlow::Node`s.
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS

/**
 * Methods that parse source strings into a CQL expression.
 */
class ParseSink extends DataFlow::Node {
  ParseSink() {
    exists(CdsFacade cds |
      this = cds.getMember("parse").getMember(["expr", "ref", "xpr"]).getACall().getAnArgument()
    )
  }
}

/**
 * A communication happening between `cds.Service`s. This includes:
 * 1. Ones based on REST-style API, based on `cds.Service.send`,
 * 2. Ones based on query-style API, based on `cds.Services.run`, and
 * 3. Ones based on emitting and subscribing to asynchronous event messages.
 */
abstract class InterServiceCommunication extends HandlerRegistration {
  InterServiceCommunication() { this.getReceiver() instanceof ServiceInstance }

  /* TODO: Generalize UserApplicationService to include built-in services such as log and db */
  /**
   * The service that sends the request.
   */
  UserDefinedApplicationService sender;
  /**
   * The service that receives the request and handles it.
   */
  UserDefinedApplicationService recipient;

  UserDefinedApplicationService getSender() { result = sender }

  UserDefinedApplicationService getReceipient() { result = recipient }
}

/**
 * A REST style communication method that covers the built-in REST events (`GET`, `POST`, `PUT`, `UPDATE`, and `DELETE`),
 * as well as custom actions that are defined in the accompanying `.cds` files.
 */
class RestStyleCommunication extends InterServiceCommunication {
  RestStyleCommunication() {
    exists(SrvSend srvSend |
      sender = this.getReceiver().(ServiceInstance).getDefinition() and
      recipient = srvSend.getReceiver().(ServiceInstance).getDefinition() and
      srvSend.asExpr().getEnclosingFunction+() = this.getHandler().asExpr()
    )
  }
}

class CrudStyleCommunication extends InterServiceCommunication {
  CrudStyleCommunication() {
    exists(SrvRun srvRun |
      sender = this.getReceiver().(ServiceInstance).getDefinition() and
      recipient = srvRun.getReceiver().(ServiceInstance).getDefinition() and
      srvRun.asExpr().getEnclosingFunction+() = this.getHandler().asExpr()
    )
  }
}

class AsyncStyleCommunication extends InterServiceCommunication {
  AsyncStyleCommunication() {
    exists(
      HandlerRegistration emittingRegistration, HandlerRegistration orchestratingRegistration,
      SrvEmit srvEmit, InterServiceCommunicationMethodCall methodCallOnReceiver
    |
      emittingRegistration != orchestratingRegistration and
      /* The service that emits the event and the service that registers the handler are the same; it's the sender. */
      this = orchestratingRegistration and
      sender = emittingRegistration.getReceiver().(ServiceInstance).getDefinition() and
      srvEmit.asExpr().getEnclosingFunction+() = sender.getInitFunction().asExpr() and
      /* 1. match by their event name. */
      srvEmit.getEmittedEvent() = orchestratingRegistration.getAnEventName() and
      /* 2. match by their service name in cds.connect().to(). */
      srvEmit.getEmitter().getDefinition().getManifestName() =
        orchestratingRegistration.getReceiver().(ServiceInstanceFromCdsConnectTo).getServiceName() and
      recipient = methodCallOnReceiver.getReceiver().(ServiceInstance).getDefinition() and
      methodCallOnReceiver.getEnclosingFunction() = orchestratingRegistration.getHandler().asExpr()
    )
  }
}
