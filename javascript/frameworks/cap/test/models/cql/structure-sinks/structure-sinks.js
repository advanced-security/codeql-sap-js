const entity = 'Authors'
const columns = ['ID', 'name']
const condition = 'ID > 0'
const grouping = 'name'
const ordering = 'name asc'

SELECT.from(entity).columns(columns).where(condition).groupBy(grouping).orderBy(ordering)
