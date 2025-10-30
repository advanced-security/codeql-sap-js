/**
 * Security-related `DataFlow::Node`s or relations between two `DataFlow::Node`s.
 */

import javascript
import semmle.javascript.dataflow.DataFlow
import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.dataflow.FlowSteps

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
 * 3. Ones based on emitting and subscribing to asynchronous events.
 */
abstract class InterServiceCommunication extends HandlerRegistration {
  /**
   * The method call used by the sender to communicate with the recipient.
   */
  InterServiceCommunicationMethodCall methodCall;
  /**
   * The service that sends the request.
   */
  ServiceInstance sender;
  /**
   * The service that receives the request and handles it.
   */
  ServiceInstance recipient;
  /**
   * The object sent from the sender to the recipient.
   */
  DataFlow::Node payload;

  /**
   * Gets the object representing the sender.
   */
  ServiceInstance getSender() { result = sender }

  /**
   * Gets the object representing the recipient.
   */
  ServiceInstance getRecipient() { result = recipient }

  /**
   * Gets the communication method call that is used on the recipient by the sender.
   */
  InterServiceCommunicationMethodCall getCommunicationMethodCall() { result = methodCall }

  /**
   * Gets the sender's definition, given that it is user-defined.
   */
  /* TODO: Generalize UserApplicationService to include built-in services such as log and db */
  UserDefinedApplicationService getSenderDefinition() { result = sender.getDefinition() }

  /**
   * Gets the recipien's definition, given that it is user-defined.
   */
  UserDefinedApplicationService getRecipientDefinition() { result = recipient.getDefinition() }
}

/**
 * A REST style communication method that covers the built-in REST events (`GET`, `POST`, `PUT`, `UPDATE`, and `DELETE`),
 * as well as custom actions that are defined in the accompanying `.cds` files.
 */
class RestStyleCommunication extends InterServiceCommunication {
  RestStyleCommunication() {
    methodCall instanceof SrvSend and
    sender = this.getService() and
    recipient = methodCall.getRecipient() and
    methodCall.asExpr().getEnclosingFunction+() = this.getHandler().asExpr()
  }
}

class CrudStyleCommunication extends InterServiceCommunication {
  CrudStyleCommunication() {
    methodCall instanceof SrvRun and
    sender = this.getReceiver() and
    recipient = methodCall.getReceiver() and
    methodCall.asExpr().getEnclosingFunction+() = this.getHandler().asExpr()
  }
}

class AsyncStyleCommunication extends InterServiceCommunication {
  AsyncStyleCommunication() {
    exists(
      HandlerRegistration emittingRegistration, HandlerRegistration orchestratingRegistration,
      SrvEmit srvEmit, InterServiceCommunicationMethodCall methodCallOnReceiver
    |
      /* TODO refactor this */
      emittingRegistration != orchestratingRegistration and
      /* The service that emits the event and the service that registers the handler are the same; it's the sender. */
      this = orchestratingRegistration and
      methodCall = srvEmit and
      sender = emittingRegistration.getReceiver() and
      srvEmit.asExpr().getEnclosingFunction+() = sender.getDefinition().getInitFunction().asExpr() and
      /* 1. match by their event name. */
      srvEmit.getEmittedEvent() = orchestratingRegistration.getAnEventName() and
      /* 2. match by their service name in cds.connect().to(). */
      [
        srvEmit.getEmitter().getDefinition().getManifestName(),
        srvEmit.getEmitter().getDefinition().getUnqualifiedName()
      ] = orchestratingRegistration.getReceiver().(ServiceInstanceFromCdsConnectTo).getServiceDesignator() and
      recipient = methodCallOnReceiver.getReceiver() and
      methodCallOnReceiver.getEnclosingFunction() = orchestratingRegistration.getHandler().asExpr()
    )
  }
}
