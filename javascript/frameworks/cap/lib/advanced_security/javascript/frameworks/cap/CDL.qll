/**
 * A module to reason about CDL, the language to write specification of models of services, parsed into JSON.
 */

import javascript

newtype CdlKind =
  Service(string value) { value = "service" } or
  Entity(string value) { value = "entity" } or
  Event(string value) { value = "event" } or
  Action(string value) { value = "action" }

/**
 * Any CDL element, including entities, event, actions, and more.
 */
class CdlDefinition extends JsonObject {
  CdlDefinition() { exists(JsonObject root | this = root.getPropValue("definitions")) }

  JsonObject getElement(string elementName) { result = this.getPropValue(elementName) }

  JsonObject getAnElement() { result = this.getElement(_) }
}

abstract class CdlElement extends JsonObject {
  abstract string getName();

  abstract CdlKind getKind();

  CdlAnnotation getAnnotation(string annotationName) {
    this = result.getQualifiedElement() and result.getName() = annotationName
  }

  CdlAnnotation getAnAnnotation() { result = this.getAnnotation(_) }
}

class CdlEntityField extends CdlElement {
  string name;
  CdlKind kind;

  CdlEntityField() { exists(CdlDefinition definition | this = definition.getElement(name)) }

  override string getName() { result = name }

  override CdlKind getKind() { result = kind }
}

class CdlService extends CdlElement {
  string name;
  CdlKind kind;

  CdlService() {
    exists(CdlDefinition definition |
      this = definition.getElement(name) and
      kind = Service(this.getPropStringValue("kind"))
    )
  }

  override string getName() { result = name }

  override CdlKind getKind() { result = kind }

  CdlEntity getEntity(string entityName) {
    entityName = result.getName() and
    /* WARNING: Hacky! */
    entityName.splitAt(".", 0) = name
  }
}

class CdlEntity extends CdlElement {
  string name;
  CdlKind kind;

  CdlEntity() {
    exists(CdlDefinition definition |
      this = definition.getElement(name) and
      kind = Entity(this.getPropStringValue("kind"))
    )
  }

  override string getName() { result = name }

  override CdlKind getKind() { result = kind }

  CdlAttribute getAttribute(string attributeName) {
    result = this.getPropValue("elements").getPropValue(attributeName)
  }
}

class CdlEvent extends CdlElement {
  string name;
  CdlKind kind;

  CdlEvent() {
    exists(CdlDefinition definition |
      this = definition.getElement(name) and
      kind = Event(this.getPropStringValue("kind"))
    )
  }

  string getBasename() { result = name.splitAt(".", count(name.indexOf("."))) }

  override string getName() { result = name }

  override CdlKind getKind() { result = kind }

  CdlAttribute getAttribute(string attributeName) {
    result = this.getPropValue("elements").getPropValue(attributeName)
  }
}

class CdlAction extends CdlElement {
  string name;
  CdlKind kind;

  CdlAction() {
    exists(CdlDefinition definition |
      this = definition.getElement(name) and
      kind = Action(this.getPropStringValue("kind"))
    )
  }

  override string getName() { result = name }

  override CdlKind getKind() { result = kind }

  CdlAttribute getAttribute(string attributeName) {
    result = this.getPropValue("elements").getPropValue(attributeName)
  }
}

class CdlAttribute extends JsonObject {
  string name;

  CdlAttribute() {
    exists(CdlElement entity | this = entity.getPropValue("elements").getPropValue(name))
  }

  string getType() { result = this.getPropStringValue("type") }

  int getLength() { result = this.getPropValue("length").(JsonPrimitiveValue).getIntValue() }

  string getName() { result = name }
}

/**
 * any `JsonValue` that has a `PersonalData` like annotation above it
 */
abstract class SensitiveAnnotatedElement extends JsonValue {
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
  ProtocolAnnotation() { this = element.(CdlService).getPropValue("@protocol") }

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
