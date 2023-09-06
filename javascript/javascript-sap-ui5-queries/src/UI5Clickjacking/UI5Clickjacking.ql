/**
 * @id javascript/javascript-sap-ui5-queries/UI5Clickjacking
 * @name UI5Clickjacking
 * @description The absence of frame options allows for clickjacking.
 * @kind problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision low
  * @tags javascript-sap-ui5-queries
 *       security
 *       external/cwe/cwe-451
 */

import javascript  
import models.UI5HTML 
import semmle.javascript.RestrictedLocations
private import models.UI5

class FirstLineOfMainHtml extends HTML::DocumentElement, FirstLineOf {
  FirstLineOfMainHtml() {
    exists(UI5::Project p | this.getFile().(FirstLineOf).getFile() = p.getMainHTML())
  }
}

newtype TAlertLocation =
  TFrameOptions(FrameOptions frameOptions) or
  TFirstLineOfMainHtml(FirstLineOfMainHtml htmlStartTag)

class AlertLocation extends TAlertLocation {
  FrameOptions asFrameOptions() { this = TFrameOptions(result) }

  FirstLineOfMainHtml asFirstLineOfMainHtml() { this = TFirstLineOfMainHtml(result) }

  string toString() {
    result = this.asFrameOptions().toString() or
    result = this.asFirstLineOfMainHtml().toString()
  }

  predicate hasLocationInfo(string path, int sl, int sc, int el, int ec) {
    this.asFrameOptions().getLocation().hasLocationInfo(path, sl, sc, el, ec)
    or
    this.asFirstLineOfMainHtml().hasLocationInfo(path, sl, sc, el, ec)
  }
}

from AlertLocation alert, string message
where
  exists(FrameOptions frameOptions | frameOptions.allowsAllOriginEmbedding() |
    alert.asFrameOptions() = frameOptions and
    message =
      "Possible clickjacking vulnerability due to " + frameOptions.toString() +
        " being set to `allow`."
  )
  or
  exists(UI5::Project p | thereIsNoFrameOptionSet(p) |
    alert.asFirstLineOfMainHtml().getFile() = p.getMainHTML() and
    message = "Possible clickjacking vulnerability due to missing frame options."
  )
select alert, message
