/**
 * A module to describe santizers that should be applied to out of the box queries.
 * To include various frameworks and concepts as need be.
 * Extension points will depend very much on which query is the intended affected one.
 */

import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5WebcomponentsReact
private import semmle.javascript.security.dataflow.DomBasedXssCustomizations

/**
 * Sources to exclude via sanitizer that do not actually allow for arbitrary user input
 */
class ExcludedSource extends DomBasedXss::Sanitizer {
  ExcludedSource() {
    exists(CustomUseRefDomValueSource source |
      // exclude components with this name from @ui5/webcomponents-react only
      isRefAssignedToUI5Component(source) and
      source.getElement().getName() in [
          "Select", "ColorPicker", "ColorPaletteItem", "CalendarDate", "FileUploader", "CheckBox",
          "RadioButton", "Switch", "RatingIndicator", "Slider", "ProgressIndicator", "StepInput",
          "DynamicDateRange", "RangeSlider", "Button", "MessageViewButton", "SegmentedButton",
          "SplitButton", "ToggleButton"
        ] and
      this.(DataFlow::PropRead).getBase() = source
    )
  }
}

/**
 * A UI5 control property whose declared type cannot contain unrestricted text.
 */
class NonStringControlProperty extends DomBasedXss::Sanitizer {
  NonStringControlProperty() {
    this = any(PropertyMetadata property | not property.isUnrestrictedStringType())
  }
}

/**
 * A value returned by a UI5 HTML, XML, JavaScript, URL, CSS, or parameter encoder.
 */
class UI5SecurityEncoder extends DomBasedXss::Sanitizer {
  UI5SecurityEncoder() {
    exists(SapDefineModule definition, DataFlow::ParameterNode encoder |
      this = encoder.getACall() and
      encoder =
        definition
            .getRequiredObject("sap/base/security/" +
                ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML"])
            .asSourceNode()
    )
    or
    this.(DataFlow::CallNode).getReceiver().asExpr().(PropAccess).getQualifiedName() = "jQuery.sap" and
    this.(DataFlow::CallNode).getCalleeName() =
      ["encodeCSS", "encodeJS", "encodeURL", "encodeURLParameters", "encodeXML", "encodeHTML"]
  }
}

/**
 * Content read from or written to a programmatically sanitized UI5 HTML control.
 */
class SanitizedHTMLControlContent extends DomBasedXss::Sanitizer {
  SanitizedHTMLControlContent() {
    exists(UI5Control control, DataFlow::MethodCallNode content |
      control.asJsControl() = content.getReceiver().getALocalSource() and
      control.isHTMLSanitized() and
      content.getMethodName() = "setContent" and
      this = [content, content.getArgument(0)]
    )
  }
}
