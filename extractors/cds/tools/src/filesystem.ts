import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { format, join, parse } from 'path';

import { cdsExtractorMarkerFileContent, cdsExtractorMarkerFileName } from './constants';
import { cdsExtractorLog } from './logging';

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
 * Recursively renames all .json files to .cds.json in the given directory and
 * its subdirectories, except for those that already have .cds.json extension.
 *
 * @param {string} dirPath - The directory path to start recursion from
 */
export function recursivelyRenameJsonFiles(dirPath: string): void {
  // Make sure the directory exists
  if (!dirExists(dirPath)) {
    cdsExtractorLog('info', `Directory not found: ${dirPath}`);
    return;
  }
  cdsExtractorLog('info', `Processing JSON files in directory: ${dirPath}`);

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
      cdsExtractorLog('info', `Renamed CDS output file from ${fullPath} to ${newPath}`);
    }
  }
}

/**
 * Create the marker file with dummy content.
 * This file is required by the JavaScript extractor starting with CodeQL CLI v2.23.5.
 * @param sourceRoot The source root directory where the marker file should be created
 * @returns The path to the created marker file
 */
export function createMarkerFile(sourceRoot: string): string {
  const markerFilePath = join(sourceRoot, cdsExtractorMarkerFileName);
  try {
    writeFileSync(markerFilePath, cdsExtractorMarkerFileContent, 'utf8');
    cdsExtractorLog('info', `Created marker file: ${markerFilePath}`);
  } catch (error) {
    cdsExtractorLog('warn', `Failed to create marker file: ${String(error)}`);
  }
  return markerFilePath;
}

/**
 * Remove the cdsExtractorMarkerFileName file if it exists.
 * This cleanup prevents the marker file from being accidentally committed.
 * @param markerFilePath The path to the marker file to remove
 */
export function removeMarkerFile(markerFilePath: string): void {
  if (existsSync(markerFilePath)) {
    try {
      unlinkSync(markerFilePath);
      cdsExtractorLog('info', `Removed marker file: ${markerFilePath}`);
    } catch (error) {
      cdsExtractorLog('warn', `Failed to remove marker file: ${String(error)}`);
    }
  }
}

/**
 * Normalize all `$location.file` values in a parsed CDS JSON object to use
 * POSIX forward slashes. The CDS compiler on Windows produces backslash paths
 * (e.g. `"srv\\service1.cds"`), but the CodeQL libraries expect forward slashes
 * (e.g. `"srv/service1.cds"`).
 *
 * Mutates the object in place and returns it for convenience.
 */
export function normalizeCdsJsonLocations(data: Record<string, unknown>): Record<string, unknown> {
  if (typeof data !== 'object' || data === null) return data;

  // Normalize top-level $location.file
  const topLoc = data['$location'] as Record<string, unknown> | undefined;
  if (topLoc?.file && typeof topLoc.file === 'string') {
    topLoc.file = topLoc.file.split('\\').join('/');
  }

  // Normalize $location.file in all definitions (and their nested elements/params)
  const definitions = data['definitions'] as Record<string, Record<string, unknown>> | undefined;
  if (definitions) {
    for (const defn of Object.values(definitions)) {
      normalizeLocationsRecursive(defn);
    }
  }

  return data;
}

/**
 * Recursively normalize `$location.file` values in a CDS JSON object node.
 */
function normalizeLocationsRecursive(obj: unknown): void {
  if (typeof obj !== 'object' || obj === null) return;

  const record = obj as Record<string, unknown>;
  const loc = record['$location'] as Record<string, unknown> | undefined;
  if (loc?.file && typeof loc.file === 'string') {
    loc.file = loc.file.split('\\').join('/');
  }

  // Recurse into known nested structures: elements, params, actions, functions
  for (const key of ['elements', 'params', 'actions', 'functions', 'items', 'returns']) {
    const nested = record[key];
    if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
      for (const child of Object.values(nested as Record<string, unknown>)) {
        normalizeLocationsRecursive(child);
      }
    }
  }
}

/**
 * Read a `.cds.json` file, normalize all `$location.file` values to POSIX
 * forward slashes, and write it back. No-op if the file doesn't change.
 *
 * @param filePath Absolute path to the `.cds.json` file
 */
export function normalizeLocationPathsInFile(filePath: string): void {
  if (!fileExists(filePath)) return;

  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  normalizeCdsJsonLocations(data);
  const normalized = JSON.stringify(data, null, 2) + '\n';

  if (normalized !== raw) {
    writeFileSync(filePath, normalized, 'utf8');
    cdsExtractorLog('info', `Normalized $location paths in: ${filePath}`);
  }
}
