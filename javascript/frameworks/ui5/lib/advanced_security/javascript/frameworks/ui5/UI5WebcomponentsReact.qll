import semmle.javascript.security.dataflow.DomBasedXssCustomizations

/**
 * ``` javascript
 * import { Input, Button } from '@ui5/webcomponents-react';
 * ```
 */
class WebComponentImport extends API::Node {
  WebComponentImport() { this = API::moduleImport("@ui5/webcomponents-react") }
}

private DataFlow::SourceNode isUI5WebComponentReact(DataFlow::TypeTracker t) {
  exists(WebComponentImport i | result = i.getMember(_).asSource()) or
  exists(DataFlow::TypeTracker t2 | result = isUI5WebComponentReact(t).track(t2, t))
}

DataFlow::SourceNode isUI5WebComponentReact() {
  result = isUI5WebComponentReact(DataFlow::TypeTracker::end())
}

/**
 * Refers to the ref attribute
 * <SomeElement ref={x}>
 */
class RefAttribute extends JsxAttribute {
  RefAttribute() { this.getName() = "ref" }
}

/**
 * Holds if the ref variable is assigned to a UI5 component via JSX
 */
predicate isRefAssignedToUI5Component(UseRefDomValueSource source) {
  exists(
    Variable refVar, JsxElement jsx, RefAttribute attr, VarRef componentVar, DataFlow::Node decl
  |
    source.getElement() = jsx and
    // The JSX element uses a UI5 webcomponent for react
    jsx.getNameExpr() = componentVar and
    decl.asExpr() = componentVar.getVariable().getADefinition() and
    isUI5WebComponentReact() = decl and
    // The JSX element has a ref attribute pointing to our ref variable
    jsx.getAnAttribute() = attr and
    attr.getValue().(VarRef).getVariable() = refVar
  )
}

/**
 * A custom version of the `UseRefDomValueSource` in the out of the box libraries
 * this version exposes its JSX element and also is not private
 */
class UseRefDomValueSource extends DOM::DomValueSource::Range {
  JsxElement jsx;

  UseRefDomValueSource() {
    exists(RefAttribute attrib |
      attrib.getValue().flow().getALocalSource().getAPropertyRead("current") = this and
      jsx.getAnAttribute() = attrib
    )
  }

  JsxElement getElement() { result = jsx }
}
