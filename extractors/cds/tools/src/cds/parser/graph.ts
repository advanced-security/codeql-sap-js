import { dirname, join, resolve, sep, basename } from 'path';

import {
  determineCdsFilesForProjectDir,
  determineCdsFilesToCompile,
  determineCdsProjectsUnderSourceDir,
  extractCdsImports,
  readPackageJsonFile,
} from './functions';
import { CdsDependencyGraph, CdsImport, CdsProject, BasicCdsProject } from './types';
import { modelCdsJsonFile } from '../../constants';
import { cdsExtractorLog } from '../../logging';

/**
 * Builds a basic dependency graph of CDS projects and performs the initial parsing stage of the CDS extractor.
 * This is the internal function that creates basic project structures.
 *
 * @param sourceRootDir - Source root directory
 * @returns Map of project directories to their BasicCdsProject objects with dependency information
 */
function buildBasicCdsProjectDependencyGraph(sourceRootDir: string): Map<string, BasicCdsProject> {
  // Find all CDS projects under the source directory
  cdsExtractorLog('info', 'Detecting CDS projects...');
  const projectDirs = determineCdsProjectsUnderSourceDir(sourceRootDir);

  if (projectDirs.length === 0) {
    cdsExtractorLog('info', 'No CDS projects found.');
    return new Map<string, BasicCdsProject>();
  }

  cdsExtractorLog('info', `Found ${projectDirs.length} CDS project(s) under source directory.`);

  const projectMap = new Map<string, BasicCdsProject>();

  // First pass: create CdsProject objects for each project directory
  for (const projectDir of projectDirs) {
    const absoluteProjectDir = join(sourceRootDir, projectDir);
    const cdsFiles = determineCdsFilesForProjectDir(sourceRootDir, absoluteProjectDir);

    // Try to load package.json if it exists
    const packageJsonPath = join(absoluteProjectDir, 'package.json');
    const packageJson = readPackageJsonFile(packageJsonPath);

    projectMap.set(projectDir, {
      projectDir,
      cdsFiles,
      compilationTargets: [], // Will be populated in the third pass
      expectedOutputFile: join(projectDir, modelCdsJsonFile),
      packageJson,
      dependencies: [],
      imports: new Map<string, CdsImport[]>(),
    });
  }

  // Second pass: analyze dependencies between projects
  cdsExtractorLog('info', 'Analyzing dependencies between CDS projects...');
  for (const [projectDir, project] of projectMap.entries()) {
    // Check each CDS file for imports
    for (const relativeFilePath of project.cdsFiles) {
      const absoluteFilePath = join(sourceRootDir, relativeFilePath);

      try {
        const imports = extractCdsImports(absoluteFilePath);
        const enrichedImports: CdsImport[] = [];

        // Process each import
        for (const importInfo of imports) {
          const enrichedImport: CdsImport = { ...importInfo };

          if (importInfo.isRelative) {
            // Resolve the relative import path
            const importedFilePath = resolve(dirname(absoluteFilePath), importInfo.path);
            const normalizedImportedPath = importedFilePath.endsWith('.cds')
              ? importedFilePath
              : `${importedFilePath}.cds`;

            // Store the resolved path relative to source root
            try {
              const relativeToDirPath = dirname(relativeFilePath);
              const resolvedPath = resolve(join(sourceRootDir, relativeToDirPath), importInfo.path);
              const normalizedResolvedPath = resolvedPath.endsWith('.cds')
                ? resolvedPath
                : `${resolvedPath}.cds`;

              // Convert to relative path from source root
              if (normalizedResolvedPath.startsWith(sourceRootDir)) {
                enrichedImport.resolvedPath = normalizedResolvedPath
                  .substring(sourceRootDir.length)
                  .replace(/^[/\\]/, '');
              }
            } catch (error) {
              cdsExtractorLog(
                'warn',
                `Could not resolve import path for ${importInfo.path} in ${relativeFilePath}: ${String(error)}`,
              );
            }

            // Find which project contains this imported file
            for (const [otherProjectDir, otherProject] of projectMap.entries()) {
              if (otherProjectDir === projectDir) continue; // Skip self

              const otherProjectAbsoluteDir = join(sourceRootDir, otherProjectDir);

              // Check if the imported file is in the other project
              const isInOtherProject = otherProject.cdsFiles.some(otherFile => {
                const otherAbsolutePath = join(sourceRootDir, otherFile);
                return (
                  otherAbsolutePath === normalizedImportedPath ||
                  normalizedImportedPath.startsWith(otherProjectAbsoluteDir + sep)
                );
              });

              if (isInOtherProject) {
                // Add dependency if not already present
                project.dependencies ??= [];

                if (!project.dependencies.includes(otherProject)) {
                  project.dependencies.push(otherProject);
                }
              }
            }
          }
          // For module imports, check package.json dependencies
          else if (importInfo.isModule && project.packageJson) {
            const dependencies = {
              ...(project.packageJson.dependencies ?? {}),
              ...(project.packageJson.devDependencies ?? {}),
            };

            // Extract module name from import path (e.g., '@sap/cds/common' -> '@sap/cds')
            const moduleName = importInfo.path.split('/')[0].startsWith('@')
              ? importInfo.path.split('/').slice(0, 2).join('/')
              : importInfo.path.split('/')[0];

            if (dependencies[moduleName]) {
              // This is a valid module dependency, nothing more to do here
              // In the future, we could track module dependencies separately
            }
          }

          enrichedImports.push(enrichedImport);
        }

        // Store the enriched imports in the project
        project.imports?.set(relativeFilePath, enrichedImports);
      } catch (error: unknown) {
        cdsExtractorLog(
          'warn',
          `Error processing imports in ${absoluteFilePath}: ${String(error)}`,
        );
      }
    }
  }

  // Third pass: determine CDS files to compile and expected output files for each project
  cdsExtractorLog(
    'info',
    'Determining CDS files to compile and expected output files for each project...',
  );
  for (const [, project] of projectMap.entries()) {
    try {
      const projectPlan = determineCdsFilesToCompile(sourceRootDir, project);

      // Assign the calculated values back to the project
      project.compilationTargets = projectPlan.compilationTargets;
      project.expectedOutputFile = projectPlan.expectedOutputFile;
    } catch (error) {
      cdsExtractorLog(
        'warn',
        `Error determining files to compile for project ${project.projectDir}: ${String(error)}`,
      );
      // Fall back to default project compilation on error
      project.compilationTargets = project.cdsFiles.map(file => basename(file));
      project.expectedOutputFile = join(project.projectDir, modelCdsJsonFile);
    }
  }

  return projectMap;
}

