# XSJS Framework Development Prompt

This prompt provides guidance for developing CodeQL queries and library models for the SAP XSJS (XS JavaScript) framework.

## Overview

XSJS is SAP's server-side JavaScript runtime for HANA. This prompt helps model XSJS-specific security patterns.

## XSJS Framework Basics

### Key Concepts

1. **$.request**: HTTP request object with parameters, body, entities
2. **$.response**: HTTP response object for writing output
3. **$.db**: Database connection API
4. **$.session**: Session management

### Common Vulnerability Patterns

1. **SQL Injection**: Unsafe queries via $.db.getConnection()
2. **XSS**: Unvalidated output to $.response
3. **Path Injection**: User-controlled file paths

## CodeQL Modeling Workflow

### 1. Model Remote Flow Sources

```ql
class XsjsRequestParameter extends RemoteFlowSource {
  XsjsRequestParameter() {
    exists(PropAccess access |
      access.getBase().(PropAccess).getBase().(GlobalVarAccess).getName() = "$" and
      access.getBase().(PropAccess).getPropertyName() = "request" and
      access.getPropertyName() in ["parameters", "body", "entities"]
    )
  }

  override string getSourceType() {
    result = "XSJS request parameter"
  }
}
```

### 2. Model Sinks

```ql
class XsjsSqlInjectionSink extends SqlInjection::Sink {
  XsjsSqlInjectionSink() {
    exists(MethodCallExpr call |
      call.getMethodName() = "executeQuery" and
      this = call.getArgument(0)
    )
  }
}
```

## Testing Best Practices

Create .xsjs files for tests:

```javascript
// test.xsjs
var userInput = $.request.parameters.get("id");
var query = "SELECT * FROM users WHERE id = '" + userInput + "'";
var conn = $.db.getConnection();
conn.executeQuery(query);
```

## Validation Checklist

- [ ] Tests use .xsjs extension
- [ ] XSJS-specific APIs modeled
- [ ] Tests pass: `codeql test run`
- [ ] Query formatted and compiled

## Related Resources

- XSJS API Reference: SAP HANA Developer Guide
