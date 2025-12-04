# XSJS Framework Development Prompt

This prompt provides guidance for developing CodeQL queries and library models for the SAP XSJS (XS JavaScript) framework.

## Overview

XSJS is SAP's server-side JavaScript runtime for HANA. This prompt helps model XSJS-specific security patterns.

## XSJS Framework Documentation

When working with XSJS framework modeling, reference these official documentation resources:

### Core References
- [SAP HANA XS JavaScript Reference](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/b907648a90cd49caabb30dc2d5a7de05.html) - Main API reference
- [XS JavaScript API Documentation](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/2b62a71581794f7ebc782da49d2c8d38.html) - Complete API docs

### Key APIs for Security Modeling
- [$.request Object](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/cd7dcc4a7e3d4f06b7e8f1f6f3e0f34f.html) - HTTP request handling
- [$.response Object](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/cd7dcc4a7e3d4f06b7e8f1f6f3e0f34f.html) - HTTP response writing
- [$.db Connection](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/cd7dcc4a7e3d4f06b7e8f1f6f3e0f34f.html) - Database access
- [$.session Object](https://help.sap.com/docs/SAP_HANA_PLATFORM/d89d4595fae647eabc14002c0340a999/cd7dcc4a7e3d4f06b7e8f1f6f3e0f34f.html) - Session management

Use these resources to understand XSJS patterns when modeling security vulnerabilities.

## Agent Goals for XSJS Framework Modeling

Focus on security vulnerabilities specific to XSJS:

### 1. SQL Injection
- Model unsafe database query construction
- Track tainted data from $.request to $.db operations
- Identify parameterized vs concatenated queries

### 2. XSS Vulnerabilities
- Model unsafe $.response output
- Track tainted data written to HTTP response
- Identify missing output encoding

### 3. Path Injection
- Model file system operations with user-controlled paths
- Track tainted paths in XSJS library access

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
