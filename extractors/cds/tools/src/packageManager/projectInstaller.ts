/** Full dependency installation utilities for retry scenarios. */

import { execFileSync } from 'child_process';
import { join } from 'path';

import type { FullDependencyInstallationResult } from './types';
import type { CdsProject } from '../cds/parser';
import { cdsExtractorLog } from '../logging';

/**
 * Determines if a {@link CdsProject} requires "full" dependency installation.
 *
 * @param project The {@link CdsProject} to check
 * @returns `true` if the project has at least one compilation task that is
 * currently marked as `failed` AND has not yet been retried. Otherwise, `false`.
 */
export function needsFullDependencyInstallation(project: CdsProject): boolean {
  // Check if already installed
  if (project.retryStatus?.fullDependenciesInstalled) {
    return false;
  }

  // Check if project has failed tasks that could benefit from full dependencies.
  //
  // Currently, we only allow for one retry, because the only significant change we
  // can make (to justify a retry) is to install and use the full set of declared
  // dependencies instead of the minimal set of cached (`@sap/cds` and `@sap/cds-dk`)
  // dependencies.
  const hasFailedTasks = project.compilationTasks.some(
    task => task.status === 'failed' && !task.retryInfo?.hasBeenRetried,
  );

  return hasFailedTasks && project.packageJson !== undefined;
}

/**
 * Installs full dependencies for a {@link CdsProject} in support of retry behavior
 * for compilation tasks that fail unless the `cds` CLI/compiler has access to the
 * full set of dependencies declared for the project.
 *
 * @param project The CDS project to install dependencies for
 * @param sourceRoot Source root directory
 * @returns Installation result with details
 */
export function projectInstallDependencies(
  project: CdsProject,
  sourceRoot: string,
): FullDependencyInstallationResult {
  const startTime = Date.now();
  const projectPath = join(sourceRoot, project.projectDir);

  const result: FullDependencyInstallationResult = {
    success: false,
    projectDir: projectPath,
    warnings: [],
    durationMs: 0,
    timedOut: false,
  };

  try {
    // Check if project has package.json
    if (!project.packageJson) {
      result.error = 'No package.json found for project';
      return result;
    }

    // Install dependencies using npm in the project's directory
    cdsExtractorLog(
      'info',
      `Installing full dependencies for project ${project.projectDir} in project's node_modules`,
    );

    try {
      execFileSync('npm', ['install', '--quiet', '--no-audit', '--no-fund'], {
        cwd: projectPath,
        stdio: 'inherit',
        timeout: 120000, // 2-minute timeout
      });

      result.success = true;
      cdsExtractorLog(
        'info',
        `Successfully installed full dependencies for project ${project.projectDir}`,
      );
    } catch (execError) {
      if (execError instanceof Error && 'signal' in execError && execError.signal === 'SIGTERM') {
        result.timedOut = true;
        result.error = 'Dependency installation timed out';
      } else {
        result.error = `npm install failed: ${String(execError)}`;
      }

      // Still attempt retry compilation even if dependency installation fails (optimistic approach)
      result.warnings.push(
        `Dependency installation failed but will still attempt retry compilation: ${result.error}`,
      );
      cdsExtractorLog('warn', result.warnings[0]);
    }
  } catch (error) {
    result.error = `Failed to install full dependencies: ${String(error)}`;
    cdsExtractorLog('error', result.error);
  } finally {
    result.durationMs = Date.now() - startTime;
  }

  return result;
}
