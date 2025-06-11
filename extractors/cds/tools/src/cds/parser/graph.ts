import { dirname, join, resolve, sep } from 'path';

import { writeParserDebugInfo } from './debug';
import {
  determineCdsFilesForProjectDir,
  determineCdsFilesToCompile,
  determineCdsProjectsUnderSourceDir,
  extractCdsImports,
  readPackageJsonWithCache,
} from './functions';
import { CdsImport, CdsProject } from './types';
import { cdsExtractorLog } from '../../logging';

/**
 * Builds a dependency graph of CDS projects and performs the initial parsing stage of the CDS extractor.
 * This is the top-level function for the parser stage of the CDS extractor.
 *
 * @param sourceRootDir - Source root directory
 * @param runMode - Current run mode (index-files, debug-parser, or autobuild)
 * @param scriptDir - Directory where the script is running (for debug output)
 * @returns Map of project directories to their CdsProject objects with dependency information
 */
export function buildCdsProjectDependencyGraph(
  sourceRootDir: string,
  runMode?: string,
  scriptDir?: string,
): Map<string, CdsProject> {
  // If debug-parser mode, log additional information
  if (runMode === 'debug-parser') {
    cdsExtractorLog('info', 'Running CDS Parser in debug mode...');
    cdsExtractorLog('info', `Source Root Directory: ${sourceRootDir}`);
  }

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

      if (runMode === 'debug-parser') {
        cdsExtractorLog(
          'info',
          `Project ${project.projectDir}: ${filesToCompile.length} files to compile out of ${project.cdsFiles.length} total CDS files`,
        );
      }
    } catch (error) {
      cdsExtractorLog(
        'warn',
        `Error determining files to compile for project ${project.projectDir}: ${String(error)}`,
      );
      // Fall back to compiling all files on error
      project.cdsFilesToCompile = [...project.cdsFiles];
    }
  }

  // Handle debug mode specifically if requested
  if (runMode === 'debug-parser' && scriptDir) {
    // Output the project graph to a debug file
    if (!writeParserDebugInfo(projectMap, sourceRootDir, scriptDir)) {
      cdsExtractorLog(
        'warn',
        'Failed to write parser debug information. This indicates an empty project map, possibly due to a misconfiguration when calling the parent script.',
      );
    }

    // Instead of exiting directly (which interrupts tests), return with a signal property
    if (projectMap.size === 0) {
      return Object.assign(projectMap, { __debugParserFailure: true });
    } else {
      return Object.assign(projectMap, { __debugParserSuccess: true });
    }
  }

  return projectMap;
}
