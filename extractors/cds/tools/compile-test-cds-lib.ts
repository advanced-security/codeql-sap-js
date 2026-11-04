/**
 * Entry point for the CDS test compilation workflow script.
 *
 * This module re-exports functions from the CDS extractor source code that are
 * needed by the `compile-test-cds.mjs` workflow script to compile CDS files
 * into `model.cds.json` for CodeQL unit tests, using the same logic as the
 * CDS extractor itself (version resolution, compilation targets, path normalization).
 */

export { sync as spawnSync } from 'cross-spawn';

export { withCdsCompilationTargets } from './src/cds/compiler/targets';

export { normalizeCdsJsonLocations, normalizeLocationPathsInFile } from './src/filesystem';

export { determineCdsFilesToCompile, readPackageJsonFile } from './src/cds/parser/functions';

export { modelCdsJsonFile } from './src/constants';

export { setSourceRootDirectory } from './src/logging';
