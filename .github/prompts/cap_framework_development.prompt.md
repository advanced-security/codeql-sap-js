# CAP Framework Development Prompt

This prompt provides comprehensive guidance for developing CodeQL queries and library models for the SAP Cloud Application Programming (CAP) framework.

## Overview

CAP is a framework for building enterprise-grade services and applications. This prompt helps you model CAP-specific patterns in CodeQL to detect security vulnerabilities.

## CAP Framework Documentation

When working with CAP framework modeling, reference these official documentation resources:

### Core Concepts
- [CAP Best Practices](https://cap.cloud.sap/docs/about/best-practices) - Recommended patterns and approaches
- [CAP Bad Practices](https://cap.cloud.sap/docs/about/bad-practices) - Anti-patterns to avoid
- [Conceptual Definition Language (CDL)](https://cap.cloud.sap/docs/cds/cdl) - Domain modeling language
- [Principles of CDS Models](https://cap.cloud.sap/docs/cds/models) - Model structure and organization

### CDS Language & Schema
- [CDS Core Schema Notation (CSN)](https://cap.cloud.sap/docs/cds/csn) - Core schema representation
- [CDS Expression Notation (CXN)](https://cap.cloud.sap/docs/cds/cxn) - Expression syntax
- [CDS Core / Built-in Types](https://cap.cloud.sap/docs/cds/types) - Type system
- [CDS Common Reuse Types and Aspects](https://cap.cloud.sap/docs/cds/common) - Reusable components
- [CDS Common Annotations](https://cap.cloud.sap/docs/cds/annotations) - Metadata annotations
- [CDS Compiler Messages](https://cap.cloud.sap/docs/cds/compiler/messages) - Compiler diagnostics
- [CDS Aspect Oriented Modeling](https://cap.cloud.sap/docs/cds/aspects) - Cross-cutting concerns

### Node.js Runtime
- [CAP Node.js `cds` facade object](https://cap.cloud.sap/docs/node.js/cds-facade) - Main API interface
- [CAP Node.js Best Practices](https://cap.cloud.sap/docs/node.js/best-practices) - Runtime patterns
- [CAP Node.js Authentication](https://cap.cloud.sap/docs/node.js/authentication) - Security guide
- [CAP Node.js Transaction Management](https://cap.cloud.sap/docs/node.js/cds-tx) - Database transactions

Use these resources to understand CAP/CDS patterns when modeling security vulnerabilities.

## Agent Goals for CAP Framework Modeling

When working with CAP framework CodeQL queries and libraries, focus on these primary objectives:

### 1. Identify and Fix Modeling Gaps
- Review existing CodeQL library modeling in `javascript/frameworks/cap/lib/`
- Identify missing or incomplete models for CAP/CDS APIs, annotations, and patterns
- Extend models to cover additional CAP framework components
- Ensure accurate modeling of data flow through CAP event handlers and services

### 2. Create and Improve Test Cases
- Develop **COMPLIANT** test cases showing correct/safe CAP usage patterns
- Develop **NON_COMPLIANT** test cases demonstrating security vulnerabilities
- Ensure tests cover realistic CAP application scenarios
- Include both JavaScript service implementations and CDS schema definitions

### 3. Improve Existing Queries
- Enhance query performance (runtime efficiency)
- Reduce false positives while maintaining detection coverage
- Improve result precision and accuracy
- Only modify queries when specifically requested

### 4. Write New Queries
- Create queries for distinct problematic CAP/CDS patterns not covered by existing queries
- Focus on security vulnerabilities specific to CAP framework usage
- Ensure queries leverage CAP-specific library models
- Include comprehensive test coverage for new queries

## CAP Framework Basics

### Key Concepts

1. **CDS (Core Data Services)**: Domain modeling language
2. **Event Handlers**: Functions that handle service events (CREATE, READ, UPDATE, DELETE)
3. **Service Definitions**: Define service interfaces in .cds files
4. **Service Implementations**: JavaScript/TypeScript code implementing service logic

### Common Patterns

```javascript
// Event handler registration
srv.on('READ', 'Books', async (req) => {
  // req is a remote flow source
  const query = req.data.query; // Potentially tainted
});

// Alternative handler registration
srv.before('CREATE', 'Books', async (req) => {
  // Pre-processing logic
});

srv.after('READ', 'Books', async (data, req) => {
  // Post-processing logic
});
```

## CodeQL Modeling Workflow

### 1. Understand the Pattern

Before modeling, understand how the pattern works:

```bash
# Create test database and run query in one command
codeql test run javascript/frameworks/cap/test/example

# View test results
cat javascript/frameworks/cap/test/example/*.expected
```

### 2. Create Test Cases

Always create tests first:

```javascript
// javascript/frameworks/cap/test/sql-injection/test.js
const cds = require('@sap/cds');

module.exports = async (srv) => {
  srv.on('READ', 'Books', async (req) => {
    const userInput = req.data.title; // Source
    await srv.run(`SELECT * FROM Books WHERE title = '${userInput}'`); // Sink
  });
};
```

Expected results:
```
// javascript/frameworks/cap/test/sql-injection/sql-injection.expected
| test.js:5:12:5:59 | ... + ... | test.js:4:23:4:37 | req.data.title | This query depends on a $@. | test.js:4:23:4:37 | user-provided value | user-provided value |
```

### 3. Implement Remote Flow Sources

Model sources in `lib/.../RemoteFlowSources.qll`:

```ql
private import javascript

class CapEventHandlerParameter extends RemoteFlowSource {
  CapEventHandlerParameter() {
    exists(CallExpr call, Function handler |
      call.getCallee().(PropAccess).getPropertyName() = "on" and
      handler = call.getArgument(2) and
      this = handler.getParameter(0)
    )
  }

  override string getSourceType() {
    result = "CAP event handler request parameter"
  }
}
```

### 4. Model Additional Taint Steps

If needed, add taint steps in `lib/.../dataflow/FlowSteps.qll`:

```ql
private class CapRequestDataStep extends TaintTracking::AdditionalTaintStep {
  override predicate step(DataFlow::Node pred, DataFlow::Node succ) {
    exists(PropAccess access |
      access.getBase() = pred.asExpr() and
      access.getPropertyName() = "data" and
      succ.asExpr() = access
    )
  }
}
```

### 5. Test the Model

```bash
# Run tests (extracts database and runs query)
codeql test run javascript/frameworks/cap/test/sql-injection

# If results differ from expected, review them
cat javascript/frameworks/cap/test/sql-injection/*.actual

# Accept if correct
codeql test accept javascript/frameworks/cap/test/sql-injection
```

## Common CAP Patterns to Model

### Event Handler Registrations

```ql
class CapServiceEventHandler extends CallExpr {
  CapServiceEventHandler() {
    this.getCallee().(PropAccess).getPropertyName() in ["on", "before", "after"]
  }

  Function getHandler() {
    result = this.getArgument(2)
  }

  string getEventType() {
    result = this.getArgument(0).getStringValue()
  }
}
```

### CDS Service References

```ql
class CdsServiceReference extends Expr {
  CdsServiceReference() {
    exists(CallExpr require |
      require.getCallee().getName() = "require" and
      require.getArgument(0).getStringValue() = "@sap/cds" and
      this = require
    )
  }
}
```

## Testing Best Practices

1. **Realistic test cases**: Use actual CAP code patterns
2. **Both positive and negative cases**: Test what should and shouldn't alert
3. **Include CDS files**: When relevant to the pattern
4. **Document expected behavior**: Comment in test files why something should alert

## Validation Checklist

Before committing:

- [ ] Tests created in `javascript/frameworks/cap/test/`
- [ ] Tests pass: `codeql test run`
- [ ] Query formatted: `codeql query format --in-place`
- [ ] Query compiles: `codeql query compile`
- [ ] Expected results verified and accepted
- [ ] Documentation updated if needed

## Related Resources

- SAP CAP documentation: https://cap.cloud.sap/docs/
- CodeQL JavaScript library: https://codeql.github.com/codeql-standard-libraries/javascript/
- CodeQL taint tracking: https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/
