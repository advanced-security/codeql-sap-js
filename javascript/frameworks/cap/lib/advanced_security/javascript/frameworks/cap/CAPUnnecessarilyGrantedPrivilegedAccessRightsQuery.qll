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

  predicate hasRestrictedAccessControl() {
    exists(RestrictCondition restrict |
      restrict =
        this.(EntityReference).getCqlDefinition().getRestrictAnnotation().getARestrictCondition()
    |
      not restrict.grantsToAnyone(_)
    )
  }
}
