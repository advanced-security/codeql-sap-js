const { execFileSync, spawnSync } = require('child_process');
const { existsSync, readFileSync, statSync, writeFileSync } = require('fs');
const { arch, platform } = require('os');
const { dirname, join, resolve } = require('path');
const { quote } = require('shell-quote');

// Terminate early if this script is not invoked with the required arguments.
if (process.argv.length !== 4) {
    console.warn(`Usage: node index-files.js <response-file> <source-root>`);
    process.exit(0);
}

const responseFile = process.argv[2];
const sourceRoot = process.argv[3];

// Force this script, and any process it spawns, to use the project (source)
// root directory as the current working directory.
process.chdir(sourceRoot);

console.log(`Indexing CDS files in project source directory: ${sourceRoot}`);

const osPlatform = platform();
const osPlatformArch = arch();
console.log(`Detected OS platform=${osPlatform} : arch=${osPlatformArch}`);
const codeqlExe = osPlatform === 'win32' ? 'codeql.exe' : 'codeql';
const codeqlExePath = resolve(join(quote([process.env.CODEQL_DIST]), codeqlExe));

if (!existsSync(sourceRoot)) {
    console.warn(`'${codeqlExe} database index-files --language cds' terminated early due to internal error: could not find project root directory '${sourceRoot}'.`);
    process.exit(0);
}

let CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT
    ? quote([process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT])
    : undefined;
// Check if the (JavaScript) JS extractor variables are set, and set them if not.
if (!CODEQL_EXTRACTOR_JAVASCRIPT_ROOT) {
    // Find the JS extractor location.
    CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = execFileSync(
        codeqlExePath,
        ['resolve', 'extractor', '--language=javascript']
    ).toString().trim();
    // Terminate early if the CODEQL_EXTRACTOR_JAVASCRIPT_ROOT environment
    // variable was not already set and could not be resolved via CLI.
    if (!CODEQL_EXTRACTOR_JAVASCRIPT_ROOT) {
        console.warn(
            `'${codeqlExe} database index-files --language cds' terminated early as CODEQL_EXTRACTOR_JAVASCRIPT_ROOT environment variable is not set.`
        );
        process.exit(0);
    }
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_ROOT = CODEQL_EXTRACTOR_JAVASCRIPT_ROOT;
    // Set the JAVASCRIPT extractor environment variables to the same as the CDS
    // extractor environment variables so that the JS extractor will write to the
    // CDS database.
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_WIP_DATABASE = process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_DIAGNOSTIC_DIR = process.env.CODEQL_EXTRACTOR_CDS_DIAGNOSTIC_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_LOG_DIR = process.env.CODEQL_EXTRACTOR_CDS_LOG_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SCRATCH_DIR = process.env.CODEQL_EXTRACTOR_CDS_SCRATCH_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_TRAP_DIR = process.env.CODEQL_EXTRACTOR_CDS_TRAP_DIR;
    process.env.CODEQL_EXTRACTOR_JAVASCRIPT_SOURCE_ARCHIVE_DIR = process.env.CODEQL_EXTRACTOR_CDS_SOURCE_ARCHIVE_DIR;
}

const autobuildScriptName = osPlatform === 'win32' ? 'autobuild.cmd' : 'autobuild.sh';
const autobuildScriptPath = resolve(join(
    CODEQL_EXTRACTOR_JAVASCRIPT_ROOT, 'tools', autobuildScriptName
));

/**
 * Terminate early if:
 *   - the javascript extractor autobuild script does not exist; or
 *   - the codeql executable does not exist; or
 *   - the input responseFile does not exist; or
 *   - the input responseFile is empty or could not be parsed as a list of file paths.
 */
if (!existsSync(autobuildScriptPath)) {
    console.warn(`'${codeqlExe} database index-files --language cds' terminated early as autobuild script '${autobuildScriptPath}' does not exist.`);
    process.exit(0);
}
if (!existsSync(codeqlExePath)) {
    console.warn(`'${codeqlExe} database index-files --language cds' terminated early as codeql executable '${codeqlExePath}' does not exist.`);
    process.exit(0);
}
if (!existsSync(responseFile)) {
    console.warn(`'${codeqlExe} database index-files --language cds' terminated early as response file '${responseFile}' does not exist. This is because no CDS files were selected or found.`);
    process.exit(0);
}

