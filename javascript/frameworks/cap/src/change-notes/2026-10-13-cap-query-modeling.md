---
category: majorAnalysis
---

* Improved `js/cap-sql-injection` to detect user-controlled structural arguments in CAP CQL queries.
* Improved `js/cap-sensitive-log` to track sensitive CAP query results while respecting explicit column projections, including `SELECT.from(entity, key, columns)` overloads, column lists held in variables, string literals inside projection strings, nested expansions such as `manager { userId }`, and computed columns such as `lower(email) as lowerEmail`.
* Improved `js/cap-sensitive-log` to follow query results through array elements, including computed indexes, `for...of` loops, and array methods such as `map`, `filter`, and `find`.
