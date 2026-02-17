/** CDS indexer support for SAP CAP projects that use @sap/cds-indexer. */

import { spawnSync } from 'child_process';
import { delimiter, join } from 'path';

import { addCdsIndexerDiagnostic } from '../diagnostics';
import { cdsExtractorLog } from '../logging';
import type { CdsDependencyGraph, CdsProject } from './parser/types';

/** Maximum time (ms) allowed for a single cds-indexer invocation. */
const CDS_INDEXER_TIMEOUT_MS = 120_000;

/** The npm package name for cds-indexer. */
const CDS_INDEXER_PACKAGE = '@sap/cds-indexer';

/**
 * Result of running @sap/cds-indexer for a single project.
 */
export interface CdsIndexerResult {
  /** Whether the cds-indexer ran successfully. */
  success: boolean;
  /** The project directory (relative to source root). */
  projectDir: string;
  /** Error message if the run failed. */
  error?: string;
  /** Duration of the run in milliseconds. */
  durationMs: number;
  /** Whether the run timed out. */
  timedOut: boolean;
}

/**
 * Summary of running cds-indexer across all applicable projects.
 */
export interface CdsIndexerSummary {
  /** Total number of projects in the dependency graph. */
  totalProjects: number;
  /** Number of projects that required cds-indexer. */
  projectsRequiringIndexer: number;
  /** Number of successful cds-indexer runs. */
  successfulRuns: number;
  /** Number of failed cds-indexer runs. */
  failedRuns: number;
  /** Per-project results (only for projects that required cds-indexer). */
  results: CdsIndexerResult[];
}

/**
 * Determines whether a {@link CdsProject} uses `@sap/cds-indexer` by checking
 * the project's `package.json` for the package in `dependencies` or `devDependencies`.
 *
 * @param project The CDS project to check.
 * @returns `true` if the project declares `@sap/cds-indexer` as a dependency.
 */
export function projectUsesCdsIndexer(project: CdsProject): boolean {
  if (!project.packageJson) {
    return false;
  }

  const inDeps = project.packageJson.dependencies?.[CDS_INDEXER_PACKAGE] !== undefined;
  const inDevDeps = project.packageJson.devDependencies?.[CDS_INDEXER_PACKAGE] !== undefined;

  return inDeps || inDevDeps;
}

/**
 * Runs `npx @sap/cds-indexer` for a given CDS project directory.
 *
 * The function spawns `npx @sap/cds-indexer` with appropriate environment
 * variables to ensure the indexer can locate dependencies from the cache
 * directory (if provided) or the project's own `node_modules`.
 *
 * @param project The CDS project to run the indexer for.
 * @param sourceRoot The source root directory.
 * @param cacheDir Optional cache directory containing installed dependencies.
 * @returns A {@link CdsIndexerResult} with the outcome of the run.
 */
