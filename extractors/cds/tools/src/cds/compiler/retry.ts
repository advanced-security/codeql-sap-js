/** Main retry orchestration logic for CDS compilation failures. */

import { compileCdsToJson } from './compile';
import type {
  CompilationAttempt,
  CompilationTask,
  ResultRetryCompilationTask,
  ResultRetryCompilationOrchestration,
  ValidatedCdsCommand,
} from './types';
import { identifyTasksRequiringRetry, updateCdsDependencyGraphStatus } from './validator';
import { addCompilationDiagnostic } from '../../diagnostics';
import { cdsExtractorLog } from '../../logging';
import { needsFullDependencyInstallation, projectInstallDependencies } from '../../packageManager';
import type { CdsDependencyGraph, CdsProject } from '../parser';

/**
 * Add diagnostics only for tasks with `status: failed` in the {@link CdsDependencyGraph}.
 * @param dependencyGraph The dependency graph to use as the source of truth for task status
 * @param codeqlExePath Path to CodeQL executable used to add a diagnostic notification
 * @param sourceRoot Source root directory to use for making file paths relative
 */
function addCompilationDiagnosticsForFailedTasks(
  dependencyGraph: CdsDependencyGraph,
  codeqlExePath: string,
  sourceRoot: string,
): void {
  for (const project of dependencyGraph.projects.values()) {
    for (const task of project.compilationTasks) {
      // Add diagnostics for tasks that currently have a `status` of 'failed'.
      if (task.status === 'failed') {
        // Add a diagnostic if the task:
        //  - failed initially and was never retried, or...
        //  - failed initially and was retried without success (or without updating status).
        const shouldAddDiagnostic = task.retryInfo?.hasBeenRetried ?? !task.retryInfo;

        if (shouldAddDiagnostic) {
          for (const sourceFile of task.sourceFiles) {
            addCompilationDiagnostic(
              sourceFile,
              task.errorSummary ?? 'Compilation failed',
              codeqlExePath,
              sourceRoot,
            );
          }
        }
      }
    }
  }
}

/**
 * Main orchestration function for retrying failed tasks in the {@link CdsDependencyGraph}.
 * @param dependencyGraph The dependency graph containing compilation tasks
 * @param codeqlExePath Path to `codeql` executable to use for adding diagnostic notifications
 * @returns The {@link ResultRetryCompilationOrchestration}
 */
