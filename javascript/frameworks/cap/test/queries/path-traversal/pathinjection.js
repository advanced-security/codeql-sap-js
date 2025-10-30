const cds = require("@sap/cds");
const { decodeURI, decodeURIComponent, local, isdir, isfile, read, readdir, append, write, copy, stat, find, mkdirp, rmdir, rimraf, rm } = cds.utils

module.exports = class Service1 extends cds.ApplicationService {

    init() {
        this.on("send1", async (req) => {
            const userinput = req.data
            const userinputtwo = req.headers
            const userinputthree = req.params

            const taint1 = decodeURI(userinputthree) // taint step

            const taint2 = decodeURIComponent(userinputthree) // taint step

            const taint3 = local(userinputthree) // taint step

            const taint4 = isdir(userinputthree) // taint step

            const taint5 = isfile(userinputthree) // taint step

            const pkg = await read(taint1) // sink

            const pdir = await readdir(taint2) // sink

            const s = await stat(taint3) // sink

            const f = await find(taint4) // sink

            await append('db/data').to(taint5)  // sink
            await append(userinput, 'dist/db/data')  // sink

            await copy('db/data').to(userinput)  // sink
            await copy(userinput, 'dist/db/data')  // sink

            await write({ foo: 'bar' }).to(userinput) // sink
            await write(userinputtwo).to('db/data') // sink
            await write(userinput, { foo: 'bar' }) // sink

            await mkdirp(userinput, 'db', 'data') // sink
            await mkdirp(userinput) // sink

            await rmdir(userinput, 'db', 'data') // sink
            await rmdir(userinput) // sink

            await rimraf(userinput, 'db', 'data') // sink
            await rimraf(userinput) // sink

            await rm(userinput, 'db', 'data') // sink
            await rm(userinput) // sink

            let allowedDirectories = [
                'this-is-a-safe-directory'
            ];
            if (allowedDirectories.includes(userinput)) {
                await rm(userinput) // sanitized
            }
        });

        super.init();
    }
};