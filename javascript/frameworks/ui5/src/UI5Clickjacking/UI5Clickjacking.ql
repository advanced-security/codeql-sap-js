/**
 * @name UI5 Clickjacking
 * @description The absence of frame options allows for clickjacking.
 * @kind problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision medium
 * @id js/ui5-clickjacking
 * @tags security
 *      external/cwe/cwe-451
 */

import javascript
import advanced_security.javascript.frameworks.ui5.UI5
import advanced_security.javascript.frameworks.ui5.UI5HTML
import semmle.javascript.RestrictedLocations
private import advanced_security.javascript.frameworks.ui5.UI5

class FirstLineOfDocumentElementWebApp extends HTML::DocumentElement, FirstLineOf {
  FirstLineOfDocumentElementWebApp() {
    exists(WebApp app | app.getDocument() = this)
  }
}

private newtype TAlertLocation =
  TFrameOptions(FrameOptions frameOptions) or
  TFirstLineOfDocumentElementWebApp(FirstLineOfDocumentElementWebApp htmlStartTag)

class AlertLocation extends TAlertLocation {
  FrameOptions asFrameOptions() { this = TFrameOptions(result) }

  FirstLineOfDocumentElementWebApp asFirstLineOfDocumentElementWebApp() {
    this = TFirstLineOfDocumentElementWebApp(result)
  }

  string toString() {
    result = this.asFrameOptions().toString() or
    result = this.asFirstLineOfDocumentElementWebApp().toString()
  }

  predicate hasLocationInfo(string path, int sl, int sc, int el, int ec) {
    this.asFrameOptions().getLocation().hasLocationInfo(path, sl, sc, el, ec)
    or
    this.asFirstLineOfDocumentElementWebApp().hasLocationInfo(path, sl, sc, el, ec)
  }
}

from AlertLocation alertLocation, string message
where
  exists(WebApp app |
    exists(FrameOptions frameOptions | app.getFrameOptions() = frameOptions |
      frameOptions.allowsAllOriginEmbedding() and
      alertLocation.asFrameOptions() = frameOptions and
      message =
        "Possible clickjacking vulnerability due to " + frameOptions.toString() +
          " being set to `allow`."
    )
    or
    isMissingFrameOptionsToPreventClickjacking(app) and
    alertLocation.asFirstLineOfDocumentElementWebApp() = app.getDocument() and
    message = "Possible clickjacking vulnerability due to missing frame options."
  )
select alertLocation, message
