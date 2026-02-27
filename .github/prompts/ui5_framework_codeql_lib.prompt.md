```prompt
# UI5 Framework CodeQL Library Modeling

Guidelines for developing CodeQL library models (`.qll` files) that define sources, sinks, and taint steps for SAPUI5 security analysis.

## Library File Structure

Library files belong in `javascript/frameworks/ui5/lib/advanced_security/javascript/frameworks/ui5/`:

```
javascript/frameworks/ui5/lib/advanced_security/javascript/frameworks/ui5/
├── UI5.qll                    # Core UI5 modeling
├── UI5View.qll                # XML/JSON view modeling
├── Bindings.qll               # Data binding modeling
├── BindingStringParser.qll    # Binding expression parsing
├── RemoteFlowSources.qll      # UI5-specific sources
├── UI5XssQuery.qll            # XSS query configuration
├── UI5LogInjectionQuery.qll   # Log injection config
├── UI5PathInjectionQuery.qll  # Path injection config
├── UI5FormulaInjectionQuery.qll # Formula injection config
├── UI5LogsToHttpQuery.qll     # Logs-to-HTTP config
├── UI5UnsafeLogAccessQuery.qll # Unsafe log access config
└── dataflow/
    └── DataFlow.qll           # UI5-aware data flow
```

## Query Library Template

Each query has a corresponding `*Query.qll` library that implements `DataFlow::ConfigSig`:

```ql
import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
// Import relevant standard library components as needed

module <QueryName> implements DataFlow::ConfigSig {
  /**
   * Identifies taint sources for this vulnerability pattern.
   */
  predicate isSource(DataFlow::Node node) {
    node instanceof RemoteFlowSource
    or
    // Add UI5-specific sources
  }

  /**
   * Identifies sanitizers that prevent the vulnerability.
   */
  predicate isBarrier(DataFlow::Node node) {
    // Sanitization functions, encoding, validation
  }

  /**
   * Identifies vulnerable sinks.
   */
  predicate isSink(DataFlow::Node node) {
    node = ModelOutput::getASinkNode("<sink-model-name>").asSink()
    or
    // Add explicit sink patterns
  }

  /**
   * Additional taint propagation steps beyond standard flow.
   */
  predicate isAdditionalFlowStep(DataFlow::Node start, DataFlow::Node end) {
    // UI5-specific data flow steps
  }
}
```

## Key Modeling Patterns

### 1. Remote Flow Sources

Model UI5-specific user input sources:

```ql
// Route parameters
class UI5RouteParameter extends RemoteFlowSource {
  UI5RouteParameter() {
    exists(MethodCallExpr route |
      route.getMethodName() = "attachRouteMatched" and
      this = route.getArgument(0).(Function).getParameter(0)
    )
  }
  override string getSourceType() { result = "UI5 route parameter" }
}

// Input control values
class UI5InputSource extends RemoteFlowSource {
  UI5InputSource() {
    exists(MethodCallExpr call |
      call.getMethodName() = "getValue" and
      call.getReceiver().getType().hasQualifiedName("sap.m.Input") and
      this = call
    )
  }
  override string getSourceType() { result = "UI5 input control value" }
}
```

### 2. Sink Modeling

Model dangerous API calls as sinks:

```ql
// HTML content injection sink
class UI5HtmlContentSink extends DataFlow::Node {
  UI5HtmlContentSink() {
    exists(MethodCallExpr call |
      call.getReceiver().getType().hasQualifiedName("sap.ui.core.HTML") and
      call.getMethodName() = "setContent" and
      this = call.getArgument(0)
    )
  }
}

