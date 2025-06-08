import { existsSync, readdirSync, readFileSync, renameSync, statSync } from 'fs';
import { format, join, parse } from 'path';

/**
 * Check if a directory exists
 * @param dirPath Path to the directory to check
 * @returns True if the directory exists, false otherwise
 */
export function dirExists(dirPath: string): boolean {
  return existsSync(dirPath) && statSync(dirPath).isDirectory();
}

/**
 * Check if a file exists and can be read
 * @param filePath Path to the file to check
 * @returns True if the file exists and can be read, false otherwise
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath) && statSync(filePath).isFile();
}

/**
 * Read and validate a response file to get the list of CDS files to process
 * @param responseFile Path to the response file
 * @param platformInfo Platform information object with isWindows property
 * @returns Object containing success status, CDS file paths to process, and error message if any
 */
export function getCdsFilePathsToProcess(
  responseFile: string,
  platformInfo: { isWindows: boolean },
): {
  success: boolean;
  cdsFilePaths: string[];
  errorMessage?: string;
} {
  // First validate the response file exists
  const responseFileValidation = validateResponseFile(responseFile);
  if (!responseFileValidation.success) {
    return {
      success: false,
      cdsFilePaths: [],
      errorMessage: `'${
        platformInfo.isWindows ? 'codeql.exe' : 'codeql'
      } database index-files --language cds' terminated early as ${responseFileValidation.errorMessage}`,
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
        errorMessage: `'${
          platformInfo.isWindows ? 'codeql.exe' : 'codeql'
        } database index-files --language cds' terminated early as response file '${responseFile}' is empty. This is because no CDS files were selected or found.`,
      };
    }

    return {
      success: true,
      cdsFilePaths: cdsFilePathsToProcess,
    };
  } catch (err) {
    return {
      success: false,
      cdsFilePaths: [],
      errorMessage: `'${
        platformInfo.isWindows ? 'codeql.exe' : 'codeql'
      } database index-files --language cds' terminated early as response file '${responseFile}' could not be read due to an error: ${String(err)}`,
    };
  }
}

/**
 * Read response file contents and split into lines
 * @param responseFile Path to the response file
 * @returns Array of file paths from the response file
 */
export function readResponseFile(responseFile: string): string[] {
  try {
    // Read the response file and split it into lines, removing empty lines
    const responseFiles = readFileSync(responseFile, 'utf-8').split('\n').filter(Boolean);
    return responseFiles;
  } catch (err) {
    throw new Error(
      `Response file '${responseFile}' could not be read due to an error: ${String(err)}`,
    );
  }
}

/**
 * Recursively renames all .json files to .cds.json in the given directory and
 * its subdirectories, except for those that already have .cds.json extension.
 *
 * @param {string} dirPath - The directory path to start recursion from
 */
export function recursivelyRenameJsonFiles(dirPath: string): void {
  // Make sure the directory exists
  if (!dirExists(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return;
  }
  console.log(`Processing JSON files in directory: ${dirPath}`);

  // Get all entries in the directory
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      recursivelyRenameJsonFiles(fullPath);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      !entry.name.endsWith('.cds.json')
    ) {
      // Rename .json files to .cds.json
      const newPath = format({ ...parse(fullPath), base: '', ext: '.cds.json' });
      renameSync(fullPath, newPath);
      console.log(`Renamed CDS output file from ${fullPath} to ${newPath}`);
    }
  }
}

/**
 * Validate a response file exists and can be read
 * @param responseFile Path to the response file
 * @returns Object containing success status and error message if any
 */
export function validateResponseFile(responseFile: string): {
  success: boolean;
  errorMessage?: string;
} {
  if (!fileExists(responseFile)) {
    return {
      success: false,
      errorMessage: `response file '${responseFile}' does not exist. This is because no CDS files were selected or found`,
    };
  }
  return { success: true };
}
