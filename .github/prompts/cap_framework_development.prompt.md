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

### TDD Approach for New Queries/Models

Follow this test-driven development approach:

### 1. Document Detection Goal

Clearly specify what the query/model should detect:

```markdown
## Detection Goal
Pattern: SQL injection via CAP srv.run() with user input
Source: req.data properties in event handlers
Sink: String argument to srv.run()
Expected Results: 2 alerts (positive cases), 0 alerts for sanitized input (negative case)
```

### 2. Create Test Code

Write test cases demonstrating both vulnerable and safe patterns:

```javascript
// javascript/frameworks/cap/test/queries/sql-injection/test.js
const cds = require('@sap/cds');

module.exports = async (srv) => {
  // POSITIVE CASE 1: Direct injection
  srv.on('READ', 'Books', async (req) => {
    const userInput = req.data.title; // Source at line 6
    await srv.run(`SELECT * FROM Books WHERE title = '${userInput}'`); // Sink at line 7
  });

  // POSITIVE CASE 2: Via variable
  srv.on('UPDATE', 'Books', async (req) => {
    const id = req.data.id; // Source at line 12
    const query = `DELETE FROM Books WHERE id = ${id}`; // Flow at line 13
    await srv.run(query); // Sink at line 14
  });

  // NEGATIVE CASE: Parameterized (safe)
  srv.on('DELETE', 'Books', async (req) => {
    await srv.run('SELECT * FROM Books WHERE id = ?', [req.data.id]); // Safe
  });
};
```

### 3. Generate `.expected` File BEFORE Implementation

Manually create the expected results based on your analysis:

**For Model Tests** (validating library modeling):
```
// javascript/frameworks/cap/test/models/cql/insert/insert.expected
| insert.js:2:14:5:2 | insert.js:2 | insert.js:2:14:5:2 | INSERT( ... " },\\n]) |
| insert.js:6:14:9:2 | insert.js:6 | insert.js:6:14:9:2 | INSERT( ... " },\\n]) |
```
Each line = one matched instance of the modeled API/pattern.

**For Query Tests** (validating security queries):

Analyze the test code to predict data flow:
- Line 6: `req.data.title` is the source
- Line 7: Template literal flows tainted data to `srv.run()` sink
- Line 12: `req.data.id` is another source
- Line 13: Assignment creates intermediate flow node
- Line 14: `srv.run(query)` is the sink
- Line 19: Safe case - should have NO alert

Create `.expected` file with predicted results:

```bash
cat > javascript/frameworks/cap/test/queries/sql-injection/sql-injection.expected << 'EOF'
edges
| test.js:6:18:6:32 | req.data.title | test.js:6:11:6:19 | userInput | provenance |  |
| test.js:6:11:6:19 | userInput | test.js:7:56:7:65 | userInput | provenance |  |
| test.js:12:15:12:23 | req.data.id | test.js:12:11:12:12 | id | provenance |  |
| test.js:12:11:12:12 | id | test.js:13:47:13:48 | id | provenance |  |
| test.js:13:11:13:15 | query | test.js:14:18:14:22 | query | provenance |  |

nodes
| test.js:6:18:6:32 | req.data.title | semmle.label | req.data.title |
| test.js:6:11:6:19 | userInput | semmle.label | userInput |
| test.js:7:56:7:65 | userInput | semmle.label | userInput |
| test.js:12:15:12:23 | req.data.id | semmle.label | req.data.id |
| test.js:12:11:12:12 | id | semmle.label | id |
| test.js:13:47:13:48 | id | semmle.label | id |
| test.js:13:11:13:15 | query | semmle.label | query |
| test.js:14:18:14:22 | query | semmle.label | query |

#select
| test.js:7:11:7:67 | srv.run(...) | test.js:6:18:6:32 | req.data.title | test.js:7:56:7:65 | userInput | This query depends on a $@. | test.js:6:18:6:32 | req.data.title | user-provided value |
| test.js:14:11:14:23 | srv.run(query) | test.js:12:15:12:23 | req.data.id | test.js:14:18:14:22 | query | This query depends on a $@. | test.js:12:15:12:23 | req.data.id | user-provided value |
EOF
```

**Key Analysis Points:**
- Count expected alerts: 2 (lines 6-7 and 12-14)
- Identify all flow steps for `edges` section
- Include all nodes in data flow for `nodes` section
- Format `#select` with proper message template

### 4. Implement the Query/Model

Now implement the CodeQL code to detect the pattern:

**For Remote Flow Sources** (`lib/.../RemoteFlowSources.qll`):

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
5. **Understand .expected files**:
   - Model tests: Count lines to verify all expected matches are found
   - Query tests: Focus on `#select` section for actual alerts
   - Validate data flow paths in `edges` section make logical sense
6. **Find existing tests**: Use `find javascript/frameworks/cap/ -type f -name "*.expected"` to locate similar tests

### Understanding Test Results

**Model Test Results** (`test/models/`):
- Simple output: one line per matched API usage
- Validates that library correctly identifies CAP/CDS patterns
- Example: Testing `CqlInsert` class finds all `INSERT.into()` calls

**Query Test Results** (`test/queries/`):
- Complex output with multiple sections:
  - `edges`: Shows data flow from source → sink
  - `nodes`: All intermediate taint tracking steps
  - `#select`: **Final alerts** (this is what users see)
- Validates end-to-end security vulnerability detection
- Count lines in `#select` to know how many alerts are expected

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
