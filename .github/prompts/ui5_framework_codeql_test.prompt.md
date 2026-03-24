```prompt
# UI5 Framework CodeQL Unit Testing

Guidelines for creating unit tests for UI5 CodeQL queries and library models.

## Test Directory Structure

Test directories live under `javascript/frameworks/ui5/test/queries/<VulnCategory>/`:

```
javascript/frameworks/ui5/test/queries/
├── UI5Xss/
│   ├── xss-book-example/           # Test case directory
│   │   ├── UI5Xss.qlref            # Query reference file
│   │   ├── UI5Xss.expected         # Expected results
│   │   ├── ui5.yaml                # UI5 project config
│   │   ├── package.json            # npm dependencies
│   │   └── webapp/                 # Test source code
│   │       ├── controller/
│   │       ├── view/
│   │       └── Component.js
│   ├── xss-html-control-df/
│   └── ...
├── UI5LogInjection/
│   ├── log-html-control-df/
│   └── ...
└── UI5PathInjection/
    └── ...
```

## Required Test Files

### 1. `.qlref` File

References the query to test. Single line pointing to query:

```plaintext
UI5Xss/UI5Xss.ql
```

Path is relative to `javascript/frameworks/ui5/src/`.

### 2. `.expected` File

Contains expected query results. Format depends on query kind:

#### For `path-problem` Queries (Data Flow)

```plaintext
nodes
| webapp/controller/App.Controller.js:23:11:23:21 | searchValue |
| webapp/controller/App.Controller.js:23:25:23:47 | oSearch ... Value() |
| webapp/controller/App.Controller.js:27:34:27:44 | searchValue |
edges
| webapp/controller/App.Controller.js:23:11:23:21 | searchValue | webapp/controller/App.Controller.js:27:34:27:44 | searchValue |
| webapp/controller/App.Controller.js:23:25:23:47 | oSearch ... Value() | webapp/controller/App.Controller.js:23:11:23:21 | searchValue |
#select
| webapp/controls/Book.js:132:7:134:15 | "<div>T ... </div>" | webapp/controller/App.Controller.js:23:25:23:47 | oSearch ... Value() | webapp/controls/Book.js:132:7:134:15 | "<div>T ... </div>" | XSS vulnerability due to $@. | webapp/controller/App.Controller.js:23:25:23:47 | oSearch ... Value() | user-provided value |
```

#### Format Breakdown

- **`nodes`**: All data flow nodes in paths
- **`edges`**: Data flow steps between nodes
- **`#select`**: Final alert results (what appears in SARIF)

### 3. `ui5.yaml` File

UI5 project configuration:

```yaml
specVersion: "3.1"
type: application
metadata:
  name: test-app-name
framework:
  name: SAPUI5
  version: "1.120.0"
```

### 4. `package.json` File

Minimal npm configuration for extraction:

```json
{
  "name": "test-app-name",
  "version": "1.0.0"
}
```

### 5. `webapp/` Directory

Contains test source code demonstrating the vulnerability:

```
webapp/
├── Component.js          # UI5 Component (optional)
├── manifest.json         # App descriptor (optional)
├── controller/
│   └── App.controller.js # Controller with vulnerable code
├── view/
│   └── App.view.xml      # View with bindings
└── controls/             # Custom controls (if needed)
```

## Writing Test Code

### Vulnerable Code Pattern

Mark sources and sinks with comments:

```javascript
// controller/Vulnerable.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/HTML"
], function(Controller, HTML) {
  return Controller.extend("test.controller.Vulnerable", {
    onUserInput: function(oEvent) {
      // Source: user input from control
      var userInput = oEvent.getSource().getValue();  // Line X - SOURCE
      
      // Sink: HTML content injection
      var oHtml = this.byId("htmlDisplay");
      oHtml.setContent("<div>" + userInput + "</div>");  // Line Y - SINK
    }
  });
});
```

### Corresponding View

```xml
<!-- view/Vulnerable.view.xml -->
<mvc:View xmlns:mvc="sap.ui.core.mvc"
          xmlns="sap.m"
          xmlns:core="sap.ui.core"
          controllerName="test.controller.Vulnerable">
  <Page title="XSS Test">
    <Input id="userInput" change="onUserInput" />
    <core:HTML id="htmlDisplay" />
  </Page>
</mvc:View>
```

## Test Case Patterns

### Positive Test (Should Alert)

