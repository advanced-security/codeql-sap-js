# Test-Driven Development (TDD) for CodeQL

This prompt defines the test-driven development workflow for all CodeQL query and library development across SAP frameworks (CAP, UI5, XSJS, etc.).

## TDD Workflow for New Queries/Models

When creating **new** queries or library models, follow this workflow:

### Step 1: Document Detection Target

Clearly define what the query/model should detect:

```markdown
## Detection Goal
Pattern: [Specific vulnerability or API pattern]
Source: [Where tainted/interesting data originates]
Sink: [Where the vulnerability manifests or API is called]
Expected Results: [Number and type of expected alerts/matches]
```

### Step 2: Create Test Code

Write realistic test cases demonstrating the pattern:
- Include **positive cases** (should alert/match)
- Include **negative cases** (should NOT alert/match)
- Use realistic framework-specific patterns
- Comment source and sink locations with line numbers

### Step 3: Generate `.expected` File

**CRITICAL:** Create the `.expected` file BEFORE implementing the query/model.

Manually analyze the test code and predict results:

#### For Model Tests (Library `.qll` files):

Format: Each line represents one matched instance
```
| <location> | <context> | <location> | <code_representation> |
```

Example:
```
| test.js:5:10:5:25 | test.js:5 | test.js:5:10:5:25 | INSERT.into(Table) |
| test.js:8:10:8:25 | test.js:8 | test.js:8:10:8:25 | INSERT.into(Table) |
```

#### For Query Tests (Security `.ql` files):

Format: Multiple sections showing data flow
```
edges
| <source_location> | <source_code> | <target_location> | <target_code> | provenance | <config> |
...

nodes
| <location> | <code> | semmle.label | <label> |
...

#select
| <alert_location> | <alert_element> | <source_location> | <source> | <sink_location> | <sink> | <message> | <link_location> | <link_element> | <link_text> |
```

**Analysis Process:**
1. Trace data flow from source to sink
2. Identify all intermediate flow steps for `edges`
3. List all nodes involved in flow for `nodes`
4. Write final alerts for `#select` section
5. Count expected alerts (lines in `#select`)

### Step 4: Implement Query/Model

Write the CodeQL code to detect the documented pattern:
- Implement sources, sinks, taint steps as needed
- Follow CodeQL best practices
- Add proper metadata and documentation

### Step 5: Run Tests

```bash
# Run test - provide path to test directory containing .qlref file
codeql test run <test-directory>
```

**Ideal Outcome:** Test passes immediately (actual == expected)

This indicates:
- Analysis was accurate
- Implementation is correct
- No need to accept results

### Step 6: Validate and Iterate

If test fails (actual != expected):

```bash
# View differences
diff <test-directory>/*.expected <test-directory>/*.actual
```

**Analyze discrepancies:**
- Extra results in actual → False positives, refine query
- Missing results in actual → False negatives, expand detection
- Wrong flow paths → Fix taint tracking logic

**Update `.expected` only if:**
- Initial analysis was incorrect
- You discovered edge cases not considered
- Framework behavior differs from assumption

### Step 7: Format and Finalize

```bash
# Format query files
codeql query format --in-place <query-file.ql>

# Verify tests still pass
codeql test run <test-directory>
```

## TDD Workflow for Existing Queries/Models

When modifying existing queries or models:

1. **Understand current behavior:**
   ```bash
   # Review existing tests
   find <framework-path>/test/ -type f -name "*.expected"
   cat <existing-test>/*.expected
   ```

2. **Make changes** to query/model

3. **Run tests:**
   ```bash
   codeql test run <test-directory>
   ```

4. **Review results:**
   ```bash
   cat <test-directory>/*.actual
   diff <test-directory>/*.expected <test-directory>/*.actual
   ```

5. **Accept if correct:**
   ```bash
   codeql test accept <test-directory>
   ```

## Key Principles

### For New Development:

- **ALWAYS** generate `.expected` file BEFORE implementing query/model
- **ALWAYS** analyze test code to predict results
- **ALWAYS** aim for tests to pass on first run
- **NEVER** blindly accept actual results without analysis

### For All Development:

- **ALWAYS** include both positive and negative test cases
- **ALWAYS** verify result count matches expectations
- **ALWAYS** validate data flow paths make logical sense
- **ALWAYS** format QL files before committing

### Constraints:

- **NEVER** run `codeql test accept` without reviewing `.actual` files
- **NEVER** commit failing tests
- **NEVER** skip test validation
- **NEVER** assume framework behavior - validate with CodeQL CLI

## Benefits of TDD Approach

1. **Better Understanding:** Forces analysis before implementation
2. **Fewer Iterations:** Correct implementation more likely on first try
3. **Documentation:** `.expected` file documents intended behavior
4. **Confidence:** Passing test on first run confirms correct analysis
5. **Regression Prevention:** Tests catch unintended changes

## Related Resources

- [CodeQL Test Commands](codeql_test_commands.prompt.md) - Command reference and `.expected` format details
- Framework-specific development prompts for detailed modeling examples