let responseFiles = [];
try {
    // Read the response file and split it into lines, removing (filter(Boolean)) empty lines.
    responseFiles = readFileSync(responseFile, 'utf-8').split('\n').filter(Boolean);
    if (statSync(responseFile).size === 0 || responseFiles.length === 0) {
        console.warn(`'${codeqlExe} database index-files --language cds' terminated early as response file '${responseFile}' is empty. This is because no CDS files were selected or found.`);
        process.exit(0);
    }
} catch (err) {
    console.warn(`'${codeqlExe} database index-files --language cds' terminated early as response file '${responseFile}' could not be read due to an error: ${err}`);
    process.exit(0);
}

// Determine if we have the cds commands available. If not, install the cds develpment kit
// (cds-dk) in the appropriate directories and use npx to run the cds command from there.
let cdsCommand = 'cds';
try {
    execFileSync('cds', ['--version'], { stdio: 'ignore' });
} catch {
    console.log('Pre-installing cds compiler ...');

    // Use a JS `Set` to avoid duplicate processing of the same directory.
    const packageJsonDirs = new Set();
    /**
     * Find all the directories containing a package.json with a dependency on `@sap/cds`,
     * where the directory contains at least one of the files listed in the response file
     * (e.g. the cds files we want to extract).
     *
     * We then install the CDS development kit (`@sap/cds-dk`) in each directory, which
     * makes the `cds` command usable from the npx command within that directory.
     *
     * Nested package.json files simply cause the package to be installed in the parent
     * node_modules directory.
     *
     * We also ensure we skip node_modules, as we can end up in a recursive loop.
     *
     * NOTE: The original (sh-based) implementation of this extractor would also capture
     * "grandfathered" package.json files, which are package.json files that exist in a
     * parent directory of the first package.json file found. This (js-based) implementation
     * removes this behavior as it seems unnecessary and potentially problematic.
     */
    responseFiles.forEach(file => {
        let dir = dirname(quote([file]));
        while (dir !== resolve(dir, '..')) {
            const packageJsonPath = join(dir, 'package.json');
            if (existsSync(packageJsonPath)) {
                const rawData = readFileSync(packageJsonPath, 'utf-8');
                const packageJsonData = JSON.parse(rawData);
                // Check if the 'name' and 'dependencies' properties are present in the
                // package.json file at packageJsonPath.
                if (
                    packageJsonData.name &&
                    packageJsonData.dependencies &&
                    typeof packageJsonData.dependencies === 'object'
                ) {
                    const dependencyNames = Object.keys(packageJsonData.dependencies);
                    if (dependencyNames.includes('@sap/cds')) {
                        packageJsonDirs.add(dir);
                        break;
                    }
                }
            }
            // Move up one directory level and try again to find a package.json file
            // for the response file.
            dir = resolve(dir, '..');
        }
    });

    // Sanity check that we found at least one package.json directory from which the CDS
    // compiler dependencies may be installed.
    if (packageJsonDirs.size === 0) {
        console.warn('WARN: failed to detect any package.json directories for cds compiler installation.');
        exit(0);
    }

    packageJsonDirs.forEach((dir) => {
        console.log(`Installing node dependencies from ${dir}/package.json ...`);
        execFileSync(
            'npm',
            ['install', '--quiet', '--no-audit', '--no-fund'],
            { cwd: dir, stdio: 'inherit' }
        );
        // Order is important here. Install dependencies from package.json in the directory,
        // then install the CDS development kit (`@sap/cds-dk`) in the directory. Reversing
        // this order causes cyclic install-remove behavior.
        console.log(`Installing '@sap/cds-dk' into ${dir} to enable CDS compilation ...`);
        execFileSync(
            'npm',
            ['install', '--quiet', '--no-audit', '--no-fund', '--no-save', '@sap/cds-dk'],
            { cwd: dir, stdio: 'inherit' }
        );
    });

    /**
     * Use the `npx` command to dynamically install the CDS development kit (`@sap/cds-dk`)
     * package if necessary, which then provides the `cds` command line tool in directories
     * which are not covered by the package.json install command approach above.
     */
    cdsCommand = 'npx -y --package @sap/cds-dk cds';
}

console.log('Processing CDS files to JSON ...');

/**
 * Run the cds compile command on each file in the response files list, outputting the
 * compiled JSON to a file with the same name but with a .json extension appended.
 */