/**
 * Builds a CDS dependency graph with comprehensive tracking and debug information.
 * This is the main function that returns a CdsDependencyGraph instead of a simple Map.
 * The extractor now runs in autobuild mode by default.
 *
 * @param sourceRootDir - Source root directory
 * @returns CDS dependency graph with comprehensive tracking
 */
export function buildCdsProjectDependencyGraph(sourceRootDir: string): CdsDependencyGraph {
  const startTime = new Date();

  // Create the initial dependency graph structure
  const dependencyGraph: CdsDependencyGraph = {
    id: `cds_graph_${Date.now()}`,
    sourceRootDir,
    projects: new Map<string, CdsProject>(),
    debugInfo: {
      extractor: {
        runMode: 'autobuild',
        sourceRootDir,
        startTime,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
          argv: process.argv,
        },
      },
      parser: {
        projectsDetected: 0,
        cdsFilesFound: 0,
        dependencyResolutionSuccess: true,
        parsingErrors: [],
        parsingWarnings: [],
      },
      compiler: {
        availableCommands: [],
        selectedCommand: '',
        cacheDirectories: [],
        cacheInitialized: false,
      },
    },
    currentPhase: 'parsing',
    statusSummary: {
      overallSuccess: false,
      totalProjects: 0,
      totalCdsFiles: 0,
      totalCompilationTasks: 0,
      successfulCompilations: 0,
      failedCompilations: 0,
      skippedCompilations: 0,
      jsonFilesGenerated: 0,
      criticalErrors: [],
      warnings: [],
      performance: {
        totalDurationMs: 0,
        parsingDurationMs: 0,
        compilationDurationMs: 0,
        extractionDurationMs: 0,
      },
    },
    config: {
      maxRetryAttempts: 3,
      enableDetailedLogging: false, // Debug modes removed
      generateDebugOutput: false, // Debug modes removed
      compilationTimeoutMs: 30000, // 30 seconds
    },
    errors: {
      critical: [],
      warnings: [],
    },
    retryStatus: {
      totalTasksRequiringRetry: 0,
      totalTasksSuccessfullyRetried: 0,
      totalRetryAttempts: 0,
      projectsRequiringFullDependencies: new Set<string>(),
      projectsWithFullDependencies: new Set<string>(),
    },
  };

  try {
    // Use the existing function to build the basic project map
    const basicProjectMap = buildBasicCdsProjectDependencyGraph(sourceRootDir);

    // Convert basic projects to CDS projects
    for (const [projectDir, basicProject] of basicProjectMap.entries()) {
      const cdsProject: CdsProject = {
        ...basicProject,
        id: `project_${projectDir.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        enhancedCompilationConfig: undefined, // Will be set during compilation planning
        compilationTasks: [],
        parserDebugInfo: {
          dependenciesResolved: [],
          importErrors: [],
          parseErrors: new Map<string, string>(),
        },
        status: 'discovered',
        timestamps: {
          discovered: new Date(),
        },
      };

      dependencyGraph.projects.set(projectDir, cdsProject);
    }

    // Update summary statistics
    dependencyGraph.statusSummary.totalProjects = dependencyGraph.projects.size;
    dependencyGraph.statusSummary.totalCdsFiles = Array.from(
      dependencyGraph.projects.values(),
    ).reduce((sum, project) => sum + project.cdsFiles.length, 0);

    dependencyGraph.debugInfo.parser.projectsDetected = dependencyGraph.projects.size;
    dependencyGraph.debugInfo.parser.cdsFilesFound = dependencyGraph.statusSummary.totalCdsFiles;

    // Mark dependency resolution phase as completed
    dependencyGraph.currentPhase = 'dependency_resolution';

    const endTime = new Date();
    dependencyGraph.debugInfo.extractor.endTime = endTime;
    dependencyGraph.debugInfo.extractor.durationMs = endTime.getTime() - startTime.getTime();
    dependencyGraph.statusSummary.performance.parsingDurationMs =
      dependencyGraph.debugInfo.extractor.durationMs;

    cdsExtractorLog(
      'info',
      `CDS dependency graph created with ${dependencyGraph.projects.size} projects and ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`,
    );

    return dependencyGraph;
  } catch (error) {
    const errorMessage = `Failed to build CDS dependency graph: ${String(error)}`;
    cdsExtractorLog('error', errorMessage);

    dependencyGraph.errors.critical.push({
      phase: 'parsing',
      message: errorMessage,
      timestamp: new Date(),
      stack: error instanceof Error ? error.stack : undefined,
    });

    dependencyGraph.currentPhase = 'failed';
    return dependencyGraph;
  }
}
