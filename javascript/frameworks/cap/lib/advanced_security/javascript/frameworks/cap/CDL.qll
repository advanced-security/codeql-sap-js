/**
 * A module to reason about CDL, the language to write specification of models of services, parsed into JSON.
 */

import javascript
import advanced_security.javascript.frameworks.cap.CDS

abstract class CdlObject extends JsonObject {
  predicate hasLocationInfo(string path, int sl, int sc, int el, int ec) {
    // If the cds.json file has a $location property, then use that,
    // otherwise fall back to the cds.json file itself
    if exists(this.getPropValue("$location"))
    then
      exists(Location loc, JsonValue locValue |
        loc = this.getLocation() and
        locValue = this.getPropValue("$location") and
        // The path in the `.cds.json` file is relative to the working directory used when
        // running the `cds compile` command. In the CDS extractor, the `cwd` is always
        // set to the base directory of the project for which compilation is being
        // performed and `.cds.json` files are stored in that base project directory. The
        // `$location` values in the generated JSON data are, therefore, relative to the
        // base directory of the project.
        //
        // Note: On Windows, `getAbsolutePath()` returns backslash-separated paths, but
        // `$location.file` values in `.cds.json` always use forward slashes (POSIX).
        // We normalize backslashes to forward slashes to ensure cross-platform compatibility.
        path =
          locValue
                .getJsonFile()
                .getParentContainer()
                .getAbsolutePath()
                .replaceAll("\\", "/")
                .regexpReplaceAll("/$", "") + "/" + locValue.getPropValue("file").getStringValue() and
        if
          not exists(locValue.getPropValue("line")) and
          not exists(locValue.getPropValue("col"))
        then
          // We don't know where this entity starts, so mark the whole file
          sl = 0 and
          sc = 0 and
          el = 0 and
          ec = 0
        else (
          sl = locValue.getPropValue("line").getIntValue() and
          (
            if exists(locValue.getPropValue("col"))
            then sc = locValue.getPropValue("col").getIntValue()
            else
              // We don't know where this entity starts, so mark the start of the line
              sc = 0
          ) and
          el = sl and
          (
            if exists(getObjectLocationName())
            then
              // Currently $locations does not provide an end location. However, we can
              // automatically deduce the end location from the length of the name.
              ec = sc + getObjectLocationName().length() - 1
            else
              // Mark a single character if we cannot predicate the length
              ec = sc + 1
          )
        )
      )
    else super.getLocation().hasLocationInfo(path, sl, sc, el, ec)
  }

  /**
   * The name of the object that should be highlighted as the location.
   *
   * This is used to deduce the length of the location.
   */
  string getObjectLocationName() { none() }
}

private newtype CdlKind =
  CdlServiceKind(string value) { value = "service" } or
  CdlEntityKind(string value) { value = "entity" } or
  CdlEventKind(string value) { value = "event" } or
  CdlActionKind(string value) { value = "action" } or
  CdlFunctionKind(string value) { value = "function" }

/**
 * A list of CDL definitions, which can include entities, events, actions and more.
 */
class CdlDefinitions extends CdlObject {
  CdlDefinitions() { exists(JsonObject root | this = root.getPropValue("definitions")) }

  JsonObject getElement(string elementName) { result = this.getPropValue(elementName) }

  JsonObject getAnElement() { result = this.getElement(_) }
}

/**
 * A CDL definition element.
 */
abstract class CdlElement extends CdlObject {
  CdlKind kind;
  string name;

  CdlElement() { exists(CdlDefinitions definitions | this = definitions.getElement(name)) }

  override string getObjectLocationName() { result = getUnqualifiedName() }

  /**
   * Gets the name of this CDL element.
   */
  string getName() { result = name }

  /**
   * Gets the unqualified name of this CDL element without the leading namespace.
   */
  string getUnqualifiedName() {
    exists(string qualifiedName | qualifiedName = this.getName() |
      result = qualifiedName.splitAt(".", count(qualifiedName.indexOf(".")))
    )
  }

  /**
   * Gets the kind of this CDL element.
   */
  CdlKind getKind() { result = kind }

  /**
   * Gets an annotation attached to this CDL element with the given name.
   */
  CdlAnnotation getAnnotation(string annotationName) {
    this = result.getQualifiedElement() and result.getName() = annotationName
  }

  /**
   * Gets an annotation attached to this CDL element.
   */
  CdlAnnotation getAnAnnotation() { result = this.getAnnotation(_) }

  CdlAttribute getAttribute(string attributeName) {
    result = this.getPropValue("elements").getPropValue(attributeName)
  }

  /**
   * Gets the `@restrict` annotation attached to this CDL element, if any.
   * Note that this excludes CDL events, as events emissions are not tied to
   * authentication or authorization.
   */
  RestrictAnnotation getRestrictAnnotation() { result = this.getAnnotation("restrict") }