export function runCdsIndexer(
  project: CdsProject,
  sourceRoot: string,
  cacheDir?: string,
): CdsIndexerResult {
  const projectAbsPath = join(sourceRoot, project.projectDir);
  const startTime = Date.now();

  const result: CdsIndexerResult = {
    success: false,
    projectDir: project.projectDir,
    durationMs: 0,
    timedOut: false,
  };

  try {
    // Build NODE_PATH to include cache and project node_modules so npx can
    // resolve the package even when it was installed in the cache directory.
    const nodePaths: string[] = [];
    if (cacheDir) {
      nodePaths.push(join(cacheDir, 'node_modules'));
    }
    nodePaths.push(join(projectAbsPath, 'node_modules'));

    const env: Record<string, string | undefined> = {
      ...process.env,
      NODE_PATH: nodePaths.join(delimiter),
    };

    cdsExtractorLog(
      'info',
      `Running ${CDS_INDEXER_PACKAGE} for project '${project.projectDir}'...`,
    );

    const spawnResult = spawnSync('npx', ['--yes', CDS_INDEXER_PACKAGE], {
      cwd: projectAbsPath,
      env,
      stdio: 'pipe',
      timeout: CDS_INDEXER_TIMEOUT_MS,
    });

    result.durationMs = Date.now() - startTime;

    // Check for timeout (signal-based termination)
    if (spawnResult.signal === 'SIGTERM' || spawnResult.signal === 'SIGKILL') {
      result.timedOut = true;
      result.error = `${CDS_INDEXER_PACKAGE} timed out after ${CDS_INDEXER_TIMEOUT_MS}ms for project '${project.projectDir}'`;
      cdsExtractorLog('warn', result.error);
      return result;
    }

    // Check for spawn error (e.g. npx not found)
    if (spawnResult.error) {
      result.error = `${CDS_INDEXER_PACKAGE} failed to start for project '${project.projectDir}': ${String(spawnResult.error)}`;
      cdsExtractorLog('warn', result.error);
      return result;
    }

    // Check exit code
    if (spawnResult.status !== 0) {
      const stderr = spawnResult.stderr?.toString().trim() ?? '';
      const stdout = spawnResult.stdout?.toString().trim() ?? '';
      const output = stderr || stdout || 'unknown error';
      result.error = `${CDS_INDEXER_PACKAGE} failed for project '${project.projectDir}' (exit code ${spawnResult.status}): ${output}`;
      cdsExtractorLog('warn', result.error);
      return result;
    }

    // Success
    result.success = true;
    cdsExtractorLog(
      'info',
      `Successfully ran ${CDS_INDEXER_PACKAGE} for project '${project.projectDir}' (${result.durationMs}ms)`,
    );
  } catch (error) {
    result.durationMs = Date.now() - startTime;
    result.error = `${CDS_INDEXER_PACKAGE} threw an unexpected error for project '${project.projectDir}': ${String(error)}`;
    cdsExtractorLog('error', result.error);
  }

  return result;
}

/**
 * Orchestrates running `@sap/cds-indexer` for all applicable projects in the
 * dependency graph. This should be called after dependency installation and
 * before CDS compilation.
 *
 * Projects that do not declare `@sap/cds-indexer` in their `package.json` are
 * skipped. Failures are handled gracefully: a diagnostic warning is added to
 * the CodeQL database and processing continues with the remaining projects.
 *
 * @param dependencyGraph The CDS dependency graph.
 * @param sourceRoot The source root directory.
 * @param projectCacheDirMap Map of project directories to their cache directories.
 * @param codeqlExePath Optional path to the CodeQL executable for diagnostics.
 * @returns A {@link CdsIndexerSummary} with the outcome of all runs.
 */
export function orchestrateCdsIndexer(
  dependencyGraph: CdsDependencyGraph,
  sourceRoot: string,
  projectCacheDirMap: Map<string, string>,
  codeqlExePath?: string,
): CdsIndexerSummary {
  const summary: CdsIndexerSummary = {
    totalProjects: dependencyGraph.projects.size,
    projectsRequiringIndexer: 0,
    successfulRuns: 0,
    failedRuns: 0,
    results: [],
  };

  for (const [projectDir, project] of dependencyGraph.projects.entries()) {
    if (!projectUsesCdsIndexer(project)) {
      continue;
    }

    summary.projectsRequiringIndexer++;
    const cacheDir = projectCacheDirMap.get(projectDir);
    const result = runCdsIndexer(project, sourceRoot, cacheDir);
    summary.results.push(result);

    if (result.success) {
      summary.successfulRuns++;
    } else {
      summary.failedRuns++;

      // Add a diagnostic warning — the compilation may still succeed without
      // the indexer, so we use a warning rather than an error.
      if (codeqlExePath) {
        addCdsIndexerDiagnostic(
          projectDir,
          result.error ?? `${CDS_INDEXER_PACKAGE} failed for project '${projectDir}'`,
          codeqlExePath,
          sourceRoot,
        );
      }
    }
  }

  // Log summary
  if (summary.projectsRequiringIndexer > 0) {
    cdsExtractorLog(
      'info',
      `CDS indexer summary: ${summary.projectsRequiringIndexer} project(s) required indexer, ${summary.successfulRuns} succeeded, ${summary.failedRuns} failed`,
    );
  } else {
    cdsExtractorLog('info', 'No projects require @sap/cds-indexer.');
  }

  return summary;
}
