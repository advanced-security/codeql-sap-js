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
          "MultiComboBox", "Select", "ColorPicker", "ColorPaletteItem", "CalendarDate",
          "FileUploader", "CheckBox", "RadioButton", "Switch", "RatingIndicator", "Slider",
          "ProgressIndicator", "StepInput", "DynamicDateRange"
        ] and
      this.(DataFlow::PropRead).getBase() = source
    )
  }
}