// Log method sink
class UI5LogSink extends DataFlow::Node {
  UI5LogSink() {
    exists(MethodCallExpr call |
      call.getReceiver().getType().hasQualifiedName("sap.base.Log") and
      call.getMethodName() = ["error", "warning", "info", "debug"] and
      this = call.getAnArgument()
    )
  }
}
```

### 3. Sanitizer/Barrier Modeling

Model functions that prevent vulnerabilities:

```ql
predicate isBarrier(DataFlow::Node node) {
  // SAP encoding functions
  exists(SapDefineModule d, DataFlow::ParameterNode par |
    node = par.getACall() and
    par = d.getRequiredObject("sap/base/security/" +
        ["encodeCSS", "encodeJS", "encodeURL", "encodeXML", "encodeHTML"])
        .asSourceNode()
  )
  or
  // jQuery.sap encoding
  node.(DataFlow::CallNode).getReceiver().asExpr().(PropAccess).getQualifiedName() = "jQuery.sap" and
  node.(DataFlow::CallNode).getCalleeName() =
    ["encodeCSS", "encodeJS", "encodeURL", "encodeXML", "encodeHTML"]
}
```

### 4. Additional Flow Steps

Model UI5-specific taint propagation:

```ql
predicate isAdditionalFlowStep(DataFlow::Node start, DataFlow::Node end) {
  // Handler argument to handler parameter
  exists(UI5Handler h |
    start = h.getBindingPath().getNode() and
    end = h.getParameter(0)
  )
  or
  // Model property flow
  exists(UI5Model model |
    start = model.getSetPropertyValue() and
    end = model.getGetPropertyResult()
  )
}
```

## Model Extension Files

Use `*.model.yml` files in `javascript/frameworks/ui5/ext/` for extensible sink/source definitions:

```yaml
extensions:
  - addsTo:
      pack: advanced-security/javascript-ui5-lib
      extensible: ui5-html-injection
    data:
      - ["Member[setContent].Argument[0]", "ui5-html-injection"]
      - ["Member[setHtmlText].Argument[0]", "ui5-html-injection"]
```

## UI5 View Modeling

The `UI5View.qll` library models XML views and data bindings:

```ql
class UI5View extends XmlFile {
  UI5View() {
    this.getAbsolutePath().matches("%.view.xml")
  }

  UI5BoundNode getAnHtmlISink() {
    result.getBindingPath().getControlProperty().isHtmlISink()
  }
}
```

## Data Binding Expression Parsing

`BindingStringParser.qll` parses UI5 binding expressions:

```xml
<Input value="{/userInput}" />  <!-- Data binding source -->
<HTML content="{/htmlContent}" /> <!-- Potential XSS sink -->
```

The parser extracts binding paths and connects them to model data flow.

## Implementation Examples

### XSS Query Library (UI5XssQuery.qll)

```ql
module UI5Xss implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node start) {
    DomBasedXss::DomBasedXssConfig::isSource(start, _)
    or
    start instanceof RemoteFlowSource
  }

  predicate isBarrier(DataFlow::Node node) {
    DomBasedXss::DomBasedXssConfig::isBarrier(node)
    or
    exists(SapDefineModule d, DataFlow::ParameterNode par |
      node = par.getACall() and
      par = d.getRequiredObject("sap/base/security/encodeXML").asSourceNode()
    )
  }

  predicate isSink(DataFlow::Node node) {
    node instanceof UI5ExtHtmlISink or
    node instanceof UI5ModelHtmlISink
  }
}
```

### Log Injection Query Library (UI5LogInjectionQuery.qll)

```ql
module UI5LogInjection implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof RemoteFlowSource }

  predicate isBarrier(DataFlow::Node node) { LogInjectionConfig::isBarrier(node) }

  predicate isSink(DataFlow::Node node) {
    node = ModelOutput::getASinkNode("ui5-log-injection").asSink()
  }
}
```

## Development Best Practices

1. **Reuse Standard Library** - Extend `DomBasedXssConfig`, `LogInjectionConfig`, etc.
2. **Model UI5 Specifics** - Add UI5-specific sources, sinks, and flow steps
3. **Use Type Models** - Leverage `typeModel()` for control type identification
4. **Document Complex Logic** - Comment binding expression parsing and view modeling
5. **Test Incrementally** - Validate each predicate with targeted test cases

## Related Resources

- [UI5 Query Development Prompt](ui5_framework_codeql_dev.prompt.md) - Query file structure
- [UI5 Testing Prompt](ui5_framework_codeql_test.prompt.md) - Test case development
- [UI5 Framework Development](ui5_framework_development.prompt.md) - General UI5 context
```
