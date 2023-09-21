private import javascript
private import DataFlow
private import advanced_security.javascript.frameworks.ui5.UI5

newtype TFrameOptions =
  /*
   *  <script id='sap-ui-bootstrap'
   * 	  src='resources/sap-ui-core.js'
   * 	  data-sap-ui-frameOptions='deny'>
   *  </script>
   */

  HtmlFrameOptions(HTML::Attribute dataSapUIFrameOptions) {
    dataSapUIFrameOptions.getName() = "data-sap-ui-frameOptions" and
    dataSapUIFrameOptions.getElement() instanceof HTML::ScriptElement
  } or
  /*
   * window["sap-ui-config"]
   */

  JsFrameOptions(DataFlow::PropRef windowDecl) { windowDecl.getPropertyName() = "sap-ui-config" }

class FrameOptions extends TFrameOptions {
  HTML::Attribute asHtmlFrameOptions() { this = HtmlFrameOptions(result) }

  DataFlow::PropRef asJsFrameOptions() { this = JsFrameOptions(result) }

  private string getHtmlFrameOptions() {
    /*
     * Check the value of this page's `frameOptions` as declared in HTML.
     */

    result = this.asHtmlFrameOptions().getValue()
    or
    /*
     * Check the value of this page's `frameOptions` as declared in JavaScript.
     * ```js
     * window["sap-ui-config"] = {
     *     frameOptions: 'trusted',
     *     ...
     * }
     * ```
     */

    exists(DataFlow::PropRef windowDecl | windowDecl = this.asJsFrameOptions() |
      result =
        windowDecl
            .(PropWrite)
            .getRhs()
            .(ObjectLiteralNode)
            .getAPropertySource("frameOptions")
            .asExpr()
            .(StringLiteral)
            .getValue()
      or
      /*
       * ```js
       * window["sap-ui-config"].frameOptions = 'trusted';
       * ```
       */

      exists(PropWrite windowFrameOptions |
        windowDecl.getALocalSource().flowsTo(windowFrameOptions) and
        result = windowFrameOptions.getRhs().asExpr().(StringLiteral).getValue()
      )
    )
  }

  predicate allowsSharedOriginEmbedding() { this.getHtmlFrameOptions() = "trusted" }

  predicate deniesEmbedding() { this.getHtmlFrameOptions() = "deny" }

  predicate allowsAllOriginEmbedding() { this.getHtmlFrameOptions() = "allow" }

  Location getLocation() {
    result = this.asHtmlFrameOptions().getLocation()
    or
    result = this.asJsFrameOptions().asExpr().getLocation()
  }

  string toString() {
    result = this.asHtmlFrameOptions().toString() or
    result = this.asJsFrameOptions().toString()
  }
}

/**
 * Holds if the frame options are left untouched as the default value `trusted`.
 */
predicate thereIsNoFrameOptionSet(UI5::Project p) {
  not exists(FrameOptions frameOptions | p.isInThisProject(frameOptions.getLocation().getFile()) |
    frameOptions.allowsSharedOriginEmbedding() or
    frameOptions.deniesEmbedding() or
    frameOptions.allowsAllOriginEmbedding()
  )
}