export function orchestrateRetryAttempts(
  dependencyGraph: CdsDependencyGraph,
  codeqlExePath: string,
): ResultRetryCompilationOrchestration {
  const startTime = Date.now();
  let dependencyInstallationStartTime = 0;
  let dependencyInstallationEndTime = 0;
  let retryCompilationStartTime = 0;
  let retryCompilationEndTime = 0;

  const result: ResultRetryCompilationOrchestration = {
    success: true,
    projectsWithRetries: [],
    totalTasksRequiringRetry: 0,
    totalSuccessfulRetries: 0,
    totalFailedRetries: 0,
    projectsWithSuccessfulDependencyInstallation: [],
    projectsWithFailedDependencyInstallation: [],
    retryDurationMs: 0,
    dependencyInstallationDurationMs: 0,
    retryCompilationDurationMs: 0,
  };

  try {
    // Phase 1: Validate current outputs and identify failed tasks.
    cdsExtractorLog('info', 'Identifying tasks requiring retry...');
    const tasksRequiringRetry = identifyTasksRequiringRetry(dependencyGraph);

    if (tasksRequiringRetry.size === 0) {
      cdsExtractorLog('info', 'No tasks require retry - all compilations successful');
      return result;
    }

    // Update retry status tracking.
    result.totalTasksRequiringRetry = Array.from(tasksRequiringRetry.values()).reduce(
      (sum, tasks) => sum + tasks.length,
      0,
    );
    dependencyGraph.retryStatus.totalTasksRequiringRetry = result.totalTasksRequiringRetry;

    // Phase 2: Install full dependencies for projects with failed tasks.
    dependencyInstallationStartTime = Date.now();
    for (const [projectDir, failedTasks] of tasksRequiringRetry) {
      const project = dependencyGraph.projects.get(projectDir);
      if (!project) {
        continue;
      }

      if (needsFullDependencyInstallation(project)) {
        try {
          const installResult = projectInstallDependencies(project, dependencyGraph.sourceRootDir);

          // Update project retry status.
          project.retryStatus ??= {
            fullDependenciesInstalled: false,
            tasksRequiringRetry: failedTasks.length,
            tasksRetried: 0,
            installationErrors: [],
          };

          if (installResult.success) {
            project.retryStatus.fullDependenciesInstalled = true;
            result.projectsWithSuccessfulDependencyInstallation.push(projectDir);
            dependencyGraph.retryStatus.projectsWithFullDependencies.add(projectDir);
          } else {
            project.retryStatus.installationErrors = [
              ...(project.retryStatus.installationErrors ?? []),
              installResult.error ?? 'Unknown installation error',
            ];
            result.projectsWithFailedDependencyInstallation.push(projectDir);
          }

          if (installResult.warnings.length > 0) {
            for (const warning of installResult.warnings) {
              dependencyGraph.errors.warnings.push({
                phase: 'retry_dependency_installation',
                message: warning,
                timestamp: new Date(),
                context: projectDir,
              });
            }
          }
        } catch (error) {
          const errorMessage = `Failed to install full dependencies for project ${projectDir}: ${String(error)}`;
          cdsExtractorLog('error', errorMessage);

          dependencyGraph.errors.critical.push({
            phase: 'retry_dependency_installation',
            message: errorMessage,
            timestamp: new Date(),
          });

          result.projectsWithFailedDependencyInstallation.push(projectDir);
        }
      }

      dependencyGraph.retryStatus.projectsRequiringFullDependencies.add(projectDir);
    }

    dependencyInstallationEndTime = Date.now();
    result.dependencyInstallationDurationMs =
      dependencyInstallationEndTime - dependencyInstallationStartTime;

    // Phase 3: Execute retry compilation attempts.
    cdsExtractorLog('info', 'Executing retry compilation attempts...');
    retryCompilationStartTime = Date.now();

    for (const [projectDir, failedTasks] of tasksRequiringRetry) {
      const project = dependencyGraph.projects.get(projectDir);
      if (!project) {
        continue;
      }

      const retryExecutionResult = retryCompilationTasksForProject(
        failedTasks,
        project,
        dependencyGraph,
      );

      result.projectsWithRetries.push(projectDir);
      result.totalSuccessfulRetries += retryExecutionResult.successfulRetries;
      result.totalFailedRetries += retryExecutionResult.failedRetries;

      // Update project retry status.
      if (project.retryStatus) {
        project.retryStatus.tasksRetried = retryExecutionResult.retriedTasks.length;
      }
    }

    retryCompilationEndTime = Date.now();
    result.retryCompilationDurationMs = retryCompilationEndTime - retryCompilationStartTime;

    // After retry compilation attempts complete, update status.
    updateCdsDependencyGraphStatus(dependencyGraph, dependencyGraph.sourceRootDir);

    // Phase 4: Update dependency graph with retry results.
    updateDependencyGraphWithRetryResults(dependencyGraph, result);

    // Phase 5: Add diagnostics for definitively failed tasks.
    addCompilationDiagnosticsForFailedTasks(
      dependencyGraph,
      codeqlExePath,
      dependencyGraph.sourceRootDir,
    );

    result.success = result.totalSuccessfulRetries > 0 || result.totalTasksRequiringRetry === 0;
  } catch (error) {
    const errorMessage = `Retry orchestration failed: ${String(error)}`;
    cdsExtractorLog('error', errorMessage);

    dependencyGraph.errors.critical.push({
      phase: 'retry_orchestration',
      message: errorMessage,
      timestamp: new Date(),
    });

    result.success = false;
  } finally {
    result.retryDurationMs = Date.now() - startTime;
  }

  return result;
}

/**
 * Retry the provided {@link CompilationTask} using the task's configured retry command.
 * @param task The {@link CompilationTask} to be retried
 * @param retryCommand Validated CDS command to use for retry
 * @param projectDir Project directory to use as working directory
 * @param dependencyGraph The {@link CdsDependencyGraph} to be processed and updated
 * if retry succeeds.
 * @returns The result of the {@link CompilationAttempt}.
 */
