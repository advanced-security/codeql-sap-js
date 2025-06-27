import { determineCdsCommand, getCommandAnalysisForDebug } from './command';
import { compileCdsToJson } from './compile';
import {
  AlternativeCdsCommand,
  CompilationAttempt,
  CompilationTask,
  EnhancedCompilationConfig,
} from './types';
import { addCompilationDiagnostic } from '../../diagnostics';
import { cdsExtractorLog } from '../../logging';
import { CdsDependencyGraph, EnhancedCdsProject } from '../parser/types';

/**
 * Create a compilation task for a project or individual file
 */
function createCompilationTask(
  type: 'file' | 'project',
  sourceFiles: string[],
  expectedOutputFiles: string[],
  projectDir: string,
  useProjectLevelCompilation: boolean,
  priority: number = 0,
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
    priority,
    dependencies: [],
  };
}

/**
 * Create enhanced compilation configuration with retry alternatives
 */
function createEnhancedCompilationConfig(
  primaryCommand: string,
  primaryCacheDir: string | undefined,
  useProjectLevel: boolean,
  alternatives: AlternativeCdsCommand[] = [],
): EnhancedCompilationConfig {
  return {
    primaryCdsCommand: primaryCommand,
    primaryCacheDir,
    useProjectLevelCompilation: useProjectLevel,
    alternativeCommands: alternatives,
    versionCompatibility: {
      isCompatible: true, // Will be validated during planning
    },
    maxRetryAttempts: 3,
  };
}

/**
 * Plan compilation tasks for all projects in the dependency graph
 */
