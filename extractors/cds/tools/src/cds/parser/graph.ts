import { dirname, join, resolve, sep } from 'path';

import {
  determineCdsFilesForProjectDir,
  determineCdsFilesToCompile,
  determineCdsProjectsUnderSourceDir,
  determineExpectedOutputFiles,
  extractCdsImports,
  readPackageJsonWithCache,
} from './functions';
import { CdsDependencyGraph, CdsImport, CdsProject, EnhancedCdsProject } from './types';
import { cdsExtractorLog } from '../../logging';

/**
 * Builds a dependency graph of CDS projects and performs the initial parsing stage of the CDS extractor.
 * This is the top-level function for the parser stage of the CDS extractor.
 *
 * @param sourceRootDir - Source root directory
 * @param _scriptDir - Directory where the script is running (for debug output) [unused]
 * @returns Map of project directories to their CdsProject objects with dependency information
 */
export function buildCdsProjectDependencyGraph(
  sourceRootDir: string,
  _scriptDir?: string,
): Map<string, CdsProject> {
  // Find all CDS projects under the source directory
  cdsExtractorLog('info', 'Detecting CDS projects...');
  const projectDirs = determineCdsProjectsUnderSourceDir(sourceRootDir);

  if (projectDirs.length === 0) {
    cdsExtractorLog('info', 'No CDS projects found.');
    return new Map<string, CdsProject>();
  }

  cdsExtractorLog('info', `Found ${projectDirs.length} CDS project(s) under source directory.`);

  const projectMap = new Map<string, CdsProject>();

  // First pass: create CdsProject objects for each project directory
  for (const projectDir of projectDirs) {
    const absoluteProjectDir = join(sourceRootDir, projectDir);
    const cdsFiles = determineCdsFilesForProjectDir(sourceRootDir, absoluteProjectDir);

    // Try to load package.json if it exists
    const packageJsonPath = join(absoluteProjectDir, 'package.json');
    const packageJson = readPackageJsonWithCache(packageJsonPath);

    projectMap.set(projectDir, {
      projectDir,
      cdsFiles,
      cdsFilesToCompile: [], // Will be populated in the third pass
      expectedOutputFiles: [], // Will be populated in the fourth pass
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

  // Third pass: determine which CDS files should be compiled for each project
  cdsExtractorLog('info', 'Determining CDS files to compile for each project...');
  for (const [, project] of projectMap.entries()) {
    try {
      const filesToCompile = determineCdsFilesToCompile(sourceRootDir, project);
      project.cdsFilesToCompile = filesToCompile;
      cdsExtractorLog(
        'info',
        `Project ${project.projectDir}: ${filesToCompile.length} files to compile out of ${project.cdsFiles.length} total CDS files`,
      );
    } catch (error) {
      cdsExtractorLog(
        'warn',
        `Error determining files to compile for project ${project.projectDir}: ${String(error)}`,
      );
      // Fall back to compiling all files on error
      project.cdsFilesToCompile = [...project.cdsFiles];
    }
  }

  // Fourth pass: determine expected output files for each project
  cdsExtractorLog('info', 'Determining expected output files for each project...');
  for (const [, project] of projectMap.entries()) {
    try {
      const expectedOutputFiles = determineExpectedOutputFiles(project);
      project.expectedOutputFiles = expectedOutputFiles;
      cdsExtractorLog(
        'info',
        `Project ${project.projectDir}: expecting ${expectedOutputFiles.length} output files`,
      );
    } catch (error) {
      cdsExtractorLog(
        'warn',
        `Error determining expected output files for project ${project.projectDir}: ${String(error)}`,
      );
      // Fall back to empty array on error
      project.expectedOutputFiles = [];
    }
  }

  return projectMap;
}

/**
 * Builds an enhanced CDS dependency graph with comprehensive tracking and debug information.
 * This is the new enhanced version that returns a CdsDependencyGraph instead of a simple Map.
 * The extractor now runs in autobuild mode by default.
 *
 * @param sourceRootDir - Source root directory
 * @param _scriptDir - Directory where the script is running (for debug output) [unused]
 * @returns Enhanced CDS dependency graph with comprehensive tracking
 */
export function buildEnhancedCdsProjectDependencyGraph(
  sourceRootDir: string,
  _scriptDir?: string,
): CdsDependencyGraph {
  const startTime = new Date();

  // Create the initial dependency graph structure
  const dependencyGraph: CdsDependencyGraph = {
    id: `cds_graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceRootDir,
    scriptDir: _scriptDir ?? sourceRootDir,
    projects: new Map<string, EnhancedCdsProject>(),
    globalCacheDirectories: new Map<string, string>(),
    debugInfo: {
      extractor: {
        runMode: 'autobuild',
        sourceRootDir,
        scriptDir: _scriptDir,
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
      retriedCompilations: 0,
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
    fileCache: {
      fileContents: new Map<string, string>(),
      packageJsonCache: new Map<string, import('./types').PackageJson>(),
      cdsParseCache: new Map<string, import('./types').CdsParseResult>(),
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
  };

  try {
    // Use the existing function to build the basic project map
    const basicProjectMap = buildCdsProjectDependencyGraph(sourceRootDir, _scriptDir);

    // Convert basic projects to enhanced projects
    for (const [projectDir, basicProject] of basicProjectMap.entries()) {
      const enhancedProject: EnhancedCdsProject = {
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

      dependencyGraph.projects.set(projectDir, enhancedProject);
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
      `Enhanced dependency graph created with ${dependencyGraph.projects.size} projects and ${dependencyGraph.statusSummary.totalCdsFiles} CDS files`,
    );

    return dependencyGraph;
  } catch (error) {
    const errorMessage = `Failed to build enhanced dependency graph: ${String(error)}`;
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
