/**
 * A module to describe santizers that should be applied to out of the box queries.
 * To include various frameworks and concepts as need be.
 * Extension points will depend very much on which query is the intended affected one.
 */

import advanced_security.javascript.frameworks.ui5.UI5WebcomponentsReact

/**
 * Sources to exclude via sanitizer that do not actually allow for arbitrary user input
 */
class ExcludedSource extends DomBasedXss::Sanitizer {
  ExcludedSource() {
    exists(UseRefDomValueSource source |
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