export function planCompilationTasks(
  dependencyGraph: CdsDependencyGraph,
  projectCacheDirMap: Map<string, string>,
): void {
  cdsExtractorLog('info', 'Planning compilation tasks for all projects...');

  dependencyGraph.currentPhase = 'compilation_planning';

  for (const [projectDir, project] of dependencyGraph.projects.entries()) {
    try {
      const cacheDir = projectCacheDirMap.get(projectDir);

      // Determine primary CDS command
      const cdsCommand = determineCdsCommand(cacheDir, dependencyGraph.sourceRootDir);

      // Create enhanced compilation configuration
      const enhancedConfig = createEnhancedCompilationConfig(
        cdsCommand,
        cacheDir,
        project.cdsFilesToCompile.includes('__PROJECT_LEVEL_COMPILATION__'),
      );

      project.enhancedCompilationConfig = enhancedConfig;

      // Create compilation tasks
      if (project.cdsFilesToCompile.includes('__PROJECT_LEVEL_COMPILATION__')) {
        // Project-level compilation
        const task = createCompilationTask(
          'project',
          project.cdsFiles,
          project.expectedOutputFiles,
          projectDir,
          true,
          10, // Higher priority for project-level compilation
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
            5, // Lower priority for individual files
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

/**
 * Execute a single compilation task with retry logic
 */
function executeCompilationTask(
  task: CompilationTask,
  project: EnhancedCdsProject,
  dependencyGraph: CdsDependencyGraph,
  codeqlExePath: string,
): void {
  task.status = 'in_progress';

  const config = project.enhancedCompilationConfig;
  if (!config) {
    throw new Error(`No compilation configuration found for project ${project.projectDir}`);
  }

  let lastError: Error | undefined;

  // Try primary command first
  const primaryAttempt = attemptCompilation(
    task,
    config.primaryCdsCommand,
    config.primaryCacheDir,
    dependencyGraph,
  );

  if (primaryAttempt.result.success) {
    task.status = 'success';
    dependencyGraph.statusSummary.successfulCompilations++;
    return;
  }

  lastError = primaryAttempt.error
    ? new Error(primaryAttempt.error.message)
    : new Error('Primary compilation failed');
  task.status = 'retry';

  // Try alternative commands if primary failed
  for (const alternative of config.alternativeCommands) {
    if (task.attempts.length >= config.maxRetryAttempts) {
      break;
    }

    cdsExtractorLog(
      'info',
      `Retrying compilation for ${task.sourceFiles[0]} with alternative command: ${alternative.strategy}`,
    );

    const retryAttempt = attemptCompilation(
      task,
      alternative.command,
      alternative.cacheDir,
      dependencyGraph,
    );

    if (retryAttempt.result.success) {
      task.status = 'success';
      dependencyGraph.statusSummary.successfulCompilations++;
      dependencyGraph.statusSummary.retriedCompilations++;
      return;
    }

    lastError = retryAttempt.error ? new Error(retryAttempt.error.message) : lastError;
  }

  // All attempts failed
  task.status = 'failed';
  task.errorSummary = lastError?.message || 'All compilation attempts failed';
  dependencyGraph.statusSummary.failedCompilations++;

  // Add diagnostic for failed compilation
  for (const sourceFile of task.sourceFiles) {
    addCompilationDiagnostic(sourceFile, task.errorSummary, codeqlExePath);
  }

  cdsExtractorLog('error', `Compilation failed for task ${task.id}: ${task.errorSummary}`);
}

/**
 * Attempt compilation with a specific command and configuration
 */
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
      // Convert enhanced projects back to the format expected by compileCdsToJson
      new Map(
        Array.from(dependencyGraph.projects.entries()).map(([key, value]) => [
          key,
          value as import('../parser/types').CdsProject,
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
 * Execute all compilation tasks for the dependency graph
 */
export function executeCompilationTasks(
  dependencyGraph: CdsDependencyGraph,
  codeqlExePath: string,
): void {
  cdsExtractorLog('info', 'Starting compilation execution for all projects...');

  dependencyGraph.currentPhase = 'compiling';
  const compilationStartTime = new Date();

  // Collect all tasks and sort by priority
  const allTasks: Array<{ task: CompilationTask; project: EnhancedCdsProject }> = [];

  for (const project of dependencyGraph.projects.values()) {
    for (const task of project.compilationTasks) {
      allTasks.push({ task, project });
    }
  }

  // Sort by priority (higher priority first)
  allTasks.sort((a, b) => b.task.priority - a.task.priority);

  // Execute tasks sequentially (could be parallelized in the future)
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
 * Generate a comprehensive status report for the dependency graph
 * Supports both normal execution and debug modes
 */
export function generateStatusReport(
  dependencyGraph: CdsDependencyGraph,
  isDebugMode: boolean = false,
): string {
  const summary = dependencyGraph.statusSummary;
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`CDS EXTRACTOR ${isDebugMode ? 'DEBUG ' : ''}STATUS REPORT`);
  lines.push('='.repeat(80));
  lines.push('');

  // Overall summary
  lines.push('OVERALL SUMMARY:');
  lines.push(`  Status: ${summary.overallSuccess ? 'SUCCESS' : 'FAILED'}`);
  lines.push(`  Current Phase: ${dependencyGraph.currentPhase.toUpperCase()}`);
  lines.push(`  Projects: ${summary.totalProjects}`);
  lines.push(`  CDS Files: ${summary.totalCdsFiles}`);
  lines.push(`  JSON Files Generated: ${summary.jsonFilesGenerated}`);
  lines.push('');

  // Compilation summary
  lines.push('COMPILATION SUMMARY:');
  lines.push(`  Total Tasks: ${summary.totalCompilationTasks}`);
  lines.push(`  Successful: ${summary.successfulCompilations}`);
  lines.push(`  Failed: ${summary.failedCompilations}`);
  lines.push(`  Skipped: ${summary.skippedCompilations}`);
  lines.push(`  Retried: ${summary.retriedCompilations}`);
  lines.push('');

  // Performance metrics
  lines.push('PERFORMANCE:');
  lines.push(`  Total Duration: ${summary.performance.totalDurationMs}ms`);
  lines.push(`  Parsing: ${summary.performance.parsingDurationMs}ms`);
  lines.push(`  Compilation: ${summary.performance.compilationDurationMs}ms`);
  lines.push(`  Extraction: ${summary.performance.extractionDurationMs}ms`);
  lines.push('');

  // Debug mode specific sections
  if (isDebugMode) {
    lines.push('DEBUG INFORMATION:');
    lines.push('');

    // Environment info
    lines.push('ENVIRONMENT:');
    lines.push(`  Node Version: ${dependencyGraph.debugInfo.extractor.environment.nodeVersion}`);
    lines.push(`  Platform: ${dependencyGraph.debugInfo.extractor.environment.platform}`);
    lines.push(`  Source Root: ${dependencyGraph.sourceRootDir}`);
    lines.push(`  Script Directory: ${dependencyGraph.scriptDir}`);
    lines.push(`  Run Mode: ${dependencyGraph.debugInfo.extractor.runMode}`);
    lines.push('');

    // Parser debug info
    lines.push('PARSER DEBUG:');
    lines.push(`  Projects Detected: ${dependencyGraph.debugInfo.parser.projectsDetected}`);
    lines.push(`  CDS Files Found: ${dependencyGraph.debugInfo.parser.cdsFilesFound}`);
    lines.push(
      `  Dependency Resolution: ${dependencyGraph.debugInfo.parser.dependencyResolutionSuccess ? 'SUCCESS' : 'FAILED'}`,
    );
    if (dependencyGraph.debugInfo.parser.parsingErrors.length > 0) {
      lines.push(`  Parsing Errors: ${dependencyGraph.debugInfo.parser.parsingErrors.length}`);
      dependencyGraph.debugInfo.parser.parsingErrors.forEach(error => {
        lines.push(`    - ${error}`);
      });
    }
    if (dependencyGraph.debugInfo.parser.parsingWarnings.length > 0) {
      lines.push(`  Parsing Warnings: ${dependencyGraph.debugInfo.parser.parsingWarnings.length}`);
      dependencyGraph.debugInfo.parser.parsingWarnings.forEach(warning => {
        lines.push(`    - ${warning}`);
      });
    }
    lines.push('');

    // Compiler debug info
    lines.push('COMPILER DEBUG:');
    lines.push(`  Cache Initialized: ${dependencyGraph.debugInfo.compiler.cacheInitialized}`);
    lines.push(`  Selected Command: ${dependencyGraph.debugInfo.compiler.selectedCommand}`);
    lines.push(
      `  Cache Directories: ${dependencyGraph.debugInfo.compiler.cacheDirectories.length}`,
    );
    dependencyGraph.debugInfo.compiler.cacheDirectories.forEach(dir => {
      lines.push(`    - ${dir}`);
    });
    lines.push(
      `  Available Commands: ${dependencyGraph.debugInfo.compiler.availableCommands.length}`,
    );
    dependencyGraph.debugInfo.compiler.availableCommands.forEach(cmd => {
      const status = cmd.tested ? (cmd.error ? 'FAILED' : 'SUCCESS') : 'NOT_TESTED';
      lines.push(`    - ${cmd.strategy}: ${cmd.command} [${status}]`);
      if (cmd.version) lines.push(`      Version: ${cmd.version}`);
      if (cmd.error) lines.push(`      Error: ${cmd.error}`);
    });
    lines.push('');

    // Project-level debug information
    lines.push('PROJECT DEBUG DETAILS:');
    for (const [projectDir, project] of dependencyGraph.projects.entries()) {
      lines.push(`  ${projectDir}:`);
      lines.push(`    ID: ${project.id}`);
      lines.push(`    Status: ${project.status.toUpperCase()}`);
      lines.push(`    CDS Files: ${project.cdsFiles.length}`);
      lines.push(`    Files to Compile: ${project.cdsFilesToCompile.length}`);
      lines.push(`    Compilation Tasks: ${project.compilationTasks.length}`);

      if (project.parserDebugInfo) {
        lines.push(
          `    Dependencies Resolved: ${project.parserDebugInfo.dependenciesResolved.length}`,
        );
        lines.push(`    Import Errors: ${project.parserDebugInfo.importErrors.length}`);
        lines.push(`    Parse Errors: ${project.parserDebugInfo.parseErrors.size}`);
      }

      if (project.enhancedCompilationConfig) {
        lines.push(`    Primary Command: ${project.enhancedCompilationConfig.primaryCdsCommand}`);
        lines.push(
          `    Cache Directory: ${project.enhancedCompilationConfig.primaryCacheDir ?? 'none'}`,
        );
        lines.push(
          `    Alternative Commands: ${project.enhancedCompilationConfig.alternativeCommands.length}`,
        );
      }

      // Task details
      const successfulTasks = project.compilationTasks.filter(t => t.status === 'success').length;
      const failedTasks = project.compilationTasks.filter(t => t.status === 'failed').length;
      const pendingTasks = project.compilationTasks.filter(t => t.status === 'pending').length;

      lines.push(
        `    Tasks - Success: ${successfulTasks}, Failed: ${failedTasks}, Pending: ${pendingTasks}`,
      );

      // Show failed task details
      project.compilationTasks
        .filter(t => t.status === 'failed')
        .forEach(task => {
          lines.push(`      Failed Task: ${task.id}`);
          lines.push(`        Files: ${task.sourceFiles.join(', ')}`);
          lines.push(`        Error: ${task.errorSummary ?? 'Unknown error'}`);
          lines.push(`        Attempts: ${task.attempts.length}`);
        });

      lines.push('');
    }
  } else {
    // Standard project details for non-debug mode
    lines.push('PROJECT DETAILS:');
    for (const [projectDir, project] of dependencyGraph.projects.entries()) {
      lines.push(`  ${projectDir}:`);
      lines.push(`    Status: ${project.status.toUpperCase()}`);
      lines.push(`    CDS Files: ${project.cdsFiles.length}`);
      lines.push(`    Compilation Tasks: ${project.compilationTasks.length}`);

      const successfulTasks = project.compilationTasks.filter(t => t.status === 'success').length;
      const failedTasks = project.compilationTasks.filter(t => t.status === 'failed').length;

      lines.push(`    Tasks Successful: ${successfulTasks}`);
      lines.push(`    Tasks Failed: ${failedTasks}`);
      lines.push('');
    }
  }

  // Errors and warnings
  if (summary.criticalErrors.length > 0) {
    lines.push('CRITICAL ERRORS:');
    for (const error of summary.criticalErrors) {
      lines.push(`  - ${error}`);
    }
    lines.push('');
  }

  if (summary.warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const warning of summary.warnings) {
      lines.push(`  - ${warning}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Main compilation orchestration function to replace the big for loop in cds-extractor.ts
 * Now supports consistent debug information collection
 */
export function orchestrateCompilation(
  dependencyGraph: CdsDependencyGraph,
  projectCacheDirMap: Map<string, string>,
  codeqlExePath: string,
  isDebugMode: boolean = false,
): void {
  try {
    // Collect debug information if in debug mode
    if (isDebugMode) {
      collectCompilerDebugInfo(dependencyGraph, projectCacheDirMap);
    }

    // Plan compilation tasks
    planCompilationTasks(dependencyGraph, projectCacheDirMap);

    // Execute compilation tasks
    executeCompilationTasks(dependencyGraph, codeqlExePath);

    // Update overall status
    const hasFailures =
      dependencyGraph.statusSummary.failedCompilations > 0 ||
      dependencyGraph.errors.critical.length > 0;

    dependencyGraph.statusSummary.overallSuccess = !hasFailures;
    dependencyGraph.currentPhase = hasFailures ? 'failed' : 'completed';

    // Generate and log status report
    const statusReport = generateStatusReport(dependencyGraph, false);
    cdsExtractorLog('info', 'Final Status Report:\n' + statusReport);
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

/**
 * Collect comprehensive debug information about the compiler environment
 */
function collectCompilerDebugInfo(
  dependencyGraph: CdsDependencyGraph,
  projectCacheDirMap: Map<string, string>,
): void {
  try {
    // Get comprehensive command analysis
    const commandAnalysis = getCommandAnalysisForDebug(undefined, dependencyGraph.sourceRootDir);

    // Update debug info with comprehensive command analysis
    dependencyGraph.debugInfo.compiler.selectedCommand = commandAnalysis.selectedCommand;
    dependencyGraph.debugInfo.compiler.availableCommands = commandAnalysis.availableCommands.map(
      (cmd: { command: string; version?: string; strategy: string; error?: string }) => ({
        command: cmd.command,
        version: cmd.version,
        strategy: cmd.strategy,
        tested: true,
        error: cmd.error,
      }),
    );

    // Collect cache directories
    dependencyGraph.debugInfo.compiler.cacheDirectories = Array.from(
      projectCacheDirMap.values(),
    ).filter(dir => dir !== undefined);

    // Add any global cache directories
    const globalCacheDirs = Array.from(dependencyGraph.globalCacheDirectories.values());
    dependencyGraph.debugInfo.compiler.cacheDirectories.push(...globalCacheDirs);

    // Remove duplicates
    dependencyGraph.debugInfo.compiler.cacheDirectories = Array.from(
      new Set(dependencyGraph.debugInfo.compiler.cacheDirectories),
    );

    dependencyGraph.debugInfo.compiler.cacheInitialized = true;

    cdsExtractorLog('info', 'Compiler debug information collected successfully');
  } catch (error) {
    cdsExtractorLog('warn', `Failed to collect compiler debug information: ${String(error)}`);
    dependencyGraph.debugInfo.compiler.cacheInitialized = false;
    dependencyGraph.debugInfo.compiler.selectedCommand = 'unknown';
    dependencyGraph.debugInfo.compiler.availableCommands = [];
  }
}
