import { execFileSync } from 'child_process';
import { resolve } from 'path';

import { quote } from 'shell-quote';

import { cdsExtractorLog } from './logging';

/**
 * Severity levels for diagnostics
 */
export enum DiagnosticSeverity {
  Error = 'error',
  Warning = 'warning',
  Note = 'note',
  Recommendation = 'recommendation',
}

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
export function addDiagnostic(
  filePath: string,
  message: string,
  codeqlExePath: string,
  sourceId: string,
  sourceName: string,
  severity: DiagnosticSeverity,
  logPrefix: string,
): boolean {
  try {
    // Use shell-quote to safely escape the message
    const escapedMessage = quote([message]);

    execFileSync(codeqlExePath, [
      'database',
      'add-diagnostic',
      '--extractor-name=cds',
      '--ready-for-status-page',
      `--source-id=${sourceId}`,
      `--source-name=${sourceName}`,
      `--severity=${severity}`,
      `--markdown-message=${escapedMessage.slice(1, -1)}`, // Remove the added quotes from shell-quote
      `--file-path=${resolve(filePath)}`,
      '--',
      `${process.env.CODEQL_EXTRACTOR_CDS_WIP_DATABASE ?? ''}`,
    ]);
    cdsExtractorLog('info', `Added ${severity} diagnostic for ${logPrefix}: ${filePath}`);
    return true;
  } catch (err) {
    cdsExtractorLog(
      'error',
      `Failed to add ${severity} diagnostic for ${logPrefix}=${filePath} : ${String(err)}`,
    );
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
export function addCompilationDiagnostic(
  cdsFilePath: string,
  errorMessage: string,
  codeqlExePath: string,
): boolean {
  return addDiagnostic(
    cdsFilePath,
    errorMessage,
    codeqlExePath,
    'cds/compilation-failure',
    'Failure to compile one or more SAP CAP CDS files',
    DiagnosticSeverity.Error,
    'source file',
  );
}

/**
 * Add a diagnostic error to the CodeQL database for a dependency installation failure
 * @param packageJsonPath Path to the package.json file that has installation issues
 * @param errorMessage The error message from the installation
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
export function addDependencyDiagnostic(
  packageJsonPath: string,
  errorMessage: string,
  codeqlExePath: string,
): boolean {
  return addDiagnostic(
    packageJsonPath,
    errorMessage,
    codeqlExePath,
    'cds/dependency-failure',
    'Failure to install SAP CAP CDS dependencies',
    DiagnosticSeverity.Error,
    'package.json file',
  );
}

/**
 * Add a diagnostic warning to the CodeQL database for a package.json parsing failure
 * @param packageJsonPath Path to the package.json file that couldn't be parsed
 * @param errorMessage The error message from the parsing attempt
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
export function addPackageJsonParsingDiagnostic(
  packageJsonPath: string,
  errorMessage: string,
  codeqlExePath: string,
): boolean {
  return addDiagnostic(
    packageJsonPath,
    errorMessage,
    codeqlExePath,
    'cds/package-json-parsing-failure',
    'Failure to parse package.json file for SAP CAP CDS project',
    DiagnosticSeverity.Warning,
    'package.json file',
  );
}

/**
 * Add a diagnostic error to the CodeQL database for a JavaScript extractor failure
 * @param filePath Path to a relevant file for the error context
 * @param errorMessage The error message from the JavaScript extractor
 * @param codeqlExePath Path to the CodeQL executable
 * @returns True if the diagnostic was added, false otherwise
 */
export function addJavaScriptExtractorDiagnostic(
  filePath: string,
  errorMessage: string,
  codeqlExePath: string,
): boolean {
  return addDiagnostic(
    filePath,
    errorMessage,
    codeqlExePath,
    'cds/js-extractor-failure',
    'Failure in JavaScript extractor for SAP CAP CDS files',
    DiagnosticSeverity.Error,
    'extraction file',
  );
}
