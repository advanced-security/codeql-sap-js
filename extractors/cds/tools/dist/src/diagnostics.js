"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticSeverity = void 0;
exports.addDiagnostic = addDiagnostic;
exports.addCompilationDiagnostic = addCompilationDiagnostic;
exports.addDependencyDiagnostic = addDependencyDiagnostic;
exports.addPackageJsonParsingDiagnostic = addPackageJsonParsingDiagnostic;
exports.addJavaScriptExtractorDiagnostic = addJavaScriptExtractorDiagnostic;
const child_process_1 = require("child_process");
const path_1 = require("path");
const shell_quote_1 = require("shell-quote");
const logging_1 = require("./logging");
/**
 * Severity levels for diagnostics
 */
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity["Error"] = "error";
    DiagnosticSeverity["Warning"] = "warning";
    DiagnosticSeverity["Note"] = "note";
    DiagnosticSeverity["Recommendation"] = "recommendation";
})(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
/**
 * Base function to add a diagnostic to the CodeQL database
 * @param filePath Path to the file related to the diagnostic
 * @param message The diagnostic message
 * @param codeqlExePath Path to the CodeQL executable
 * @param sourceId The source ID for the diagnostic
 * @param sourceName The source name for the diagnostic
 * @param severity The severity level of the diagnostic
 * @param logPrefix Prefix for the log message
 * @returns True if the diagnostic was added, false otherwise
 */
function addDiagnostic(filePath, message, codeqlExePath, sourceId, sourceName, severity, logPrefix) {
    var _a;
    try {
        // Use shell-quote to safely escape the message
        const escapedMessage = (0, shell_quote_1.quote)([message]);
        (0, child_process_1.execFileSync)(codeqlExePath, [
            'database',
            'add-diagnostic',
            '--extractor-name=cds',
            '--ready-for-status-page',
            `--source-id=${sourceId}`,
            `--source-name=${sourceName}`,
            `--severity=${severity}`,
            `--markdown-message=${escapedMessage.slice(1, -1)}`, // Remove the added quotes from shell-quote
            `--file-path=${(0, path_1.resolve)(filePath)}`,
            '--',
            `${(_a = process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE) !== null && _a !== void 0 ? _a : ''}`,
        ]);
        (0, logging_1.cdsExtractorLog)('info', `Added ${severity} diagnostic for ${logPrefix}: ${filePath}`);
        return true;
    }
    catch (err) {
        (0, logging_1.cdsExtractorLog)('error', `Failed to add ${severity} diagnostic for ${logPrefix}=${filePath} : ${String(err)}`);
        return false;
    }
}
/**
 * Add a diagnostic error to the CodeQL database for a failed CDS compilation
 * @param cdsFilePath Path to the CDS file that failed to compile
 * @param errorMessage The error message from the compilation
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
function addCompilationDiagnostic(cdsFilePath, errorMessage, codeqlExePath) {
    return addDiagnostic(cdsFilePath, errorMessage, codeqlExePath, 'cds/compilation-failure', 'Failure to compile one or more SAP CAP CDS files', DiagnosticSeverity.Error, 'source file');
}
/**
 * Add a diagnostic error to the CodeQL database for a dependency installation failure
 * @param packageJsonPath Path to the package.json file that has installation issues
 * @param errorMessage The error message from the installation
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
function addDependencyDiagnostic(packageJsonPath, errorMessage, codeqlExePath) {
    return addDiagnostic(packageJsonPath, errorMessage, codeqlExePath, 'cds/dependency-failure', 'Failure to install SAP CAP CDS dependencies', DiagnosticSeverity.Error, 'package.json file');
}
/**
 * Add a diagnostic warning to the CodeQL database for a package.json parsing failure
 * @param packageJsonPath Path to the package.json file that couldn't be parsed
 * @param errorMessage The error message from the parsing attempt
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
function addPackageJsonParsingDiagnostic(packageJsonPath, errorMessage, codeqlExePath) {
    return addDiagnostic(packageJsonPath, errorMessage, codeqlExePath, 'cds/package-json-parsing-failure', 'Failure to parse package.json file for SAP CAP CDS project', DiagnosticSeverity.Warning, 'package.json file');
}
/**
 * Add a diagnostic error to the CodeQL database for a JavaScript extractor failure
 * @param filePath Path to a relevant file for the error context
 * @param errorMessage The error message from the JavaScript extractor
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
function addJavaScriptExtractorDiagnostic(filePath, errorMessage, codeqlExePath) {
    return addDiagnostic(filePath, errorMessage, codeqlExePath, 'cds/js-extractor-failure', 'Failure in JavaScript extractor for SAP CAP CDS files', DiagnosticSeverity.Error, 'extraction file');
}
//# sourceMappingURL=diagnostics.js.map