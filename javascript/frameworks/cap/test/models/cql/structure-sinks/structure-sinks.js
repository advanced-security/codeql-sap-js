const entity = 'Authors'
const columns = ['ID', 'name']
const condition = 'ID > 0'
const grouping = 'name'
const ordering = 'name asc'
const oneEntity = 'Authors'
const distinctEntity = 'Authors'
const shortcutColumns = 'ID, name'
const shortcutEntity = 'Authors'
const having = 'count(*) > 0'
const multiHaving = 'count(*) >'

SELECT.from(entity).columns(columns).where(condition).groupBy(grouping).orderBy(ordering)
SELECT.one.from(oneEntity)
SELECT.distinct.from(distinctEntity)
SELECT(shortcutColumns).from(shortcutEntity)
SELECT.from(entity).having(having)
SELECT.from(entity).having(multiHaving, 1)
