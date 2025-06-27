"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIndexFilesMode = validateIndexFilesMode;
exports.handleIndexFilesMode = handleIndexFilesMode;
const path_1 = require("path");
const filesystem_1 = require("./filesystem");
const logging_1 = require("./logging");
/**
 * Validates discovered CDS files against the response file for INDEX_FILES mode.
 * This function performs backwards compatibility validation to ensure that the
 * project-aware discovery is consistent with the legacy response file approach.
 *
 * @param cdsFilePathsToProcess Array of CDS file paths discovered through project-aware discovery
 * @param sourceRoot The source root directory
 * @param responseFile Path to the response file
 * @param platformInfo Platform information object with isWindows property
 * @returns Validation result with warnings and statistics
 */
function validateIndexFilesMode(cdsFilePathsToProcess, sourceRoot, responseFile, platformInfo) {
    const warnings = [];
    // Validate response file and get the full paths of CDS files from response file
    const responseFileResult = (0, filesystem_1.getCdsFilePathsToProcess)(responseFile, platformInfo);
    if (!responseFileResult.success) {
        return {
            success: false,
            warnings: [],
            errorMessage: responseFileResult.errorMessage,
            discoveredCount: cdsFilePathsToProcess.length,
            responseFileCount: 0,
        };
    }
    const responseFilePaths = responseFileResult.cdsFilePaths;
    // Convert discovered files to absolute paths for comparison
    const discoveredAbsolutePaths = cdsFilePathsToProcess.map(relativePath => relativePath.startsWith(sourceRoot) ? relativePath : (0, path_1.join)(sourceRoot, relativePath));
    // Validate that discovered files are consistent with response file
    const responseFileBasenames = responseFilePaths.map(path => path.replace(/^.*[/\\]/, ''));
    const discoveredBasenames = discoveredAbsolutePaths.map(path => path.replace(/^.*[/\\]/, ''));
    const unexpectedFiles = discoveredBasenames.filter(basename => !responseFileBasenames.includes(basename));
    const missingFiles = responseFileBasenames.filter(basename => !discoveredBasenames.includes(basename));
    if (unexpectedFiles.length > 0) {
        warnings.push(`Discovered CDS files not in response file: ${unexpectedFiles.join(', ')}`);
    }
    if (missingFiles.length > 0) {
        warnings.push(`Response file contains CDS files not discovered: ${missingFiles.join(', ')}`);
    }
    return {
        success: true,
        warnings,
        discoveredCount: cdsFilePathsToProcess.length,
        responseFileCount: responseFilePaths.length,
    };
}
/**
 * Handles the INDEX_FILES run mode processing.
 * This function performs project-aware CDS file discovery and validates the results
 * against the response file for backwards compatibility.
 *
 * @param projectMap Map of CDS projects discovered through project-aware parsing
 * @param sourceRoot The source root directory
 * @param responseFile Path to the response file
 * @param platformInfo Platform information object with isWindows property
 * @returns Object containing the CDS file paths to process and validation result
 */
function handleIndexFilesMode(projectMap, sourceRoot, responseFile, platformInfo) {
    (0, logging_1.cdsExtractorLog)('info', 'Extracting CDS files from discovered projects...');
    // Extract all CDS files from the discovered projects
    const cdsFilePathsToProcess = [];
    for (const [, project] of projectMap.entries()) {
        cdsFilePathsToProcess.push(...project.cdsFiles);
    }
    (0, logging_1.cdsExtractorLog)('info', 'Validating discovered CDS files against response file for backwards compatibility...');
    // Validate discovered files against response file
    const validationResult = validateIndexFilesMode(cdsFilePathsToProcess, sourceRoot, responseFile, platformInfo);
    if (!validationResult.success) {
        return {
            cdsFilePathsToProcess: [],
            validationResult,
        };
    }
    // Log warnings if any
    validationResult.warnings.forEach(warning => {
        (0, logging_1.cdsExtractorLog)('warn', warning);
    });
    (0, logging_1.cdsExtractorLog)('info', `Discovered ${validationResult.discoveredCount} CDS files from project analysis`);
    (0, logging_1.cdsExtractorLog)('info', `Response file specified ${validationResult.responseFileCount} CDS files`);
    return {
        cdsFilePathsToProcess,
        validationResult,
    };
}
//# sourceMappingURL=indexFiles.js.map