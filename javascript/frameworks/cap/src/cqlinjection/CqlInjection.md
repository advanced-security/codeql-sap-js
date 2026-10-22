# CQL query built from user-controlled sources

If a database query is built from user-provided data without sufficient sanitization, a malicious user may be able to run malicious database queries.

## Recommendation

CAP's intrinsic data querying engine is immune with regards to SQL injections that are introduced by query parameter values that are derived from malicious user input. CQL statements are transformed into prepared statements that are executed in SQL databases such as SAP HANA. 
Injections are still possible even via CQL when the query structure (e.g. target entity, columns etc.) is based on user input.

Pass user-controlled values separately from query text, using tagged templates or fixed-key object predicates where supported.

## Examples

This CAP application uses user submitted input as structural parts of a CQL
query without any validation.

``` javascript
const entity = <from user input>
const columns = <from user input>
const condition = <from user input>
const assignments = <from user input>
const groupBy = <from user input>
const orderBy = <from user input>
SELECT.from(entity).columns(columns).where(condition).groupBy(groupBy).orderBy(orderBy)
UPDATE(entity).set(assignments).where(condition)
```

Validate structural query inputs against fixed allow-lists.

For query values, use parameter binding rather than the allow-list validation needed for structural inputs. For example, `` .where`ID = ${id}` `` binds `id`, whereas `` .where(`ID = ${id}`) `` inserts it into the CQL text. Parenthesized calls such as `.where({ ID: id })` can still bind values safely.

## References

- OWASP: [SQL Injection](https://owasp.org/www-community/attacks/SQL_Injectionn).
- OWASP: [SQL Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
- SAP CAPire Documentation: [Security Aspects](https://cap.cloud.sap/docs/guides/security/aspects#common-injection-attacks).
