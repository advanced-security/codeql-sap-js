import { join } from 'path';

import { determineCdsCommand } from './command';
import { getCdsVersion } from './version';
import { dirExists } from '../../filesystem';
import { cdsExtractorLog } from '../../logging';
import { CdsProject, CdsCompilationConfig } from '../parser/types';

/**
 * Extracts the expected @sap/cds version from a project's package.json
 * @param project The CDS project
 * @returns The expected CDS version or undefined if not found
 */
function getExpectedCdsVersion(project: CdsProject): string | undefined {
  const packageJson = project.packageJson;
  if (!packageJson) {
    return undefined;
  }

  // Check dependencies first, then devDependencies
  const cdsVersion =
    packageJson.dependencies?.['@sap/cds'] ?? packageJson.devDependencies?.['@sap/cds'];

  if (cdsVersion) {
    // Remove version range specifiers (^, ~, >=, etc.) to get the base version
    return cdsVersion.replace(/^[\^~>=<]+/, '');
  }

  return undefined;
}

/**
 * Determines if a project should use project-level compilation based on its structure
 * @param project The CDS project
 * @param sourceRoot The source root directory
 * @returns true if project-level compilation should be used
 */
function shouldUseProjectLevelCompilation(project: CdsProject, sourceRoot: string): boolean {
  // Check if this project has the typical CAP structure (db, srv directories)
  const projectAbsolutePath = join(sourceRoot, project.projectDir);
  const capDirectories = ['db', 'srv', 'app'];

  let hasCapStructure = false;
  for (const dir of capDirectories) {
    const dirPath = join(projectAbsolutePath, dir);
    if (dirExists(dirPath)) {
      hasCapStructure = true;
      break;
    }
  }

  return hasCapStructure;
}

/**
 * Checks version compatibility between the project's expected CDS version and the available CDS command
 * @param cdsCommand The CDS command to check
 * @param cacheDir Optional cache directory
 * @param expectedVersion The expected CDS version from the project
 * @returns Version compatibility information
 */
function checkVersionCompatibility(
  cdsCommand: string,
  cacheDir?: string,
  expectedVersion?: string,
): CdsCompilationConfig['versionCompatibility'] {
  try {
    const actualVersion = getCdsVersion(cdsCommand, cacheDir);

    if (!actualVersion) {
      return {
        isCompatible: false,
        errorMessage: 'Could not determine CDS version',
      };
    }

    if (!expectedVersion) {
      // If no expected version, consider it compatible but log a warning
      cdsExtractorLog(
        'warn',
        `No expected CDS version found in project, using available version ${actualVersion}`,
      );
      return {
        isCompatible: true,
        cdsVersion: actualVersion,
      };
    }

    // Extract major version numbers for compatibility check
    const actualMajor = parseInt(actualVersion.split('.')[0], 10);
    const expectedMajor = parseInt(expectedVersion.split('.')[0], 10);

    const isCompatible = actualMajor === expectedMajor;

    if (!isCompatible) {
      return {
        isCompatible: false,
        errorMessage: `Version mismatch: project expects @sap/cds v${expectedVersion} but available CDS command provides v${actualVersion}`,
        cdsVersion: actualVersion,
        expectedCdsVersion: expectedVersion,
      };
    }

    return {
      isCompatible: true,
      cdsVersion: actualVersion,
      expectedCdsVersion: expectedVersion,
    };
  } catch (error) {
    return {
      isCompatible: false,
      errorMessage: `Version check failed: ${String(error)}`,
    };
  }
}

/**
 * Determines the compilation configuration for a CDS project
 * @param project The CDS project
 * @param sourceRoot The source root directory
 * @param projectCacheDirMap Map of project directories to their cache directories
 * @returns The compilation configuration for the project
 */
