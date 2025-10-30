const cds = require("@sap/cds");

const { read, readdir, append, write, copy, stat, find, mkdirp, rmdir, rimraf, rm } = cds.utils

let pkg = await read('package.json') // sink

let pdir = await readdir('package.json') // sink

let s = await stat('package.json') // sink

let f = await find('package.json') // sink

await append('db/data').to('dist/db/data')  // sink
await append('db/data', 'dist/db/data')  // sink

await copy('db/data').to('dist/db/data')  // sink
await copy('db/data', 'dist/db/data')  // sink

await write({ foo: 'bar' }).to('some/file.json') // sink
await write('some/file.json', { foo: 'bar' }) // sink

await mkdirp('dist', 'db', 'data') // sink
await mkdirp('dist/db/data') // sink

await rmdir('dist', 'db', 'data') // sink
await rmdir('dist/db/data') // sink

await rimraf('dist', 'db', 'data') // sink
await rimraf('dist/db/data') // sink

await rm('dist', 'db', 'data') // sink
await rm('dist/db/data') // sink

function wrapperouter() {
    const temp = append
    wrapperinnermid(temp)
}

function wrapperinnermid(temp) {
    const a = temp('db/data') // sink
    wrapperinner(a)
}

function wrapperinner(a) {
    a.to('dist/db/data')  // sink - [FALSE_NEGATIVE] - rare case as CAP is a fluent API
}