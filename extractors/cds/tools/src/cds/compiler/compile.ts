import { spawnSync, SpawnSyncOptions } from 'child_process';
import { resolve, join, delimiter, relative } from 'path';

import { CdsCompilationResult } from './types';
import { getCdsVersion } from './version';
import { fileExists, dirExists, recursivelyRenameJsonFiles } from '../../filesystem';
import { cdsExtractorLog } from '../../logging';
import { CdsProject } from '../parser/types';

/**
 * Creates spawn options for CDS compilation processes.
 * CRITICAL: Always sets cwd to sourceRoot to ensure generated JSON paths are relative to sourceRoot.
 *
 * @param sourceRoot The source root directory - used as cwd for all spawned processes
 * @param cacheDir Optional cache directory for dependencies
 * @returns Spawn options configured for CDS compilation
 */
function createSpawnOptions(sourceRoot: string, cacheDir?: string): SpawnSyncOptions {
  const spawnOptions: SpawnSyncOptions = {
    cwd: sourceRoot, // CRITICAL: Always use sourceRoot as cwd to ensure correct path generation
    shell: true,
    stdio: 'pipe',
    env: { ...process.env },
  };

  // If a cache directory is provided, set NODE_PATH to use that cache
  if (cacheDir) {
    const nodePath = join(cacheDir, 'node_modules');

    // Set up environment to use the cached dependencies
    spawnOptions.env = {
      ...process.env,
      NODE_PATH: `${nodePath}${delimiter}${process.env.NODE_PATH ?? ''}`,
      PATH: `${join(nodePath, '.bin')}${delimiter}${process.env.PATH}`,
      // Add NPM configuration to ensure dependencies are resolved from the cache directory
      npm_config_prefix: cacheDir,
    };
  }

  return spawnOptions;
}

/**
 * Handles project-level compilation for CAP projects with typical directory structure.
 * CRITICAL: Uses sourceRoot as cwd and calculates paths relative to sourceRoot.
 *
 * @param resolvedCdsFilePath The resolved CDS file path that triggered this compilation
 * @param sourceRoot The source root directory
 * @param projectDir The project directory (relative to sourceRoot)
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options with sourceRoot as cwd
 * @param versionInfo Version information for logging
 * @returns Compilation result
 */
function compileProjectLevel(
  resolvedCdsFilePath: string,
  sourceRoot: string,
  projectDir: string,
  cdsCommand: string,
  spawnOptions: SpawnSyncOptions,
  versionInfo: string,
): CdsCompilationResult {
  cdsExtractorLog(
    'info',
    `${resolvedCdsFilePath} is part of a CAP project - using project-aware compilation ${versionInfo}...`,
  );

  // For project-level compilation, compile the entire project together
  // This follows the CAP best practice of compiling db and srv directories together
  const projectAbsolutePath = join(sourceRoot, projectDir);

  // Common directories in CAP projects that should be compiled together
  const capDirectories = ['db', 'srv', 'app'];
  const existingDirectories: string[] = [];

  for (const dir of capDirectories) {
    const dirPath = join(projectAbsolutePath, dir);
    if (dirExists(dirPath)) {
      existingDirectories.push(dir);
    }
  }

  if (existingDirectories.length === 0) {
    // Fallback to compiling all CDS files in the project if no standard directories found
    existingDirectories.push('.');
  }

  // Generate output path for the compiled model
  const projectJsonOutPath = join(projectAbsolutePath, 'model.cds.json');

  // CRITICAL: Use relative path for compilation target to ensure correct cwd behavior
  // Since we're running from sourceRoot, we need to specify the project directory as a relative path
  const relativeProjectDirectories = existingDirectories.map(dir => join(projectDir, dir));

  const compileArgs = [
    'compile',
    ...relativeProjectDirectories, // Use relative paths from sourceRoot
    '--to',
    'json',
    '--dest',
    projectJsonOutPath,
    '--locations',
    '--log-level',
    'warn',
  ];

  cdsExtractorLog('info', `Compiling CAP project directories: ${existingDirectories.join(', ')}`);

  // CRITICAL: Use the provided spawnOptions which has sourceRoot as cwd
  const result = spawnSync(cdsCommand, compileArgs, spawnOptions);

  if (result.error) {
    throw new Error(`Error executing CDS compiler: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `Could not compile the CAP project ${projectDir}.\nReported error(s):\n\`\`\`\n${
        result.stderr?.toString() || 'Unknown error'
      }\n\`\`\``,
    );
  }

  if (!fileExists(projectJsonOutPath) && !dirExists(projectJsonOutPath)) {
    throw new Error(
      `CAP project '${projectDir}' was not compiled to JSON. This is likely because the project structure is invalid.`,
    );
  }

  // Handle directory output if the CDS compiler generated a directory
  if (dirExists(projectJsonOutPath)) {
    cdsExtractorLog(
      'info',
      `CDS compiler generated JSON to output directory: ${projectJsonOutPath}`,
    );
    // Recursively rename all .json files to have a .cds.json extension
    recursivelyRenameJsonFiles(projectJsonOutPath);
  } else {
    cdsExtractorLog('info', `CDS compiler generated JSON to file: ${projectJsonOutPath}`);
  }

  return {
    success: true,
    outputPath: projectJsonOutPath,
    compiledAsProject: true,
    message: 'Project was compiled using project-aware compilation',
  };
}

/**
 * Handles individual file compilation.
 * CRITICAL: Uses sourceRoot as cwd to ensure correct path generation.
 *
 * @param resolvedCdsFilePath The resolved CDS file path to compile
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options with sourceRoot as cwd
 * @param isProjectAware Whether this is project-aware compilation
 * @returns Compilation result
 */
