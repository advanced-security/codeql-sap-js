import javascript
import advanced_security.javascript.frameworks.cap.CDS

/**
 * A reference to an entity that is defined in this application.
 */
class LocalEntityReference instanceof EntityReference {
  LocalEntityReference() { not this instanceof RemoteEntityReference }

  string toString() { result = super.toString() }

  Location getLocation() { result = super.getLocation() }

  predicate hasRestrictedAccessControl() {
    exists(RestrictCondition restrict |
      restrict =
        this.(EntityReference).getCqlDefinition().getRestrictAnnotation().getARestrictCondition()
    |
      not restrict.grantsToAnyone(_)
    )
  }
}

/**
 * A reference to an entity that is not defined in this application and
 * read from a service instance that is looked up with the name defined in
 * package.json.
 */
class RemoteEntityReference instanceof EntityReference {
  RemoteEntityReference() { not exists(this.getCqlDefinition()) }

  string toString() { result = super.toString() }

  Location getLocation() { result = super.getLocation() }
}

abstract class PrivilegedUserInstance extends DataFlow::Node { }

class CdsUserPrivilegedProperty extends PrivilegedUserInstance instanceof PropRead {
  CdsUserPrivilegedProperty() {
    exists(CdsUser cdsUser, PropRead cdsUserRef |
      cdsUserRef = cdsUser.getInducingNode() and
      cdsUserRef.flowsTo(this.getBase()) and
      this.getPropertyName() = "Privileged"
    )
  }
}

class CustomPrivilegedUser extends ClassNode {
  CustomPrivilegedUser() {
    exists(CdsUser cdsUser | this.getASuperClassNode() = cdsUser.asSource()) and
    exists(FunctionNode init |
      init = this.getInstanceMethod("is") and
      forall(Expr expr | expr = init.asExpr().(Function).getAReturnedExpr() |
        expr.mayHaveBooleanValue(true)
      )
    )
  }
}

class CustomPrivilegedUserInstance extends PrivilegedUserInstance, NewNode {
  CustomPrivilegedUserInstance() {
    exists(CustomPrivilegedUser customPrivilegedUserClass |
      this = customPrivilegedUserClass.getAnInstantiation()
    )
  }
}
