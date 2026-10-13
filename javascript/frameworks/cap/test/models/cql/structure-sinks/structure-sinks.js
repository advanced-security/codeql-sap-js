const entity = 'Authors'
const columns = ['ID', 'name']
const condition = 'ID > 0'
const grouping = 'name'
const ordering = 'name asc'
const oneEntity = 'Authors'
const distinctEntity = 'Authors'

SELECT.from(entity).columns(columns).where(condition).groupBy(grouping).orderBy(ordering)
SELECT.one.from(oneEntity)
SELECT.distinct.from(distinctEntity)
