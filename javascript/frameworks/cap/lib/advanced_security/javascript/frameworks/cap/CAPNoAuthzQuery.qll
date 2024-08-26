import advanced_security.javascript.frameworks.cap.CDS
import advanced_security.javascript.frameworks.cap.CDL
import advanced_security.javascript.frameworks.cap.Conditionals

abstract class CdlElementWithoutAuthn instanceof CdlElement {
  string toString() { result = super.toString() }

  Location getLocation() { result = super.getLocation() }
}

abstract class CdlElementWithoutCdsAuthn extends CdlElementWithoutAuthn instanceof CdlElement {
  CdlElementWithoutCdsAuthn() { this.hasNoCdsAccessControl() }
}

class CdlServiceWithoutCdsAuthn extends CdlElementWithoutCdsAuthn instanceof CdlService { }

class CdlEntityWithoutCdsAuthn extends CdlElementWithoutCdsAuthn instanceof CdlEntity {
  CdlEntityWithoutCdsAuthn() {
    this.belongsToServiceWithNoAuthn()
    or
    exists(CdlEntityWithoutCdsAuthn otherCdlEntityWithoutCdsAuthn |
      this.inherits(otherCdlEntityWithoutCdsAuthn)
    )
  }
}

class CdlActionWithoutCdsAuthn extends CdlElementWithoutCdsAuthn instanceof CdlAction {
  CdlActionWithoutCdsAuthn() { this.belongsToServiceWithNoAuthn() }
}

class CdlFunctionWithoutCdsAuthn extends CdlElementWithoutCdsAuthn instanceof CdlAction {
  CdlFunctionWithoutCdsAuthn() { this.belongsToServiceWithNoAuthn() }
}

class CdlElementProtectionWithHandlerRegistration instanceof HandlerRegistration {
  string toString() { result = super.toString() }

  predicate hasLocationInfo(
    string filepath, int startline, int startcolumn, int endline, int endcolumn
  ) {
    super.hasLocationInfo(filepath, startline, startcolumn, endline, endcolumn)
  }

  CdlElementProtectionWithHandlerRegistration() {
    (
      this.isBefore()
      or
      this.isOn()
    ) and
    exists(Handler handler, ConditionalExprOrStatement exprOrStmt |
      handler = this.getHandler() and
      (
        exprOrStmt = handler.getFunction().getBody() or
        exprOrStmt = handler.getFunction().getABodyStmt()
      )
    |
      exprOrStmt.getConditionExpr().getAChildExpr*().flow() instanceof RequestUserIs and
      exists(CdsRequest req |
        exprOrStmt.getPolarity() = true and
        exprOrStmt.getAnElseBranchExpr() = req.getARejectCall().asExpr()
        or
        exprOrStmt.getPolarity() = false and
        exprOrStmt.getAThenBranchExpr() = req.getARejectCall().asExpr()
      )
    )
  }

  string getEntityName() { result = super.getEntityName() }

  string getAnEventName() { result = super.getAnEventName() }
}

abstract class CdlElementWithJsAuthn instanceof CdlElement {
  string toString() { result = super.toString() }

  Location getLocation() { result = super.getLocation() }
}

class CdlServiceWithJsAuthn extends CdlElementWithJsAuthn instanceof CdlService {
  CdlServiceWithJsAuthn() {
    exists(CdlElementProtectionWithHandlerRegistration beforeOrOn |
      this.getImplementation().getAHandlerRegistration() = beforeOrOn or
      this.getCdsServeCall().getWithCall().getAHandlerRegistration() = beforeOrOn
    |
      beforeOrOn.getAnEventName() = "*"
    )
  }
}

class CdlEntityWithJsAuthn extends CdlElementWithJsAuthn instanceof CdlEntity {
  CdlEntityWithJsAuthn() {
    exists(CdlService service, CdlElementProtectionWithHandlerRegistration beforeOrOn |
      this = service.getAnEntity() and
      (
        service.getImplementation().getAHandlerRegistration() = beforeOrOn or
        service.getCdsServeCall().getWithCall().getAHandlerRegistration() = beforeOrOn
      ) and
      beforeOrOn.getEntityName() = this.getUnqualifiedName()
    )
  }
}

class CdlActionWithJsAuthn extends CdlElementWithJsAuthn instanceof CdlAction {
  CdlActionWithJsAuthn() {
    exists(CdlService service, CdlElementProtectionWithHandlerRegistration beforeOrOn |
      this = service.getAnAction() and
      (
        service.getImplementation().getAHandlerRegistration() = beforeOrOn or
        service.getCdsServeCall().getWithCall().getAHandlerRegistration() = beforeOrOn
      ) and
      beforeOrOn.getAnEventName() = this.getUnqualifiedName()
    )
  }
}

class CdlFunctionWithJsAuthn extends CdlElementWithJsAuthn instanceof CdlFunction {
  CdlFunctionWithJsAuthn() {
    exists(CdlService service, CdlElementProtectionWithHandlerRegistration beforeOrOn |
      this = service.getAFunction() and
      (
        service.getImplementation().getAHandlerRegistration() = beforeOrOn or
        service.getCdsServeCall().getWithCall().getAHandlerRegistration() = beforeOrOn
      ) and
      beforeOrOn.getAnEventName() = this.getUnqualifiedName()
    )
  }
}

abstract class CdlElementWithoutJsAuthn extends CdlElementWithoutAuthn instanceof CdlElement { }

class CdlServiceWithoutJsAuthn extends CdlElementWithoutJsAuthn instanceof CdlService {
  CdlServiceWithoutJsAuthn() { not this instanceof CdlServiceWithJsAuthn }
}

class CdlEntityWithoutJsAuthn extends CdlElementWithoutJsAuthn instanceof CdlEntity {
  CdlEntityWithoutJsAuthn() { not this instanceof CdlEntityWithJsAuthn }
}

class CdlActionWithoutJsAuthn extends CdlElementWithoutJsAuthn instanceof CdlAction {
  CdlActionWithoutJsAuthn() { not this instanceof CdlActionWithJsAuthn }
}

class CdlFunctionWithoutJsAuthn extends CdlElementWithoutJsAuthn instanceof CdlFunction {
  CdlFunctionWithoutJsAuthn() { not this instanceof CdlFunctionWithJsAuthn }
}

/**
 * The access to property `user` of a handler's request.
 */
class RequestUser extends SourceNode instanceof PropRef {
  RequestUser() {
    exists(Handler handler |
      this.getBase().getALocalSource() = handler.getRequest() and
      this.getPropertyName() = "user"
    )
  }
}

class RequestUserIs instanceof MethodCallNode {
  string userRole;

  RequestUserIs() {
    exists(RequestUser requestUser |
      this = requestUser.getAMethodCall("is") and
      userRole = this.getArgument(0).getStringValue()
    )
  }

  string toString() { result = super.toString() }
}
