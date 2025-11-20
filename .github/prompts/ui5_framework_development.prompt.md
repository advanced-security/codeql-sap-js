# UI5 Framework Development Prompt

This prompt provides guidance for developing CodeQL queries and library models for the SAPUI5 framework.

## Overview

SAPUI5 is a JavaScript framework for building enterprise web applications with MVC architecture. This prompt helps model UI5-specific security patterns.

## UI5 Framework Basics

### Key Concepts

1. **MVC Architecture**: Views (XML/JS/HTML), Controllers (JS), Models (JSON/OData/XML)
2. **Data Binding**: Declarative binding in XML views using `{...}` syntax
3. **Controls**: UI components like sap.m.Button, sap.m.Input
4. **Routing**: Navigation between views with parameters

### Common Vulnerability Patterns

1. **XSS in View Rendering**: Unsafe HTML content in controls
2. **Path Injection**: User-controlled resource paths
3. **Formula Injection**: Unsafe data in Excel exports
4. **Log Injection**: Unvalidated data in logging

## CodeQL Modeling Workflow

### 1. Model Remote Flow Sources

```ql
class UI5RouteParameter extends RemoteFlowSource {
  UI5RouteParameter() {
    exists(MethodCallExpr route |
      route.getMethodName() = "attachRouteMatched" and
      this = route.getArgument(0).(Function).getParameter(0)
    )
  }

  override string getSourceType() {
    result = "UI5 route parameter"
  }
}
```

### 2. Model View Bindings

UI5 XML views contain binding expressions that need special parsing:

```xml
<Input value="{/userInput}" />  <!-- Data binding -->
<HTML content="{/htmlContent}" /> <!-- XSS sink -->
```

The `BindingStringParser.qll` parses these expressions.

### 3. Model Sinks

```ql
class UI5HtmlContentSink extends Sink {
  UI5HtmlContentSink() {
    exists(MethodCallExpr call |
      call.getReceiver().getType().hasQualifiedName("sap.ui.core.HTML") and
      call.getMethodName() = "setContent" and
      this = call.getArgument(0)
    )
  }
}
```

## Testing Best Practices

Include both Controller.js and View.xml files in tests:

```
test/xss/
├── Controller.controller.js
├── View.view.xml
├── xss.ql
└── xss.expected
```

## Validation Checklist

- [ ] Tests include both JS and XML files
- [ ] Binding expression parsing tested
- [ ] Tests pass: `codeql test run`
- [ ] Query formatted and compiled
- [ ] Expected results verified

## Related Resources

- SAPUI5 SDK: https://sapui5.hana.ondemand.com/
- UI5 Data Binding: https://sapui5.hana.ondemand.com/#/topic/68b9644a253741e8a4b9e4279a35c247
