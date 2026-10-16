# CQL query built from user-controlled sources

If a database query is built from user-provided data without sufficient sanitization, a malicious user may be able to run malicious database queries.

## Recommendation

CAP's intrinsic data querying engine is immune with regards to SQL injections that are introduced by query parameter values that are derived from malicious user input. CQL statements are transformed into prepared statements that are executed in SQL databases such as SAP HANA. 
Injections are still possible even via CQL when the query structure (e.g. target entity, columns etc.) is based on user input.

## Examples

This CAP application uses user submitted input as entity and column in a CQL query without any validation.

``` javascript
const entity = <from user input>
const column = <from user input>
SELECT.from(entity).columns(column)
```

## References

- OWASP: [SQL Injection](https://owasp.org/www-community/attacks/SQL_Injectionn).
- OWASP: [SQL Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
- SAP CAPire Documentation: [Security Aspects](https://cap.cloud.sap/docs/guides/security/aspects#common-injection-attacks).