  /**
   * Gets the `@requires` annotation attached to this CDL element, if any.
   * Note that this excludes CDL events, as events emissions are not tied to
   * authentication or authorization.
   */
  RequiresAnnotation getRequiresAnnotation() { result = this.getAnnotation("requires") }

  predicate hasNoCdsAccessControl() {
    /* 1. There's no @restrict or @requires in the first place. */
    not exists(RestrictAnnotation restrictAnnotation |
      restrictAnnotation = this.getRestrictAnnotation()
    ) and
    not exists(RequiresAnnotation requiresAnnotation |
      requiresAnnotation = this.getRequiresAnnotation()
    )
    or
    /* 2. The existing @restrict is useless. */
    this.getRestrictAnnotation().getARestrictCondition().grantsToAnyone(_)
    or
    /* 3. The existing @requires is useless. */
    this.getRequiresAnnotation().getRequiredRole() = "any"
  }
}

class CdlService extends CdlElement {
  CdlService() { kind = CdlServiceKind(this.getPropStringValue("kind")) }

  UserDefinedApplicationService getImplementation() {
    exists(JsonValue jsonFileLocation |
      jsonFileLocation = this.getPropValue("$location").getPropValue("file")
    |
      // Normalize backslashes to forward slashes for cross-platform compatibility.
      // On Windows, `getAbsolutePath()` returns backslash-separated paths, but
      // `$location.file` values in `.cds.json` always use forward slashes (POSIX).
      result.getFile().getAbsolutePath().replaceAll("\\", "/").regexpReplaceAll("\\.[^.]+$", ".cds") =
        jsonFileLocation
              .getJsonFile()
              .getParentContainer()
              .getAbsolutePath()
              .replaceAll("\\", "/")
              .regexpReplaceAll("/$", "") + "/" + jsonFileLocation.getStringValue()
    )
  }

  /**
   * Gets a call to `cds.serve` which serves and possibly decorates this CDS definition.
   */
  CdsServeCall getCdsServeCall() { result.getServiceDefinition() = this.getImplementation() }

  CdlEntity getEntity(string entityName) {
    result.getName() = entityName and
    this.getName() = result.getName().splitAt(".", 0)
  }

  CdlEntity getAnEntity() { result = this.getEntity(_) }

  CdlActionOrFunction getAnActionOrFunction() {
    result = this.getAnEvent() or result = this.getAnAction()
  }

  CdlEvent getEvent(string eventName) {
    result.getName() = eventName and this.getName() = result.getName().splitAt(".", 0)
  }

  CdlEvent getAnEvent() { result = this.getEvent(_) }

  CdlAction getAction(string actionName) {
    result.getName() = actionName and this.getName() = result.getName().splitAt(".", 0)
  }

  CdlAction getAnAction() { result = this.getAction(_) }

  CdlFunction getFunction(string functionName) {
    result.getName() = functionName and this.getName() = result.getName().splitAt(".", 0)
  }

  CdlFunction getAFunction() { result = this.getFunction(_) }
}

class CdlEntity extends CdlElement {
  CdlEntity() { kind = CdlEntityKind(this.getPropStringValue("kind")) }

  predicate isSelectFrom(CdlEntity otherEntity) {
    otherEntity.getName() =
      this.getPropValue("query")
          .getPropValue("SELECT")
          .getPropValue("from")
          .getPropValue("ref")
          .(JsonArray)
          .getElementStringValue(_)
  }

  predicate isProjectionOn(CdlEntity otherEntity) {
    otherEntity.getName() =
      this.getPropValue("projection")
          .getPropValue("from")
          .getPropValue("ref")
          .(JsonArray)
          .getElementStringValue(_)
  }

  predicate inherits(CdlEntity otherEntity) {
    this.isSelectFrom(otherEntity) or
    this.isProjectionOn(otherEntity)
  }

  predicate belongsToServiceWithNoAuthn() {
    exists(CdlService service | service.hasNoCdsAccessControl() | this = service.getAnEntity())
  }
}

abstract class CdlActionOrFunction extends CdlElement {
  /**
   * Gets a parameter definition of this action with a given name.
   */
  CdlAttribute getParameter(string paramName) {
    result = this.getPropValue("params").getPropValue(paramName)
  }

  /**
   * Gets a parameter definition of this action.
   */
  CdlAttribute getAParameter() { result = this.getParameter(_) }
}

class CdlEvent extends CdlActionOrFunction {
  CdlEvent() { kind = CdlEventKind(this.getPropStringValue("kind")) }

  string getBasename() { result = name.splitAt(".", count(name.indexOf("."))) }
}

class CdlAction extends CdlActionOrFunction {
  CdlAction() { kind = CdlActionKind(this.getPropStringValue("kind")) }

  predicate belongsToServiceWithNoAuthn() {
    exists(CdlService service | service.hasNoCdsAccessControl() | this = service.getAnAction())
  }
}

class CdlFunction extends CdlElement {
  CdlFunction() { kind = CdlFunctionKind(this.getPropStringValue("kind")) }

