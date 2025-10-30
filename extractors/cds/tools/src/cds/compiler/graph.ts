import { determineCdsCommand, determineVersionAwareCdsCommands } from './command';
import { compileCdsToJson } from './compile';
import { orchestrateRetryAttempts } from './retry';
import {
  CompilationAttempt,
  CompilationTask,
  CompilationConfig,
  ValidatedCdsCommand,
} from './types';
import { updateCdsDependencyGraphStatus } from './validator';
import { cdsExtractorLog, generateStatusReport } from '../../logging';
import { CdsDependencyGraph, CdsProject } from '../parser/types';

/** Attempt compilation with a specific command and configuration. */
function attemptCompilation(
  task: CompilationTask,
  cdsCommand: string,
  cacheDir: string | undefined,
  dependencyGraph: CdsDependencyGraph,
): CompilationAttempt {
  const startTime = new Date();
  const attemptId = `${task.id}_${startTime.getTime()}`;

  const attempt: CompilationAttempt = {
    id: attemptId,
    cdsCommand,
    cacheDir,
    timestamp: startTime,
    result: {
      success: false,
      timestamp: startTime,
    },
  };

  try {
    // For now, we'll use the first source file for compilation
    // In a more sophisticated implementation, we might handle project-level compilation differently
    const primarySourceFile = task.sourceFiles[0];

    const compilationResult = compileCdsToJson(
      primarySourceFile,
      dependencyGraph.sourceRootDir,
      cdsCommand,
      cacheDir,
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
            compilationConfig: value.compilationConfig,
          },
        ]),
      ),
      task.projectDir,
    );

    const endTime = new Date();
    attempt.result = {
      ...compilationResult,
      timestamp: endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      commandUsed: cdsCommand,
      cacheDir,
    };

    if (compilationResult.success && compilationResult.outputPath) {
      dependencyGraph.statusSummary.jsonFilesGenerated++;
    }
  } catch (error) {
    const endTime = new Date();
    attempt.error = {
      message: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    attempt.result.timestamp = endTime;
    attempt.result.durationMs = endTime.getTime() - startTime.getTime();
  }

  task.attempts.push(attempt);
  return attempt;
}

/**
 * Create a compilation task for a project or individual file
 */
