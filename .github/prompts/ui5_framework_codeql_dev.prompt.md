```prompt
# UI5 Framework CodeQL Query Development

Guidelines for developing CodeQL security queries that detect vulnerable code patterns in SAPUI5 applications.

## Query File Structure

Query files (`.ql`) belong in `javascript/frameworks/ui5/src/<VulnCategory>/`:

```
javascript/frameworks/ui5/src/
├── UI5Xss/
│   └── UI5Xss.ql
├── UI5LogInjection/
│   ├── UI5LogInjection.ql
│   ├── UI5LogsToHttp.ql
│   └── UI5UnsafeLogAccess.ql
├── UI5PathInjection/
│   └── UI5PathInjection.ql
└── UI5FormulaInjection/
    └── UI5FormulaInjection.ql
```

## Query Template

Minimal `.ql` file imports library, instantiates flow, and selects results:

```ql
/**
 * @name UI5 <Vulnerability Type>
 * @description <Brief description of the vulnerability>
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.8
 * @precision high
 * @id js/ui5-<query-id>
 * @tags security
 *       external/cwe/cwe-<number>
 */

import javascript
import advanced_security.javascript.frameworks.ui5.dataflow.DataFlow
import advanced_security.javascript.frameworks.ui5.<QueryLib>

module <QueryName>Flow = TaintTracking::Global<<QueryName>>;

module <QueryName>UI5PathGraph = UI5PathGraph<<QueryName>Flow::PathNode, <QueryName>Flow::PathGraph>;

import <QueryName>UI5PathGraph

from
  <QueryName>UI5PathGraph::UI5PathNode source, <QueryName>UI5PathGraph::UI5PathNode sink,
  <QueryName>UI5PathGraph::UI5PathNode primarySource, <QueryName>UI5PathGraph::UI5PathNode primarySink
where
  <QueryName>Flow::flowPath(source.getPathNode(), sink.getPathNode()) and
  <QueryName>::isSource(source.asDataFlowNode()) and
  <QueryName>::isSink(sink.asDataFlowNode()) and
  primarySource = source.getAPrimarySource() and
  primarySink = sink.getAPrimarySink()
select primarySink, primarySource, primarySink, "<Message> due to $@.", primarySource,
  "user-provided value"
```

## Key Implementation Patterns

### 1. Query Delegates to Library

Keep `.ql` files minimal - core logic belongs in `.qll` library file:

```ql
// UI5Xss.ql - delegates to UI5XssQuery.qll
import advanced_security.javascript.frameworks.ui5.UI5XssQuery

module UI5XssFlow = TaintTracking::Global<UI5Xss>;
```

### 2. Use UI5PathGraph for Data Flow Visualization

The `UI5PathGraph` module translates between CodeQL and UI5-specific source/sink:

```ql
module UI5XssUI5PathGraph = UI5PathGraph<UI5XssFlow::PathNode, UI5XssFlow::PathGraph>;

import UI5XssUI5PathGraph
```

### 3. Query Metadata

Required query metadata fields:

| Field | Example | Description |
|-------|---------|-------------|
| `@name` | UI5 Client-side cross-site scripting | Human-readable name |
| `@description` | Writing user input... | Clear vulnerability description |
| `@kind` | `path-problem` | Usually `path-problem` for taint tracking |
| `@problem.severity` | `error` / `warning` / `recommendation` | Alert severity |
| `@security-severity` | `7.8` | CVSS-style score |
| `@precision` | `high` / `medium` / `low` | False positive rate |
| `@id` | `js/ui5-xss` | Unique query identifier |
| `@tags` | `security`, `external/cwe/cwe-079` | Categorization and CWE mapping |

## Vulnerability Categories

### XSS (js/ui5-xss)
- **CWE:** CWE-79, CWE-116
- **Sources:** Remote flow sources, user input controls (`sap.m.Input.getValue()`)
- **Sinks:** `sap.ui.core.HTML.setContent()`, `sap.m.FormattedText.setHtmlText()`, RenderManager methods

### Log Injection (js/ui5-log-injection)
- **CWE:** CWE-117
- **Sources:** Remote flow sources
- **Sinks:** `Log.error()`, `Log.warning()`, `Log.info()`, `Log.debug()`

### Path Injection (js/ui5-path-injection)
- **CWE:** CWE-22, CWE-73
- **Sources:** Remote flow sources, user-controlled paths
- **Sinks:** `Fragment.load({name: ...})`, view/component loading

### Formula Injection (js/ui5-formula-injection)
- **CWE:** CWE-1236
- **Sources:** Remote flow sources
- **Sinks:** Excel/CSV export controls with user data

## Real-World Vulnerability Patterns

Reference `has-ghas/ui5-juice-shop` for implemented vulnerability examples:

### XSS via HTML Control
```typescript
// Source: user input
const userHtml = this.byId("inputField").getValue();
// Sink: HTML control
const htmlControl = this.byId("htmlDisplay") as HTML;
htmlControl.setContent(userHtml); // XSS vulnerability
```

### Log Injection
```typescript
// Source: user input
const userMessage = this.byId("logInput").getValue();
// Sink: Log method
Log.error("User action: " + userMessage); // Log injection
```

### Fragment Path Injection
```typescript
// Source: user-controlled fragment name
const fragmentName = this.byId("fragmentInput").getValue();
// Sink: Fragment.load
const fragment = await Fragment.load({
  name: "com.app.view.fragment." + fragmentName // Path injection
});
```

## Development Workflow

1. **Identify vulnerability pattern** - Document source, sink, and data flow
2. **Create library module** - Implement `DataFlow::ConfigSig` in `.qll` file
3. **Create minimal query** - `.ql` file imports library and selects results
4. **Write test cases** - Create test directory with vulnerable code
5. **Validate with tests** - Use `mcp_ql-mcp_codeql_test_run` (or `codeql test run`) and verify results

## Related Resources

- [UI5 Library Modeling Prompt](ui5_framework_codeql_lib.prompt.md) - Library implementation details
- [UI5 Testing Prompt](ui5_framework_codeql_test.prompt.md) - Test case development
- [CodeQL Test Commands](codeql_test_commands.prompt.md) - Testing workflow
```
