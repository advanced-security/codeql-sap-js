import { determineCdsCommand } from './command';
import { compileCdsToJson } from './compile';
import { CompilationAttempt, CompilationTask, CompilationConfig } from './types';
import { addCompilationDiagnostic } from '../../diagnostics';
import { cdsExtractorLog, generateStatusReport } from '../../logging';
import { CdsDependencyGraph, CdsProject } from '../parser/types';

/** Attempt compilation with a specific command and configuration. */
function attemptCompilation(
  task: CompilationTask,
  cdsCommand: string,
  cacheDir: string | undefined,
  dependencyGraph: CdsDependencyGraph,
): CompilationAttempt {
  const attemptId = `${task.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const startTime = new Date();

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
            cdsFilesToCompile: value.cdsFilesToCompile,
            expectedOutputFiles: value.expectedOutputFiles,
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
  expectedOutputFiles: string[],
  projectDir: string,
  useProjectLevelCompilation: boolean,
): CompilationTask {
  return {
    id: `${type}_${projectDir}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    status: 'pending',
    sourceFiles,
    expectedOutputFiles,
    projectDir,
    attempts: [],
    useProjectLevelCompilation,
    dependencies: [],
  };
}

function createCompilationConfig(
  cdsCommand: string,
  cacheDir: string | undefined,
  useProjectLevel: boolean,
): CompilationConfig {
  return {
    cdsCommand: cdsCommand,
    cacheDir: cacheDir,
    useProjectLevelCompilation: useProjectLevel,
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
  codeqlExePath: string,
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
    dependencyGraph.statusSummary.successfulCompilations++;
    return;
  }

  // Compilation failed - mark task as failed
  const lastError = compilationAttempt.error
    ? new Error(compilationAttempt.error.message)
    : new Error('Compilation failed');

  task.status = 'failed';
  task.errorSummary = lastError?.message || 'Compilation failed';
  dependencyGraph.statusSummary.failedCompilations++;

  // Add diagnostic for failed compilation
  for (const sourceFile of task.sourceFiles) {
    addCompilationDiagnostic(sourceFile, task.errorSummary, codeqlExePath);
  }

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
    planCompilationTasks(dependencyGraph, projectCacheDirMap);

    executeCompilationTasks(dependencyGraph, codeqlExePath);

    // Update overall status
    const hasFailures =
      dependencyGraph.statusSummary.failedCompilations > 0 ||
      dependencyGraph.errors.critical.length > 0;

    dependencyGraph.statusSummary.overallSuccess = !hasFailures;
    dependencyGraph.currentPhase = hasFailures ? 'failed' : 'completed';

    // Generate and log a "Post-Compilation" status report, aka before the JavaScript extractor runs.
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

      // Determine CDS command
      const cdsCommand = determineCdsCommand(cacheDir, dependencyGraph.sourceRootDir);

      // Create compilation configuration
      const compilationConfig = createCompilationConfig(
        cdsCommand,
        cacheDir,
        project.cdsFilesToCompile.includes('__PROJECT_LEVEL_COMPILATION__'),
      );

      project.enhancedCompilationConfig = compilationConfig;

      // Create compilation tasks
      if (project.cdsFilesToCompile.includes('__PROJECT_LEVEL_COMPILATION__')) {
        // Project-level compilation
        const task = createCompilationTask(
          'project',
          project.cdsFiles,
          project.expectedOutputFiles,
          projectDir,
          true,
        );
        project.compilationTasks = [task];
      } else {
        // Individual file compilation
        const tasks: CompilationTask[] = [];
        for (const cdsFile of project.cdsFilesToCompile) {
          const expectedOutput = `${cdsFile}.json`;
          const task = createCompilationTask(
            'file',
            [cdsFile],
            [expectedOutput],
            projectDir,
            false,
          );
          tasks.push(task);
        }
        project.compilationTasks = tasks;
      }

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
