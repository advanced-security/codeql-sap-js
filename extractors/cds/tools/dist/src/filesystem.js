"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dirExists = dirExists;
exports.fileExists = fileExists;
exports.getCdsFilePathsToProcess = getCdsFilePathsToProcess;
exports.readResponseFile = readResponseFile;
exports.recursivelyRenameJsonFiles = recursivelyRenameJsonFiles;
exports.validateResponseFile = validateResponseFile;
const fs_1 = require("fs");
const path_1 = require("path");
const logging_1 = require("./logging");
/**
 * Check if a directory exists
 * @param dirPath Path to the directory to check
 * @returns True if the directory exists, false otherwise
 */
function dirExists(dirPath) {
    return (0, fs_1.existsSync)(dirPath) && (0, fs_1.statSync)(dirPath).isDirectory();
}
/**
 * Check if a file exists and can be read
 * @param filePath Path to the file to check
 * @returns True if the file exists and can be read, false otherwise
 */
function fileExists(filePath) {
    return (0, fs_1.existsSync)(filePath) && (0, fs_1.statSync)(filePath).isFile();
}
/**
 * Read and validate a response file to get the list of CDS files to process
 * @param responseFile Path to the response file
 * @param platformInfo Platform information object with isWindows property
 * @returns Object containing success status, CDS file paths to process, and error message if any
 */
function getCdsFilePathsToProcess(responseFile, platformInfo) {
    // First validate the response file exists
    const responseFileValidation = validateResponseFile(responseFile);
    if (!responseFileValidation.success) {
        return {
            success: false,
            cdsFilePaths: [],
            errorMessage: `'${platformInfo.isWindows ? 'codeql.exe' : 'codeql'} database index-files --language cds' terminated early as ${responseFileValidation.errorMessage}`,
        };
    }
    // Now read the file paths from the response file
    try {
        const cdsFilePathsToProcess = readResponseFile(responseFile);
        // Check if there are any file paths to process
        if (!cdsFilePathsToProcess.length) {
            return {
                success: false,
                cdsFilePaths: [],
                errorMessage: `'${platformInfo.isWindows ? 'codeql.exe' : 'codeql'} database index-files --language cds' terminated early as response file '${responseFile}' is empty. This is because no CDS files were selected or found.`,
            };
        }
        return {
            success: true,
            cdsFilePaths: cdsFilePathsToProcess,
        };
    }
    catch (err) {
        return {
            success: false,
            cdsFilePaths: [],
            errorMessage: `'${platformInfo.isWindows ? 'codeql.exe' : 'codeql'} database index-files --language cds' terminated early as response file '${responseFile}' could not be read due to an error: ${String(err)}`,
        };
    }
}
/**
 * Read response file contents and split into lines
 * @param responseFile Path to the response file
 * @returns Array of file paths from the response file
 */
function readResponseFile(responseFile) {
    try {
        // Read the response file and split it into lines, removing empty lines
        const responseFiles = (0, fs_1.readFileSync)(responseFile, 'utf-8').split('\n').filter(Boolean);
        return responseFiles;
    }
    catch (err) {
        throw new Error(`Response file '${responseFile}' could not be read due to an error: ${String(err)}`);
    }
}
/**
 * Recursively renames all .json files to .cds.json in the given directory and
 * its subdirectories, except for those that already have .cds.json extension.
 *
 * @param {string} dirPath - The directory path to start recursion from
 */
function recursivelyRenameJsonFiles(dirPath) {
    // Make sure the directory exists
    if (!dirExists(dirPath)) {
        (0, logging_1.cdsExtractorLog)('info', `Directory not found: ${dirPath}`);
        return;
    }
    (0, logging_1.cdsExtractorLog)('info', `Processing JSON files in directory: ${dirPath}`);
    // Get all entries in the directory
    const entries = (0, fs_1.readdirSync)(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = (0, path_1.join)(dirPath, entry.name);
        if (entry.isDirectory()) {
            // Recursively process subdirectories
            recursivelyRenameJsonFiles(fullPath);
        }
        else if (entry.isFile() &&
            entry.name.endsWith('.json') &&
            !entry.name.endsWith('.cds.json')) {
            // Rename .json files to .cds.json
            const newPath = (0, path_1.format)({ ...(0, path_1.parse)(fullPath), base: '', ext: '.cds.json' });
            (0, fs_1.renameSync)(fullPath, newPath);
            (0, logging_1.cdsExtractorLog)('info', `Renamed CDS output file from ${fullPath} to ${newPath}`);
        }
    }
}
/**
 * Validate a response file exists and can be read
 * @param responseFile Path to the response file
 * @returns Object containing success status and error message if any
 */
function validateResponseFile(responseFile) {
    if (!fileExists(responseFile)) {
        return {
            success: false,
            errorMessage: `response file '${responseFile}' does not exist. This is because no CDS files were selected or found`,
        };
    }
    return { success: true };
}
//# sourceMappingURL=filesystem.js.map