function retryCompilationTask(
  task: CompilationTask,
  retryCommand: ValidatedCdsCommand,
  projectDir: string,
  dependencyGraph: CdsDependencyGraph,
): CompilationAttempt {
  const startTime = new Date();
  const attemptId = `${task.id}_retry_${startTime.getTime()}`;

  // Use the original command string for consistency with existing compilation logic.
  const cdsCommandString = retryCommand.originalCommand;

  const attempt: CompilationAttempt = {
    id: attemptId,
    cdsCommand: cdsCommandString,
    cacheDir: projectDir,
    timestamp: startTime,
    result: {
      success: false,
      timestamp: startTime,
    },
  };

  try {
    // Use the same compilation logic as the original attempt.
    const primarySourceFile = task.sourceFiles[0];

    const compilationResult = compileCdsToJson(
      primarySourceFile,
      dependencyGraph.sourceRootDir,
      cdsCommandString,
      projectDir,
      // Convert CDS projects to BasicCdsProject format expected by compileCdsToJson
      new Map(
        Array.from(dependencyGraph.projects.entries()).map(([key, value]) => [
          key,
          {
            cdsFiles: value.cdsFiles,
            compilationTargets: value.compilationTargets,
            expectedOutputFile: value.expectedOutputFile,
            projectDir: value.projectDir,
            dependencies: value.dependencies,
            imports: value.imports,
            packageJson: value.packageJson,
          },
        ]),
      ),
      task.projectDir,
    );

    attempt.result = {
      ...compilationResult,
      timestamp: startTime,
    };
  } catch (error) {
    attempt.error = {
      message: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  return attempt;
}

/**
 * Executes retries for the provided array of {@link CompilationTask} instances.
 * @param tasksToRetry Tasks that need to be retried
 * @param project The {@link CdsProject} associated with the compilation tasks to retry
 * @param dependencyGraph The {@link CdsDependencyGraph} to update as tasks are retried
 * @returns The {@link ResultRetryCompilationTask}
 */
function retryCompilationTasksForProject(
  tasksToRetry: CompilationTask[],
  project: CdsProject,
  dependencyGraph: CdsDependencyGraph,
): ResultRetryCompilationTask {
  const startTime = Date.now();

  const result: ResultRetryCompilationTask = {
    projectDir: project.projectDir,
    retriedTasks: [],
    successfulRetries: 0,
    failedRetries: 0,
    fullDependenciesAvailable: Boolean(project.retryStatus?.fullDependenciesInstalled),
    executionDurationMs: 0,
    retryErrors: [],
  };

  cdsExtractorLog(
    'info',
    `Retrying ${tasksToRetry.length} task(s) for project ${project.projectDir} using ${result.fullDependenciesAvailable ? 'full' : 'minimal'} dependencies`,
  );

  for (const task of tasksToRetry) {
    try {
      // Mark task as being retried
      task.retryInfo = {
        hasBeenRetried: true,
        retryReason: 'Output validation failed',
        fullDependenciesInstalled: result.fullDependenciesAvailable,
        retryTimestamp: new Date(),
      };

      // Use the retry command configured for this task
      const retryAttempt = retryCompilationTask(
        task,
        task.retryCommand,
        project.projectDir,
        dependencyGraph,
      );

      task.retryInfo.retryAttempt = retryAttempt;
      task.attempts.push(retryAttempt);
      result.retriedTasks.push(task);

      if (retryAttempt.result.success) {
        task.status = 'success';
        result.successfulRetries++;
        cdsExtractorLog('info', `Retry successful for task ${task.id}`);
      } else {
        task.status = 'failed';
        task.errorSummary = retryAttempt.error?.message ?? 'Retry compilation failed';
        result.failedRetries++;
        result.retryErrors.push(task.errorSummary);
        cdsExtractorLog('warn', `Retry failed for task ${task.id}: ${task.errorSummary}`);
      }
    } catch (error) {
      const errorMessage = `Failed to retry task ${task.id}: ${String(error)}`;
      result.retryErrors.push(errorMessage);
      result.failedRetries++;
      task.status = 'failed';
      task.errorSummary = errorMessage;
      cdsExtractorLog('error', errorMessage);
    }
  }

  result.executionDurationMs = Date.now() - startTime;

  cdsExtractorLog(
    'info',
    `Retry execution completed for project ${project.projectDir}: ${result.successfulRetries} successful, ${result.failedRetries} failed`,
  );

  return result;
}

/**
 * Updates dependency graph with retry results
 * @param dependencyGraph The dependency graph to update
 * @param retryResults The retry orchestration results
 */
function updateDependencyGraphWithRetryResults(
  dependencyGraph: CdsDependencyGraph,
  retryResults: ResultRetryCompilationOrchestration,
): void {
  // Remove manual counter updates - let updateCdsDependencyGraphStatus handle this
  // Keep only non-status updates like timing and project tracking
  dependencyGraph.retryStatus.totalRetryAttempts =
    retryResults.totalSuccessfulRetries + retryResults.totalFailedRetries;
}