export function determineProjectCompilationConfig(
  project: CdsProject,
  sourceRoot: string,
  projectCacheDirMap: Map<string, string>,
): CdsCompilationConfig {
  const cacheDir = projectCacheDirMap.get(project.projectDir);
  const expectedCdsVersion = getExpectedCdsVersion(project);
  const useProjectLevelCompilation = shouldUseProjectLevelCompilation(project, sourceRoot);

  cdsExtractorLog(
    'info',
    `Determining compilation config for project ${project.projectDir}: cache=${cacheDir ?? 'none'}, expectedVersion=${expectedCdsVersion ?? 'none'}, projectLevel=${useProjectLevelCompilation}`,
  );

  // Try to determine the best CDS command for this project
  let cdsCommand: string;
  let versionCompatibility: CdsCompilationConfig['versionCompatibility'];

  try {
    // First, try to use the cache-based command if available
    cdsCommand = determineCdsCommand(cacheDir, sourceRoot);
    versionCompatibility = checkVersionCompatibility(cdsCommand, cacheDir, expectedCdsVersion);

    if (!versionCompatibility.isCompatible && cacheDir) {
      // If cache-based command has version issues, try fallback without cache
      cdsExtractorLog(
        'warn',
        `Cache-based CDS command has version issues for project ${project.projectDir}: ${versionCompatibility.errorMessage}`,
      );
      cdsExtractorLog('info', 'Trying fallback CDS command without cache...');

      const fallbackCommand = determineCdsCommand(undefined, sourceRoot);
      const fallbackCompatibility = checkVersionCompatibility(
        fallbackCommand,
        undefined,
        expectedCdsVersion,
      );

      if (
        fallbackCompatibility.isCompatible ||
        (!fallbackCompatibility.isCompatible && !versionCompatibility.isCompatible)
      ) {
        // Use fallback if it's compatible, or if both are incompatible (prefer system command)
        cdsCommand = fallbackCommand;
        versionCompatibility = fallbackCompatibility;
        cdsExtractorLog(
          'info',
          `Using fallback CDS command for project ${project.projectDir}: ${cdsCommand}`,
        );
      }
    }
  } catch {
    // If all else fails, try to get any available CDS command
    try {
      cdsCommand = determineCdsCommand(undefined, sourceRoot);
      versionCompatibility = checkVersionCompatibility(cdsCommand, undefined, expectedCdsVersion);
    } catch (fallbackError) {
      // No CDS command available at all
      throw new Error(
        `No CDS command available for project ${project.projectDir}: ${String(fallbackError)}`,
      );
    }
  }

  cdsExtractorLog(
    'info',
    `Compilation config for ${project.projectDir}: command=${cdsCommand}, compatible=${versionCompatibility.isCompatible}`,
  );

  return {
    cdsCommand,
    cacheDir,
    useProjectLevelCompilation,
    versionCompatibility,
  };
}

/**
 * Configures compilation for all projects in the project map
 * @param projectMap Map of project directories to CDS projects
 * @param sourceRoot The source root directory
 * @param projectCacheDirMap Map of project directories to their cache directories
 * @returns Updated project map with compilation configurations
 */
export function configureProjectCompilations(
  projectMap: Map<string, CdsProject>,
  sourceRoot: string,
  projectCacheDirMap: Map<string, string>,
): Map<string, CdsProject> {
  cdsExtractorLog('info', 'Configuring compilation settings for all detected projects...');

  const configuredProjectMap = new Map<string, CdsProject>();

  for (const [projectDir, project] of projectMap.entries()) {
    try {
      const compilationConfig = determineProjectCompilationConfig(
        project,
        sourceRoot,
        projectCacheDirMap,
      );

      const configuredProject: CdsProject = {
        ...project,
        compilationConfig,
      };

      configuredProjectMap.set(projectDir, configuredProject);

      // Log any version compatibility issues
      if (!compilationConfig.versionCompatibility.isCompatible) {
        cdsExtractorLog(
          'warn',
          `Version compatibility issue in project ${projectDir}: ${compilationConfig.versionCompatibility.errorMessage}`,
        );
      }
    } catch (error) {
      cdsExtractorLog(
        'error',
        `Failed to configure compilation for project ${projectDir}: ${String(error)}`,
      );

      // Still add the project but without compilation config
      configuredProjectMap.set(projectDir, project);
    }
  }

  cdsExtractorLog(
    'info',
    `Compilation configuration completed for ${configuredProjectMap.size} projects`,
  );

  return configuredProjectMap;
}
