SELECT.from('Authors', 1, 'ID').alias('a').columns('name').where('ID > 0').groupBy('ID').having('count(*) > 0').orderBy('ID').hints('IGNORE_PLAN_CACHE') // COMPLIANT
SELECT.one.from('Authors') // COMPLIANT
SELECT.distinct.from('Authors') // COMPLIANT
SELECT('ID').from('Authors') // COMPLIANT
INSERT.into('Books').columns('ID') // COMPLIANT
UPSERT.into('Books') // COMPLIANT
UPDATE('Books').set('stock = 0').where('ID = 1') // COMPLIANT
DELETE.from('Books').where('ID = 1') // COMPLIANT
const q = SELECT.from('Authors') // COMPLIANT
q.orderBy('name') // COMPLIANT
