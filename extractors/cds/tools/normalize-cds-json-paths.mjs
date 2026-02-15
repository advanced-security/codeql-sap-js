#!/usr/bin/env node

/**
 * Normalize `$location.file` paths in CDS JSON files to use POSIX forward slashes.
 *
 * The SAP CDS compiler on Windows produces `$location.file` values with backslashes
 * (e.g. "srv\\service1.cds"), but the CodeQL CAP libraries expect forward slashes
 * (e.g. "srv/service1.cds"). This script normalizes all such paths in-place.
 *
 * This uses the same algorithm as `normalizeCdsJsonLocations` in
 * `extractors/cds/tools/src/filesystem.ts`, which has comprehensive unit tests.
 *
 * Usage:
 *   node normalize-cds-json-paths.mjs <file1.cds.json> [file2.cds.json ...]
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';

/**
 * Recursively normalize $location.file values to forward slashes.
 */
function normalizeLocations(obj) {
  if (typeof obj !== 'object' || obj === null) return;

  if (obj['$location']?.file && typeof obj['$location'].file === 'string') {
    obj['$location'].file = obj['$location'].file.split('\\').join('/');
  }

  for (const key of ['definitions', 'elements', 'params', 'actions', 'functions', 'items', 'returns']) {
    const nested = obj[key];
    if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
      for (const child of Object.values(nested)) {
        normalizeLocations(child);
      }
    }
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node normalize-cds-json-paths.mjs <file.cds.json> [...]');
  process.exit(0);
}

let changed = 0;
for (const filePath of args) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    console.error(`Skipping (not a file): ${filePath}`);
    continue;
  }

  const raw = readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`Skipping (invalid JSON): ${filePath}`);
    continue;
  }

  normalizeLocations(data);
  const normalized = JSON.stringify(data, null, 2) + '\n';

  if (normalized !== raw) {
    writeFileSync(filePath, normalized, 'utf8');
    console.log(`Normalized: ${filePath}`);
    changed++;
  }
}

console.log(`Done. ${changed} file(s) normalized out of ${args.length} processed.`);
