#!/usr/bin/env node

/**
 * Compile CDS files to model.cds.json for CodeQL unit test directories.
 *
 * This script uses the CDS extractor's own functions (bundled via esbuild)
 * for version resolution, compilation target determination, and path
 * normalization — ensuring identical behavior to the extractor itself.
 *
 * Usage:
 *   node compile-test-cds.mjs [baseDir]
 *
 * baseDir defaults to "javascript/frameworks/cap/test" relative to the
 * project root (auto-detected from this script's location).
 */

import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import {
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the bundled CDS extractor library functions
const require = createRequire(import.meta.url);
const lib = require(join(__dirname, '..', 'dist', 'compile-test-cds-lib.cjs'));
const {
  determineCdsFilesToCompile,
  normalizeLocationPathsInFile,
  readPackageJsonFile,
  modelCdsJsonFile, // "model.cds.json"
  setSourceRootDirectory,
} = lib;

// Project root is 4 levels up from extractors/cds/tools/workflow/
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_BASE_DIR = join('javascript', 'frameworks', 'cap', 'test');
const MINIMUM_CDS_DK_VERSION = 8;

// ─── CDS-DK version resolution (reuses readPackageJsonFile from extractor) ──

function resolvePreferredCdsDkVersion(projectDir) {
  const pkg = readPackageJsonFile(join(projectDir, 'package.json'));
  if (!pkg) return `^${MINIMUM_CDS_DK_VERSION}`;

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const cdsDk = deps?.['@sap/cds-dk'];
  const cds = deps?.['@sap/cds'];

  if (cdsDk) {
    const m = cdsDk.match(/\^?~?(\d+)/);
    if (m && parseInt(m[1], 10) < MINIMUM_CDS_DK_VERSION) return `^${MINIMUM_CDS_DK_VERSION}`;
    return cdsDk;
  }
  if (cds) {
    const m = cds.match(/\^?~?(\d+)/);
    const major = m ? m[1] : String(MINIMUM_CDS_DK_VERSION);
    const derived = `^${major}`;
    const dm = derived.match(/\^?(\d+)/);
    if (dm && parseInt(dm[1], 10) < MINIMUM_CDS_DK_VERSION) return `^${MINIMUM_CDS_DK_VERSION}`;
    return derived;
  }

  return `^${MINIMUM_CDS_DK_VERSION}`;
}

// ─── Test directory discovery ────────────────────────────────────────────────

function findTestDirs(baseDir) {
  const dirs = new Set();
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.endsWith('.testproj')) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.expected')) {
        dirs.add(dir);
      }
    }
  }
  walk(baseDir);
  return [...dirs].sort();
}

function hasCdsFiles(dir) {
  try {
    if (readdirSync(dir).some(e => e.endsWith('.cds') && statSync(join(dir, e)).isFile())) return true;
    for (const sub of ['app', 'db', 'srv']) {
      const subDir = join(dir, sub);
      if (existsSync(subDir) && statSync(subDir).isDirectory()) {
        if (readdirSync(subDir).some(e => e.endsWith('.cds'))) return true;
      }
    }
  } catch { /* skip */ }
  return false;
}

function cleanupExistingFiles(baseDir) {
  let count = 0;
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.endsWith('.testproj')) {
        walk(full);
      } else if (entry.isFile() && entry.name === modelCdsJsonFile) {
        unlinkSync(full);
        count++;
      }
    }
  }
  walk(baseDir);
  return count;
}

// ─── Compilation (reuses determineCdsFilesToCompile from extractor) ──────────

function getCdsFilesForProject(projectDir) {
  const cdsFiles = [];
  function collectCds(dir, relBase) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.cds')) {
        cdsFiles.push(join(relBase, entry.name));
      } else if (entry.isDirectory() && !entry.name.endsWith('.testproj') && entry.name !== 'node_modules') {
        collectCds(join(dir, entry.name), join(relBase, entry.name));
      }
    }
  }
  collectCds(projectDir, '');
  return cdsFiles;
}

function compileProject(projectDir, targets, cdsDkVersion) {
  const args = [
    '--yes', '--package', `@sap/cds-dk@${cdsDkVersion}`,
    'cds', 'compile', ...targets,
    '--locations', '--to', 'json', '--dest', modelCdsJsonFile, '--log-level', 'warn',
  ];

  const result = spawnSync('npx', args, {
    cwd: projectDir,
    shell: true,
    stdio: 'pipe',
    timeout: 300_000,
  });

  return {
    success: result.status === 0,
    stderr: result.stderr?.toString() || '',
    exitCode: result.status,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const baseDir = resolve(PROJECT_ROOT, process.argv[2] || DEFAULT_BASE_DIR);

if (!existsSync(baseDir)) {
  console.error(`Error: Base directory does not exist: ${baseDir}`);
  process.exit(1);
}

console.log('CDS test compilation script');
console.log(`Project root: ${PROJECT_ROOT}`);
console.log(`Base directory: ${baseDir}`);
console.log('');

// Initialize the CDS extractor logging system (required before calling extractor functions)
setSourceRootDirectory(PROJECT_ROOT);

// Step 1: Clean up
console.log('Cleaning up existing model.cds.json files...');
const cleaned = cleanupExistingFiles(baseDir);
console.log(`Cleaned ${cleaned} file(s).`);
console.log('');

// Step 2: Discover test directories
console.log('Scanning for test directories...');
const testDirs = findTestDirs(baseDir);
console.log(`Found ${testDirs.length} test directory(ies).`);
console.log('');

// Step 3: Compile each
const processed = new Set();
let generated = 0;

for (const testDir of testDirs) {
  if (processed.has(testDir)) continue;

  const relDir = testDir.replace(PROJECT_ROOT, '').replace(/^[/\\]/, '');
  console.log(`Processing: ${relDir}`);

  if (!hasCdsFiles(testDir)) {
    console.log('  Skipping (no .cds files)');
    console.log('');
    continue;
  }

  // Resolve version using extractor's readPackageJsonFile
  const cdsDkVersion = resolvePreferredCdsDkVersion(testDir);
  console.log(`  CDS-DK version: ${cdsDkVersion}`);

  // Determine targets using extractor's determineCdsFilesToCompile
  const cdsFiles = getCdsFilesForProject(testDir);
  const { compilationTargets } = determineCdsFilesToCompile(testDir, {
    cdsFiles,
    projectDir: '',
  });

  if (compilationTargets.length === 0) {
    console.log('  Skipping (no compilation targets)');
    console.log('');
    continue;
  }
  console.log(`  Targets: ${compilationTargets.join(' ')}`);

  // Compile
  console.log('  Compiling...');
  const result = compileProject(testDir, compilationTargets, cdsDkVersion);
  const outputPath = join(testDir, modelCdsJsonFile);

  if (result.success && existsSync(outputPath)) {
    // Normalize paths using extractor's normalizeLocationPathsInFile
    normalizeLocationPathsInFile(outputPath);
    console.log(`  ✓ Generated ${modelCdsJsonFile}`);
    generated++;
    processed.add(testDir);
  } else {
    console.log(`  ✗ Failed (exit ${result.exitCode})`);
    if (result.stderr) {
      const msg = result.stderr.split('\n').find(l => l.trim() && !l.includes('npm warn'));
      if (msg) console.log(`    ${msg.trim()}`);
    }
  }
  console.log('');
}

console.log('=== COMPILATION SUMMARY ===');
console.log(`Generated ${generated} model.cds.json file(s) from ${testDirs.length} test directories.`);