```javascript
// Source → Sink without sanitization
var userInput = oEvent.getSource().getValue();  // SOURCE
htmlControl.setContent(userInput);               // SINK - ALERT
```

### Negative Test (Should NOT Alert)

```javascript
// Source → Sanitizer → Sink
var userInput = oEvent.getSource().getValue();   // SOURCE
var sanitized = encodeXML(userInput);            // SANITIZER
htmlControl.setContent(sanitized);               // SAFE - NO ALERT
```

## Test-Driven Development Workflow

### Step 1: Create Test Directory

```bash
mkdir -p javascript/frameworks/ui5/test/queries/UI5Xss/xss-new-pattern
```

### Step 2: Create `.qlref` File

```bash
echo "UI5Xss/UI5Xss.ql" > javascript/frameworks/ui5/test/queries/UI5Xss/xss-new-pattern/UI5Xss.qlref
```

### Step 3: Create Test Code

Write vulnerable and safe code patterns in `webapp/`.

### Step 4: Create `.expected` File

**BEFORE running tests**, manually analyze code and predict results:

1. Identify source locations (line:col:line:col)
2. Trace data flow to sinks
3. Document all nodes and edges
4. Write final `#select` results

### Step 5: Run Test

```bash
# ql-mcp (preferred): use mcp_ql-mcp_codeql_test_run with tests array
# CLI fallback:
codeql test run javascript/frameworks/ui5/test/queries/UI5Xss/xss-new-pattern
```

### Step 6: Validate Results

If test passes: Implementation matches analysis.

If test fails: Compare `.expected` vs `.actual`:

```bash
diff javascript/frameworks/ui5/test/queries/UI5Xss/xss-new-pattern/UI5Xss.expected \
     javascript/frameworks/ui5/test/queries/UI5Xss/xss-new-pattern/UI5Xss.actual
```

### Step 7: Accept Results (After Review)

```bash
# ql-mcp (preferred): use mcp_ql-mcp_codeql_test_accept with tests array
# CLI fallback:
codeql test accept javascript/frameworks/ui5/test/queries/UI5Xss/xss-new-pattern
```

## Real-World Test Examples

Reference `has-ghas/ui5-juice-shop` for actual vulnerability patterns:

### XSS via HTML Control (PR #65)
- **Source**: `sap.m.Input.getValue()`
- **Sink**: `sap.ui.core.HTML.setContent()`
- **Flow**: User input → HTML control content

### Log Injection (PR #68)
- **Source**: `sap.m.Input.getValue()`
- **Sink**: `Log.error()`, `Log.warning()`
- **Flow**: User input → Log message

### Fragment Path Injection (PR #70)
- **Source**: User-controlled input
- **Sink**: `Fragment.load({name: ...})`
- **Flow**: User input → Fragment name path

## Expected File Format Reference

### Location Format

```
file.js:startLine:startCol:endLine:endCol
```

Example: `webapp/controller/App.js:23:11:23:21`

### Code Snippet Format

Long code is truncated with `...`:

```
"<div>T ... </div>"
```

### Multiple Alerts

Each alert on separate line in `#select`:

```plaintext
#select
| file1.js:10:5:10:20 | sink1 | file1.js:5:10:5:25 | source1 | file1.js:10:5:10:20 | sink1 | XSS vulnerability due to $@. | file1.js:5:10:5:25 | source1 | user-provided value |
| file2.js:15:5:15:20 | sink2 | file2.js:8:10:8:25 | source2 | file2.js:15:5:15:20 | sink2 | XSS vulnerability due to $@. | file2.js:8:10:8:25 | source2 | user-provided value |
```

## Common Test Issues

### Issue: No Results
- Check source is recognized as `RemoteFlowSource`
- Verify sink pattern matches library predicate
- Ensure test code compiles without errors

### Issue: Unexpected Flow Path
- Check for intermediate taint steps
- Verify no unintended barriers/sanitizers
- Review `isAdditionalFlowStep` predicates

### Issue: Location Mismatch
- Verify exact character positions
- Check for whitespace differences
- Use `codeql test accept` to update after review

## Related Resources

- [UI5 Query Development Prompt](ui5_framework_codeql_dev.prompt.md) - Query file structure
- [UI5 Library Modeling Prompt](ui5_framework_codeql_lib.prompt.md) - Library implementation
- [CodeQL Test Commands](codeql_test_commands.prompt.md) - Command reference
- [Test-Driven Development](test_driven_development.prompt.md) - TDD workflow
```