  JsonObject getReturns() { result = this.getPropValue("returns") }

  predicate belongsToServiceWithNoAuthn() {
    exists(CdlService service | service.hasNoCdsAccessControl() | this = service.getAFunction())
  }
}

class CdlAttribute extends CdlObject {
  string name;

  CdlAttribute() {
    exists(CdlElement entity | this = entity.getPropValue("elements").getPropValue(name)) or
    exists(CdlActionOrFunction actionOrFunction |
      this = actionOrFunction.getPropValue("params").getPropValue(name)
    )
  }

  override string getObjectLocationName() { result = getName() }

  string getType() { result = this.getPropStringValue("type") }

  int getLength() { result = this.getPropValue("length").(JsonPrimitiveValue).getIntValue() }

  string getName() { result = name }
}

/**
 * a `CdlEntity` that is declared in a namespace
 */
class NamespacedEntity extends CdlObject instanceof CdlEntity {
  string namespace;

  NamespacedEntity() { this.getParent+().getPropValue("namespace").getStringValue() = namespace }

  string getNamespace() { result = namespace }
}

/**
 * any `JsonValue` that has a `PersonalData` like annotation above it
 */
abstract class SensitiveAnnotatedElement extends CdlObject {
  abstract string getName();
}

class SensitiveAnnotatedEntity extends SensitiveAnnotatedElement instanceof CdlEntity {
  SensitiveAnnotatedEntity() { exists(PersonalDataAnnotation a | a.getQualifiedElement() = this) }

  override string getName() { result = this.(CdlEntity).getName() }

  string getShortName() { result = this.getName().regexpCapture(".*\\.([^\\.]+$)", 1) }
}

class SensitiveAnnotatedAttribute extends SensitiveAnnotatedElement instanceof CdlAttribute {
  SensitiveAnnotatedAttribute() {
    exists(PersonalDataAnnotation a | a.getQualifiedElement() = this)
  }

  override string getName() { result = this.(CdlAttribute).getName() }
}

/**
 * CDL annotations for PersonalData
 */
class PersonalDataAnnotation extends CdlAnnotation {
  PersonalDataAnnotation() { this.getName().matches("PersonalData%") }
}

/**
 * CDL annotations specifically associated to `CdlElement`s
 */
class CdlAnnotation extends JsonValue {
  string annotationName;
  JsonValue element;

  CdlAnnotation() {
    this = element.getPropValue(annotationName) and
    annotationName.charAt(0) = "@"
  }

  /**
   * Gets the name of this annotation, without the leading `@` character.
   */
  string getName() { "@" + result = annotationName }

  /**
   * Gets the CDL Element that this annotation is attached to.
   */
  JsonValue getQualifiedElement() { result = element }
}

class ProtocolAnnotation extends CdlAnnotation {
  ProtocolAnnotation() {
    this.getQualifiedElement() instanceof CdlService and this.getName() = "protocol"
  }

  string getAnExposedProtocol() {
    /* e.g. @protocol: 'odata' */
    result = this.(JsonString).getValue()
    or
    /* e.g. @protocol: ['odata', 'rest', 'graphql'] */
    result = this.(JsonArray).getElementStringValue(_)
    or
    /* e.g. @protocol: [{ kind: 'odata', path: 'some/path' }] */
    result = this.(JsonArray).getElementValue(_).(JsonObject).getPropStringValue("kind")
  }
}

class CdsFile extends File {
  CdsFile() { exists(CdlElement element | this = element.getJsonFile()) }
}

class RestrictAnnotation extends CdlAnnotation, JsonArray {
  RestrictAnnotation() { this.getName() = "restrict" }

  RestrictCondition getARestrictCondition() { result = this.getElementValue(_) }
}

class RestrictCondition extends CdlObject {
  RestrictCondition() { exists(RestrictAnnotation restrict | this = restrict.getElementValue(_)) }

  predicate grants(string eventName) {
    exists(JsonValue grantClause | grantClause = this.getGrantClause() |
      grantClause.(JsonString).getValue() = eventName or
      grantClause.(JsonArray).getElementValue(_).(JsonString).getValue() = eventName
    )
  }

  predicate grantsToAnyone(string eventName) {
    this.grants(eventName) and
    (
      this.getToClause() = "any"
      or
      /* The default value is `"any"`. */
      not exists(this.getToClause())
    )
  }

  JsonValue getGrantClause() { result = this.getPropValue("grant") }

  string getToClause() { result = this.getPropStringValue("to") }

  string getWhereClause() { result = this.getPropStringValue("where") }

  string getWhereClauseParsed() { result = this.getPropStringValue("_where") }
}

class RequiresAnnotation extends CdlAnnotation {
  RequiresAnnotation() { this.getName() = "requires" }

  string getRequiredRole() {
    result = this.(JsonArray).getElementStringValue(_) or
    result = this.getStringValue()
  }
}