function createCompilationTask(
  type: 'file' | 'project',
  sourceFiles: string[],
  expectedOutputFile: string,
  projectDir: string,
): CompilationTask {
  // Create default commands for tasks - these should be updated later with proper commands
  const defaultPrimaryCommand: ValidatedCdsCommand = {
    executable: 'cds',
    args: [],
    originalCommand: 'cds',
  };

  const defaultRetryCommand: ValidatedCdsCommand = {
    executable: 'npx',
    args: ['cds'],
    originalCommand: 'npx cds',
  };

  return {
    id: `${type}_${projectDir}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    status: 'pending',
    sourceFiles,
    expectedOutputFile,
    projectDir,
    attempts: [],
    dependencies: [],
    primaryCommand: defaultPrimaryCommand,
    retryCommand: defaultRetryCommand,
  };
}

function createCompilationConfig(
  cdsCommand: string,
  cacheDir: string | undefined,
): CompilationConfig {
  return {
    cdsCommand: cdsCommand,
    cacheDir: cacheDir,
    versionCompatibility: {
      isCompatible: true, // Will be validated during planning
    },
    maxRetryAttempts: 3,
  };
}

/**
 * Execute a single compilation task
 */
function executeCompilationTask(
  task: CompilationTask,
  project: CdsProject,
  dependencyGraph: CdsDependencyGraph,
  _codeqlExePath: string,
): void {
  task.status = 'in_progress';

  const config = project.enhancedCompilationConfig;
  if (!config) {
    throw new Error(`No compilation configuration found for project ${project.projectDir}`);
  }

  const compilationAttempt = attemptCompilation(
    task,
    config.cdsCommand,
    config.cacheDir,
    dependencyGraph,
  );

  if (compilationAttempt.result.success) {
    task.status = 'success';
    return;
  }

  // Compilation failed - mark task as failed
  const lastError = compilationAttempt.error
    ? new Error(compilationAttempt.error.message)
    : new Error('Compilation failed');

  task.status = 'failed';
  task.errorSummary = lastError?.message || 'Compilation failed';

  // Note: Diagnostics are deferred until after retry phase completes
  // to implement "Silent Success" - only add diagnostics for definitively failed tasks

  cdsExtractorLog('error', `Compilation failed for task ${task.id}: ${task.errorSummary}`);
}

/**
 * Executes all compilation tasks for the provided {@link CdsDependencyGraph}.
 * Uses the provided `codeqlExePath` to run the CodeQL CLI, as needed, for
 * generating diagnositic warnings and/or errors for problems encountered while
 * running the CodeQL CDS extractor.
 */
function executeCompilationTasks(dependencyGraph: CdsDependencyGraph, codeqlExePath: string): void {
  cdsExtractorLog('info', 'Starting compilation execution for all projects...');

  dependencyGraph.currentPhase = 'compiling';
  const compilationStartTime = new Date();

  // Collect all compilation tasks from all projects.
  const allTasks: Array<{ task: CompilationTask; project: CdsProject }> = [];

  for (const project of dependencyGraph.projects.values()) {
    for (const task of project.compilationTasks) {
      allTasks.push({ task, project });
    }
  }

  // Execute compilation tasks sequentially. There is room for optimization in the future.
  // For now, we keep it simple to ensure consistent debug information collection.
  cdsExtractorLog('info', `Executing ${allTasks.length} compilation task(s)...`);
  for (const { task, project } of allTasks) {
    try {
      executeCompilationTask(task, project, dependencyGraph, codeqlExePath);
    } catch (error) {
      const errorMessage = `Failed to execute compilation task ${task.id}: ${String(error)}`;
      cdsExtractorLog('error', errorMessage);

      dependencyGraph.errors.critical.push({
        phase: 'compiling',
        message: errorMessage,
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined,
      });

      task.status = 'failed';
      task.errorSummary = errorMessage;
      dependencyGraph.statusSummary.failedCompilations++;
    }
  }

  // Update project statuses
  for (const project of dependencyGraph.projects.values()) {
    const allTasksCompleted = project.compilationTasks.every(
      task => task.status === 'success' || task.status === 'failed',
    );

    if (allTasksCompleted) {
      const hasFailedTasks = project.compilationTasks.some(task => task.status === 'failed');
      project.status = hasFailedTasks ? 'failed' : 'completed';
      project.timestamps.compilationCompleted = new Date();
    }
  }

  const compilationEndTime = new Date();
  dependencyGraph.statusSummary.performance.compilationDurationMs =
    compilationEndTime.getTime() - compilationStartTime.getTime();

  cdsExtractorLog(
    'info',
    `Compilation execution completed. Success: ${dependencyGraph.statusSummary.successfulCompilations}, Failed: ${dependencyGraph.statusSummary.failedCompilations}`,
  );
}

/**
 * Orchestrates the compilation process for CDS files based on a dependency graph.
 *
 * This function coordinates the planning and execution of compilation tasks,
 * tracks the compilation status, and generates a post-compilation report.
 *
 * @param dependencyGraph - The {@link CdsDependencyGraph} representing the CDS projects,
 * project dependencies, expected compilation tasks, and their statuses.
 * @param projectCacheDirMap - A map from project identifiers to their cache directory paths.
 * @param codeqlExePath - The path to the CodeQL executable. Used for generating diagnostic
 * messages as part of the broader CodeQL (JavaScript) extraction process.
 * @throws Will rethrow any errors encountered during compilation, after logging them.
 */
export function orchestrateCompilation(
  dependencyGraph: CdsDependencyGraph,
  projectCacheDirMap: Map<string, string>,
  codeqlExePath: string,
): void {
  try {
    // Phase 1: Initial compilation
    planCompilationTasks(dependencyGraph, projectCacheDirMap);
    executeCompilationTasks(dependencyGraph, codeqlExePath);

    // CENTRALIZED STATUS UPDATE: Establish post-initial-compilation state
    updateCdsDependencyGraphStatus(dependencyGraph, dependencyGraph.sourceRootDir);

    // Phase 2: Retry orchestration
    cdsExtractorLog('info', 'Starting retry orchestration phase...');
    const retryResults = orchestrateRetryAttempts(dependencyGraph, codeqlExePath);

    // CENTRALIZED STATUS UPDATE: Final validation and status synchronization
    updateCdsDependencyGraphStatus(dependencyGraph, dependencyGraph.sourceRootDir);

    // Log retry results
    if (retryResults.totalTasksRequiringRetry > 0) {
      cdsExtractorLog(
        'info',
        `Retry phase completed: ${retryResults.totalTasksRequiringRetry} tasks retried, ${retryResults.totalSuccessfulRetries} successful, ${retryResults.totalFailedRetries} failed`,
      );
    } else {
      cdsExtractorLog('info', 'Retry phase completed: no tasks required retry');
    }

    // Phase 3: Final status update
    const hasFailures =
      dependencyGraph.statusSummary.failedCompilations > 0 ||
      dependencyGraph.errors.critical.length > 0;

    dependencyGraph.statusSummary.overallSuccess = !hasFailures;
    dependencyGraph.currentPhase = hasFailures ? 'failed' : 'completed';

    // Phase 3: Status reporting (now guaranteed to be accurate)
    const statusReport = generateStatusReport(dependencyGraph);
    cdsExtractorLog('info', 'CDS Extractor Status Report : Post-Compilation...\n' + statusReport);
  } catch (error) {
    const errorMessage = `Compilation orchestration failed: ${String(error)}`;
    cdsExtractorLog('error', errorMessage);

    dependencyGraph.errors.critical.push({
      phase: 'compiling',
      message: errorMessage,
      timestamp: new Date(),
      stack: error instanceof Error ? error.stack : undefined,
    });

    dependencyGraph.currentPhase = 'failed';
    dependencyGraph.statusSummary.overallSuccess = false;

    throw error;
  }
}

/** Plan compilation tasks for all projects in the dependency graph. */
function planCompilationTasks(
  dependencyGraph: CdsDependencyGraph,
  projectCacheDirMap: Map<string, string>,
): void {
  cdsExtractorLog('info', 'Planning compilation tasks for all projects...');

  dependencyGraph.currentPhase = 'compilation_planning';

  for (const [projectDir, project] of dependencyGraph.projects.entries()) {
    try {
      const cacheDir = projectCacheDirMap.get(projectDir);

      // Determine version-aware CDS commands for both primary and retry scenarios
      const commands = determineVersionAwareCdsCommands(
        cacheDir,
        dependencyGraph.sourceRootDir,
        projectDir,
        dependencyGraph,
      );

      // Keep backward compatibility - determine command string for compilation config
      const cdsCommand = determineCdsCommand(cacheDir, dependencyGraph.sourceRootDir);

      // Create compilation configuration (always project-level now)
      const compilationConfig = createCompilationConfig(cdsCommand, cacheDir);

      project.enhancedCompilationConfig = compilationConfig;

      // Create compilation task (always project-level now)
      const task = createCompilationTask(
        'project',
        project.cdsFiles,
        project.expectedOutputFile,
        projectDir,
      );

      // Update task with version-aware commands
      task.primaryCommand = commands.primaryCommand;
      task.retryCommand = commands.retryCommand;

      project.compilationTasks = [task];

      project.status = 'compilation_planned';
      project.timestamps.compilationStarted = new Date();

      cdsExtractorLog(
        'info',
        `Planned ${project.compilationTasks.length} compilation task(s) for project ${projectDir}`,
      );
    } catch (error) {
      const errorMessage = `Failed to plan compilation for project ${projectDir}: ${String(error)}`;
      cdsExtractorLog('error', errorMessage);

      dependencyGraph.errors.critical.push({
        phase: 'compilation_planning',
        message: errorMessage,
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined,
      });

      project.status = 'failed';
    }
  }

  const totalTasks = Array.from(dependencyGraph.projects.values()).reduce(
    (sum, project) => sum + project.compilationTasks.length,
    0,
  );

  dependencyGraph.statusSummary.totalCompilationTasks = totalTasks;

  cdsExtractorLog('info', `Compilation planning completed. Total tasks: ${totalTasks}`);
}
