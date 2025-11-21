# UI5 Framework Development Prompt

This prompt provides guidance for developing CodeQL queries and library models for the SAPUI5 framework.

## Overview

SAPUI5 is a JavaScript framework for building enterprise web applications with MVC architecture. This prompt helps model UI5-specific security patterns.

## UI5 Framework Documentation

When working with UI5 framework modeling, reference these official documentation resources:

### Core References
- [SAPUI5 SDK API Reference](https://sapui5.hana.ondemand.com/sdk/#/api) - Complete API documentation
- [SAPUI5 Documentation](https://sapui5.hana.ondemand.com/) - Main documentation portal
- [UI5 Developer Guide](https://sapui5.hana.ondemand.com/sdk/#/topic) - Development topics and guides

### Key Topics for Security Modeling
- [Data Binding](https://sapui5.hana.ondemand.com/#/topic/68b9644a253741e8a4b9e4279a35c247) - Data binding concepts and syntax
- [XML Views](https://sapui5.hana.ondemand.com/#/topic/2d3eb2f322ea4a82983c1c62a33ec4ae) - Declarative view definitions
- [Controllers](https://sapui5.hana.ondemand.com/#/topic/121b8e6337d147af9819129e428f1f75) - Controller implementation
- [Models](https://sapui5.hana.ondemand.com/#/topic/e1b625940c104b558e52f47afe5ddb4f) - Data models (JSON, OData, XML)
- [Routing and Navigation](https://sapui5.hana.ondemand.com/#/topic/3d18f20bd2294228acb6910d8e8a5fb5) - App navigation patterns
- [Security Guidelines](https://sapui5.hana.ondemand.com/#/topic/91f3768f6f4d1014b6dd926db0e91070) - Security best practices

### UI5 Controls Documentation
- [sap.m Controls](https://sapui5.hana.ondemand.com/sdk/#/api/sap.m) - Mobile controls library
- [sap.ui.core](https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.core) - Core UI5 functionality
- [sap.ui.table](https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui.table) - Table controls

Use these resources to understand UI5 patterns when modeling security vulnerabilities.

## Agent Goals for UI5 Framework Modeling

Focus on security vulnerabilities specific to UI5:

### 1. XSS Vulnerabilities
- Model unsafe HTML content rendering in controls
- Track tainted data through data binding expressions
- Identify unsafe use of `sap.ui.core.HTML` and similar controls

### 2. Path Injection
- Model user-controlled resource loading paths
- Track tainted paths in component and view loading

### 3. Formula Injection
- Identify unsafe data in Excel/CSV exports
- Model data export control usage patterns

### 4. Data Binding Expression Injection
- Parse and analyze binding expressions in XML views
- Identify injection risks in binding syntax

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