function compileIndividualFile(
  resolvedCdsFilePath: string,
  cdsCommand: string,
  spawnOptions: SpawnSyncOptions,
  isProjectAware: boolean,
): CdsCompilationResult {
  const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;

  // Compile the file
  const compileArgs = [
    'compile',
    resolvedCdsFilePath,
    '--to',
    'json',
    '--dest',
    cdsJsonOutPath,
    '--locations',
    '--log-level',
    'warn',
  ];

  // CRITICAL: Use the provided spawnOptions which has sourceRoot as cwd
  const result = spawnSync(cdsCommand, compileArgs, spawnOptions);

  if (result.error) {
    throw new Error(`Error executing CDS compiler: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `Could not compile the file ${resolvedCdsFilePath}.\nReported error(s):\n\`\`\`\n${
        result.stderr?.toString() || 'Unknown error'
      }\n\`\`\``,
    );
  }

  if (!fileExists(cdsJsonOutPath) && !dirExists(cdsJsonOutPath)) {
    throw new Error(
      `CDS source file '${resolvedCdsFilePath}' was not compiled to JSON. This is likely because the file does not exist or is not a valid CDS file.`,
    );
  }

  // Handle directory output if the CDS compiler generated a directory
  if (dirExists(cdsJsonOutPath)) {
    cdsExtractorLog('info', `CDS compiler generated JSON to output directory: ${cdsJsonOutPath}`);
    // Recursively rename all .json files to have a .cds.json extension
    recursivelyRenameJsonFiles(cdsJsonOutPath);
  } else {
    cdsExtractorLog('info', `CDS compiler generated JSON to file: ${cdsJsonOutPath}`);
  }

  return {
    success: true,
    outputPath: cdsJsonOutPath,
    compiledAsProject: isProjectAware,
  };
}

/**
 * Determines if the given project should use project-level compilation.
 *
 * @param project The CDS project to check
 * @returns true if project-level compilation should be used
 */
function shouldUseProjectLevelCompilation(project: CdsProject | undefined): boolean {
  return project?.cdsFilesToCompile?.includes('__PROJECT_LEVEL_COMPILATION__') ?? false;
}

/**
 * Determines if a file should be compiled individually or skipped because it's part of a project.
 *
 * @param project The CDS project
 * @param relativePath The relative path of the file being checked
 * @returns true if the file should be compiled individually
 */
function shouldCompileIndividually(project: CdsProject | undefined, relativePath: string): boolean {
  return project?.cdsFilesToCompile?.includes(relativePath) ?? true;
}

/**
 * Compile a CDS file to JSON
 * @param cdsFilePath Path to the CDS file
 * @param sourceRoot The source root directory - CRITICAL: All spawned processes must use this as their cwd to ensure paths in generated JSON are relative to sourceRoot
 * @param cdsCommand The CDS command to use
 * @param cacheDir Optional path to a directory containing installed dependencies
 * @param projectMap Optional map of project directories to project objects with dependency information
 * @param projectDir Optional project directory this CDS file belongs to
 * @returns Result of the compilation
 */
export function compileCdsToJson(
  cdsFilePath: string,
  sourceRoot: string,
  cdsCommand: string,
  cacheDir?: string,
  projectMap?: Map<string, CdsProject>,
  projectDir?: string,
): CdsCompilationResult {
  try {
    const resolvedCdsFilePath = resolve(cdsFilePath);
    if (!fileExists(resolvedCdsFilePath)) {
      throw new Error(`Expected CDS file '${resolvedCdsFilePath}' does not exist.`);
    }

    const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;

    // Get and log the CDS version
    const cdsVersion = getCdsVersion(cdsCommand, cacheDir);
    const versionInfo = cdsVersion ? `with CDS v${cdsVersion}` : '';

    // CRITICAL: Create spawn options with sourceRoot as cwd to ensure correct path generation
    const spawnOptions = createSpawnOptions(sourceRoot, cacheDir);

    // Determine if we should compile this file directly or as part of a project
    // Check if the projectMap and projectDir are provided
    const isProjectAware = projectMap && projectDir && projectMap.get(projectDir);

    if (isProjectAware) {
      const project = projectMap.get(projectDir);
      const relativePath = relative(sourceRoot, resolvedCdsFilePath);

      // Check if this is a project-level compilation marker
      if (shouldUseProjectLevelCompilation(project)) {
        return compileProjectLevel(
          resolvedCdsFilePath,
          sourceRoot,
          projectDir,
          cdsCommand,
          spawnOptions,
          versionInfo,
        );
      }

      // Check if this file is in the list of files to compile for this project
      if (!shouldCompileIndividually(project, relativePath)) {
        cdsExtractorLog(
          'info',
          `${resolvedCdsFilePath} is imported by other files - will be compiled as part of a project ${versionInfo}...`,
        );
        return {
          success: true,
          outputPath: cdsJsonOutPath,
          compiledAsProject: true,
          message: 'File was compiled as part of a project-based compilation',
        };
      } else {
        cdsExtractorLog(
          'info',
          `${resolvedCdsFilePath} identified as a root CDS file - using individual file compilation ${versionInfo}...`,
        );
      }
    } else {
      // Fallback to individual file compilation if project information is not available
      cdsExtractorLog(
        'info',
        `Processing individual CDS file ${resolvedCdsFilePath} ${versionInfo}...`,
      );
    }

    return compileIndividualFile(resolvedCdsFilePath, cdsCommand, spawnOptions, !!isProjectAware);
  } catch (error) {
    return { success: false, message: String(error) };
  }
}
