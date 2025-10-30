import type { CdsDependencyGraph } from '../cds/parser';

/**
 * Generate a comprehensive status report for the dependency graph
 * Supports both normal execution and debug modes
 */
export function generateStatusReport(dependencyGraph: CdsDependencyGraph): string {
  const summary = dependencyGraph.statusSummary;
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`CDS EXTRACTOR STATUS REPORT`);
  lines.push('='.repeat(80));
  lines.push('');

  // OVERALL SUMMARY
  lines.push('OVERALL SUMMARY:');
  lines.push(`  Status: ${summary.overallSuccess ? 'SUCCESS' : 'FAILED'}`);
  lines.push(`  Current Phase: ${dependencyGraph.currentPhase.toUpperCase()}`);
  lines.push(`  Projects: ${summary.totalProjects}`);
  lines.push(`  CDS Files: ${summary.totalCdsFiles}`);
  lines.push(`  JSON Files Generated: ${summary.jsonFilesGenerated}`);
  lines.push('');

  // COMPILATION SUMMARY
  lines.push('COMPILATION SUMMARY:');
  lines.push(`  Total Tasks: ${summary.totalCompilationTasks}`);
  lines.push(`  Successful: ${summary.successfulCompilations}`);
  lines.push(`  Retried: ${dependencyGraph.retryStatus.totalRetryAttempts}`);
  lines.push(`  Failed: ${summary.failedCompilations}`);
  lines.push(`  Skipped: ${summary.skippedCompilations}`);
  lines.push('');

  // RETRY SUMMARY (if retry attempts were made)
  if (dependencyGraph.retryStatus.totalRetryAttempts > 0) {
    lines.push('RETRY SUMMARY:');
    lines.push(`  Tasks Requiring Retry: ${dependencyGraph.retryStatus.totalTasksRequiringRetry}`);
    lines.push(
      `  Tasks Successfully Retried: ${dependencyGraph.retryStatus.totalTasksSuccessfullyRetried}`,
    );
    lines.push(`  Total Retry Attempts: ${dependencyGraph.retryStatus.totalRetryAttempts}`);
    lines.push(
      `  Projects Requiring Full Dependencies: ${dependencyGraph.retryStatus.projectsRequiringFullDependencies.size}`,
    );
    lines.push(
      `  Projects with Full Dependencies: ${dependencyGraph.retryStatus.projectsWithFullDependencies.size}`,
    );
    lines.push('');
  }

  // PERFORMANCE metrics
  lines.push('PERFORMANCE:');
  lines.push(`  Total Duration: ${summary.performance.totalDurationMs}ms`);
  lines.push(`  Parsing: ${summary.performance.parsingDurationMs}ms`);
  lines.push(`  Compilation: ${summary.performance.compilationDurationMs}ms`);
  lines.push(`  Extraction: ${summary.performance.extractionDurationMs}ms`);

  // Add percentage breakdown if total duration > 0
  if (summary.performance.totalDurationMs > 0) {
    const parsingPct = Math.round(
      (summary.performance.parsingDurationMs / summary.performance.totalDurationMs) * 100,
    );
    const compilationPct = Math.round(
      (summary.performance.compilationDurationMs / summary.performance.totalDurationMs) * 100,
    );
    const extractionPct = Math.round(
      (summary.performance.extractionDurationMs / summary.performance.totalDurationMs) * 100,
    );

    lines.push('  Breakdown:');
    lines.push(`    Parsing: ${parsingPct}%`);
    lines.push(`    Compilation: ${compilationPct}%`);
    lines.push(`    Extraction: ${extractionPct}%`);
  }
  lines.push('');

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