responseFiles.forEach(rawCdsFilePath => {
    const cdsFilePath = quote([rawCdsFilePath]);
    const cdsJsonFilePath = `${cdsFilePath}.json`;
    console.log(`Processing CDS file ${cdsFilePath} to ${cdsJsonFilePath} ...`);
    const result = spawnSync(
        cdsCommand,
        [
            'compile', cdsFilePath,
            '-2', 'json',
            '--locations',
            '--log-level', 'warn'
        ],
        { shell: true, stdio: 'pipe' }
    );
    if (result.error || result.status !== 0 || !result.stdout) {
        const errorMessage = `Could not compile the file ${cdsFilePath}.\nReported error(s):\n\`\`\`\n${result.stderr.toString()}\n\`\`\``;
        console.log(errorMessage);
        try {
            execFileSync(
                codeqlExePath,
                [
                    'database',
                    'add-diagnostic',
                    '--extractor-name=cds',
                    '--ready-for-status-page',
                    '--source-id=cds/compilation-failure',
                    '--source-name="Failure to compile one or more SAP CAP CDS files"',
                    '--severity=error',
                    `--markdown-message="${errorMessage}"`,
                    `--file-path="${cdsFilePath}"`,
                    '--',
                    `${process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE}`
                ],
            );
            console.log(`Added error diagnostic for source file: ${cdsFilePath}`);
        } catch (err) {
            console.error(`Failed to add error diagnostic for source file=${cdsFilePath} : ${err}`);
        }
    }
    // Write the compiled JSON result to cdsJsonFilePath.
    writeFileSync(cdsJsonFilePath, result.stdout);
});

let excludeFilters = '';
/**
 * Check if LGTM_INDEX_FILTERS is already set. This tyically happens if either
 * "paths" and/or "paths-ignore" is set in the lgtm.yml file.
 */
if (process.env.LGTM_INDEX_FILTERS) {
    console.log(`Found $LGTM_INDEX_FILTERS already set to:\n${process.env.LGTM_INDEX_FILTERS}`);
    const allowedExcludePatterns = [
        join('exclude:**', '*'),
        join('exclude:**', '*.*'),
    ];
    /**
     * If it is set, we will try to honor the paths-ignore filter.
     *
     * Split by `\n` and find all the entries that start with exclude, with some
     * exclusions allowed for supported glob patterns, and then join them back
     * together with `\n`.
     */
    excludeFilters = '\n' + process.env.LGTM_INDEX_FILTERS
        .split('\n')
        .filter(line =>
            line.startsWith('exclude')
            &&
            !allowedExcludePatterns.some(pattern => line.includes(pattern))
        ).join('\n');
}

// Enable extraction of the .cds.json files only.
const lgtmIndexFiltersPatterns = [
    join('exclude:**', '*.*'),
    join('include:**', '*.cds.json'),
    join('include:**', '*.cds'),
    join('exclude:**', 'node_modules', '**', '*.*')
].join('\n');;
process.env.LGTM_INDEX_FILTERS = lgtmIndexFiltersPatterns + excludeFilters;
console.log(`Set $LGTM_INDEX_FILTERS to:\n${process.env.LGTM_INDEX_FILTERS}`);
process.env.LGTM_INDEX_TYPESCRIPT = 'NONE';
// Configure to copy over the .cds files as well, by pretending they are JSON.
process.env.LGTM_INDEX_FILETYPES = '.cds:JSON';
// Ignore the LGTM_INDEX_INCLUDE variable for this purpose as it may explicitly
// refer to .js or .ts files.
delete process.env.LGTM_INDEX_INCLUDE;

console.log(
    `Extracting the .cds.json files by running the 'javascript' extractor autobuild script:
    ${autobuildScriptPath}`
);
/**
 * Invoke the javascript autobuilder to index the .cds.json files only.
 *
 * Environment variables must be passed from this script's process to the
 * process that invokes the autobuild script, otherwise the CDS autobuild.sh
 * script will not be invoked by the autobuild script built into the
 * 'javascript' extractor.
 *
 * IMPORTANT: The JavaScript extractor autobuild script must be invoked with
 * the current working directory set to the project (source) root directory
 * because it assumes it is running from there. The JavaScript extractor will
 * only find the .cds files to index (to the database) if those file are
 * relative to where the autobuild script is invoked from, which should be the
 * same as the `--source-root` argument passed to the `codeql database create`
 * command.
 */
spawnSync(
    autobuildScriptPath,
    [],
    { cwd: sourceRoot, env: process.env, shell: true, stdio: 'inherit' }
);
