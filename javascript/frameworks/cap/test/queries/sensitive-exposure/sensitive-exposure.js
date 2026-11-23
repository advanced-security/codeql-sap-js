import cds from '@sap/cds'
const LOG = cds.log('logger')

export async function logData(projection) {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const author = await SELECT.one.from(Authors)
  LOG.info(Authors.email, author.ID, author.disabled)
  LOG.info(JSON.stringify(author))
  LOG.info(author.profile_selected)
  const owner = await SELECT.one.from(Authors).columns`{ manager_userId as personal, manager_publicId as safeId }`
  LOG.info(owner.personal, owner.safeId)
  const navigation = await SELECT.one.from(Authors).columns('manager.userId as chosen', { ref: ['manager', 'publicId'], as: 'safe' })
  LOG.info(navigation)
  const expanded = await SELECT.one.from(Authors).columns({ ref: ['manager'], expand: [{ ref: ['userId'] }] })
  LOG.info(expanded)
  const inline = await SELECT.one.from(Authors).columns({ ref: ['manager'], inline: [{ ref: ['userId'], as: 'chosen' }, { ref: ['publicId'] }] })
  LOG.info(inline.chosen, inline.publicId)
  LOG.info(inline.manager_chosen, inline.manager_publicId)
  const unknown = await SELECT.one.from(Authors).columns([projection, { ref: ['ID'] }])
  LOG.info(unknown, unknown.email)
  const safe = await SELECT.one.from(Authors).columns(['ID']).where('ID in', SELECT.from(Authors).columns('email'))
  LOG.info(safe, { ID: author.ID })
}

export async function selectByKey(id) {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const keyed = await SELECT.one.from(Authors, id)
  LOG.info(keyed)
  const keyedId = await SELECT.one.from(Authors, 1, 'ID')
  LOG.info(keyedId)
  const keyedEmail = await SELECT.one.from(Authors, id, ['email'])
  LOG.info(keyedEmail)
  const projectedId = await SELECT.one.from(Authors, ['ID'])
  LOG.info(projectedId)
  const projectedEmail = await SELECT.one.from(Authors, ['email'])
  LOG.info(projectedEmail)
}

export async function selectExpressions() {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const lowered = await SELECT.one.from(Authors).columns('lower(email) as lowerEmail')
  LOG.info(lowered.lowerEmail)
  const overSafe = await SELECT.one.from(Authors).columns('lower(email) as ID')
  LOG.info(overSafe.ID)
  const joined = await SELECT.one.from(Authors).columns('concat(ID, email) as label')
  LOG.info(joined.label)
  const nested = await SELECT.one.from(Authors).columns('{ ID, lower(trim(email)) as trimmed }')
  LOG.info(nested.trimmed)
  const unaliased = await SELECT.one.from(Authors).columns('lower(email)')
  LOG.info(unaliased.lower)
  const objectForm = await SELECT.one.from(Authors).columns({ func: 'lower', args: [{ ref: ['email'] }], as: 'lowerEmail' })
  LOG.info(objectForm.lowerEmail)
  const safeExpression = await SELECT.one.from(Authors).columns('upper(ID) as upperId')
  LOG.info(safeExpression.upperId)
  const safeOverSensitive = await SELECT.one.from(Authors).columns('upper(ID) as email')
  LOG.info(safeOverSensitive.email)
}

export async function selectWithColumnsVariable() {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const safeColumns = ['ID']
  const safe = await SELECT.one.from(Authors, safeColumns)
  LOG.info(safe)
  const columns = ['email']
  const selected = await SELECT.one.from(Authors, columns)
  LOG.info(selected.email)
  const viaClause = await SELECT.one.from(Authors).columns(columns)
  LOG.info(viaClause.email)
  const columnList = '{ email as contact }'
  const viaString = await SELECT.one.from(Authors).columns(columnList)
  LOG.info(viaString.contact, viaString.email)
  const field = 'email'
  const viaField = await SELECT.one.from(Authors, [field])
  LOG.info(viaField.email)
}

export async function selectWithLiterals() {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const commaLiteral = await SELECT.one.from(Authors).columns("{ email, 'public,email' as label }")
  LOG.info(commaLiteral.email, commaLiteral.label)
  const parenLiteral = await SELECT.one.from(Authors).columns("{ concat(ID, ')') as closing, email }")
  LOG.info(parenLiteral.email, parenLiteral.closing)
  const braceLiteral = await SELECT.one.from(Authors).columns("{ email, '{}' as label }")
  LOG.info(braceLiteral.email, braceLiteral.label)
  const unwrapped = await SELECT.one.from(Authors).columns("email, '}' as closing")
  LOG.info(unwrapped.email, unwrapped.closing)
}

export async function selectCollectionElements(index) {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const authors = await SELECT.from(Authors)
  LOG.info(authors[index].email, authors[index].ID)
  LOG.info(authors[index])
  for (const entry of authors) LOG.info(entry.email, entry.ID)
  for (const { email, ID } of authors) LOG.info(email, ID)
  LOG.info(authors.filter(candidate => candidate.ID).pop().email)
  authors.some(candidate => LOG.info(candidate.email))
}

export async function selectThroughHelpers() {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const author = await SELECT.one.from(Authors)
  LOG.info(pickEmail(author), getId(author))
  LOG.info(same(author))
  LOG.info(same({ email: 'public' }), pickEmail({ email: 'public' }))
  const authors = await SELECT.from(Authors)
  authors.map(pickEmail)
}

function pickEmail(record) { return record.email }

function getId(record) { return record.ID }

function same(record) { return record }

export async function selectWithNestedBlocks() {
  const { Authors } = cds.entities('advanced_security.log_exposure.sample_entities')
  const siblings = await SELECT.one.from(Authors).columns("{ ID, manager { name, email, userId } }")
  LOG.info(siblings.email)
  const nestedFirst = await SELECT.one.from(Authors).columns("manager { name }, email")
  LOG.info(nestedFirst.email)
}
