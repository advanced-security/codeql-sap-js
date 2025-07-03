import { spawnSync, SpawnSyncOptions } from 'child_process';
import { resolve, join, delimiter, relative } from 'path';

import { globSync } from 'glob';

import { CdsCompilationResult } from './types';
import { getCdsVersion } from './version';
import { fileExists, dirExists, recursivelyRenameJsonFiles } from '../../filesystem';
import { cdsExtractorLog } from '../../logging';
import { CdsProject } from '../parser/types';

/**
 * Compiles a CDS file to JSON using robust, project-aware compilation only.
 * This function has been refactored to align with the autobuild.md vision by removing all
 * forms of individual file compilation and ensuring only project-aware compilation is used.
 *
 * For root files, this will compile them to their 1:1 .cds.json representation if and only
 * if the file is a true root file in a project.
 *
 * @param cdsFilePath The path to the CDS file to compile, relative to the `sourceRoot`.
 * @param sourceRoot The source root directory scanned by the CDS extractor.
 * CRITICAL: All spawned processes must use this as their cwd to ensure paths in generated
 * JSON are relative to sourceRoot.
 *
 * @param cdsCommand The actual shell command to use for `cds compile`.
 * @param cacheDir Full path to the cache directory where dependencies are stored.
 * @param projectMap Map of project directories to {@link CdsProject} instances.
 * @param projectDir The project directory to which `cdsFilePath` belongs.
 *
 * @returns The {@link CdsCompilationResult} of the compilation attempt.
 */
export function compileCdsToJson(
  cdsFilePath: string,
  sourceRoot: string,
  cdsCommand: string,
  cacheDir: string | undefined,
  projectMap: Map<string, CdsProject>,
  projectDir: string,
): CdsCompilationResult {
  try {
    const resolvedCdsFilePath = resolve(cdsFilePath);
    if (!fileExists(resolvedCdsFilePath)) {
      throw new Error(`Expected CDS file '${resolvedCdsFilePath}' does not exist.`);
    }

    // Get and log the CDS version
    const cdsVersion = getCdsVersion(cdsCommand, cacheDir);
    const versionInfo = cdsVersion ? `with CDS v${cdsVersion}` : '';

    // CRITICAL: Create spawn options with sourceRoot as cwd to ensure correct path generation
    const spawnOptions = createSpawnOptions(sourceRoot, cdsCommand, cacheDir);

    // Throw an error if projectDir cannot be found in the projectMap.
    if (!projectMap || !projectDir || !projectMap.has(projectDir)) {
      throw new Error(
        `Project directory '${projectDir}' not found in projectMap. Ensure the project is properly initialized.`,
      );
    }

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
      const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;
      return {
        success: true,
        outputPath: cdsJsonOutPath,
        compiledAsProject: true,
        message: 'File was compiled as part of a project-based compilation',
      };
    } else {
      // This is a root file - compile it using project-aware approach to its 1:1 representation
      cdsExtractorLog(
        'info',
        `${resolvedCdsFilePath} identified as a root CDS file - using project-aware compilation for root file ${versionInfo}...`,
      );
      return compileRootFileAsProject(
        resolvedCdsFilePath,
        sourceRoot,
        projectDir,
        cdsCommand,
        spawnOptions,
        versionInfo,
      );
    }
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

/**
 * Handles project-level compilation for CAP projects with typical directory structure.
 * CRITICAL: Uses the project directory as cwd and calculates paths relative to project directory.
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
  _versionInfo: string,
): CdsCompilationResult {
  cdsExtractorLog(
    'info',
    `${resolvedCdsFilePath} is part of a CAP project - using project-aware compilation ${_versionInfo}...`,
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

  // Check if there are any CDS files in the project at all before proceeding
  const allCdsFiles = globSync(join(projectAbsolutePath, '**/*.cds'), {
    nodir: true,
    ignore: ['**/node_modules/**'],
  });

  if (allCdsFiles.length === 0) {
    throw new Error(
      `Project directory '${projectDir}' does not contain any CDS files and cannot be compiled`,
    );
  }

  if (existingDirectories.length === 0) {
    // If no standard directories, check if there are CDS files in the root
    const rootCdsFiles = globSync(join(projectAbsolutePath, '*.cds'));
    if (rootCdsFiles.length > 0) {
      existingDirectories.push('.');
    } else {
      // Find directories that contain CDS files
      const cdsFileParents = new Set(
        allCdsFiles.map((file: string) => {
          const relativePath = relative(projectAbsolutePath, file);
          const firstDir = relativePath.split('/')[0];
          return firstDir === relativePath ? '.' : firstDir;
        }),
      );
      existingDirectories.push(...Array.from(cdsFileParents));
    }
  }

  // Generate output path for the compiled model - relative to sourceRoot for consistency
  const relativeOutputPath = join(projectDir, 'model.cds.json');
  const projectJsonOutPath = join(sourceRoot, relativeOutputPath);

  // Use sourceRoot as working directory but provide project-relative paths
  const projectSpawnOptions: SpawnSyncOptions = {
    ...spawnOptions,
    cwd: sourceRoot, // Use sourceRoot as working directory for consistency
  };

  // Convert directories to be relative to sourceRoot (include project prefix)
  const projectRelativeDirectories = existingDirectories.map(dir =>
    dir === '.' ? projectDir : join(projectDir, dir),
  );

  const compileArgs = [
    'compile',
    ...projectRelativeDirectories, // Use paths relative to sourceRoot
    '--to',
    'json',
    '--dest',
    join(projectDir, 'model.cds.json'), // Output to specific model.cds.json file
    '--locations',
    '--log-level',
    'warn',
  ];

  cdsExtractorLog('info', `Compiling CAP project directories: ${existingDirectories.join(', ')}`);
  cdsExtractorLog(
    'info',
    `Executing CDS command in directory ${projectAbsolutePath}: command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`,
  );

  // CRITICAL: Use the project directory as cwd
  // Use array arguments for consistent test behavior
  const result = spawnSync(cdsCommand, compileArgs, projectSpawnOptions);

  if (result.error) {
    cdsExtractorLog('error', `SpawnSync error: ${result.error.message}`);
    throw new Error(`Error executing CDS compiler: ${result.error.message}`);
  }

  // Log stderr for debugging even on success (CDS often writes warnings to stderr)
  if (result.stderr && result.stderr.length > 0) {
    cdsExtractorLog('warn', `CDS stderr output: ${result.stderr.toString()}`);
  }

  if (result.status !== 0) {
    cdsExtractorLog('error', `CDS command failed with status ${result.status}`);
    cdsExtractorLog(
      'error',
      `Command: ${cdsCommand} ${compileArgs.map(arg => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')}`,
    );
    cdsExtractorLog('error', `Stdout: ${result.stdout?.toString() || 'No stdout'}`);
    cdsExtractorLog('error', `Stderr: ${result.stderr?.toString() || 'No stderr'}`);
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
 * Compiles a root CDS file using project-aware approach for 1:1 .cds.json representation.
 * This follows the autobuild.md vision of project-aware compilation only.
 *
 * @param resolvedCdsFilePath The resolved CDS file path
 * @param sourceRoot The source root directory
 * @param projectDir The project directory
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options
 * @param versionInfo Version information for logging
 * @returns Compilation result
 */
function compileRootFileAsProject(
  resolvedCdsFilePath: string,
  sourceRoot: string,
  _projectDir: string,
  cdsCommand: string,
  spawnOptions: SpawnSyncOptions,
  _versionInfo: string,
): CdsCompilationResult {
  // Calculate relative path for the output file
  const relativeCdsPath = relative(sourceRoot, resolvedCdsFilePath);
  const cdsJsonOutPath = `${resolvedCdsFilePath}.json`;

  // Use project-aware compilation with specific file target
  const compileArgs = [
    'compile',
    relativeCdsPath, // Compile the specific file relative to sourceRoot
    '--to',
    'json',
    '--dest',
    `${relativeCdsPath}.json`,
    '--locations',
    '--log-level',
    'warn',
  ];

  cdsExtractorLog(
    'info',
    `Compiling root CDS file using project-aware approach: ${relativeCdsPath}`,
  );
  cdsExtractorLog(
    'info',
    `Executing CDS command: command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`,
  );

  // Execute the compilation
  const result = spawnSync(cdsCommand, compileArgs, spawnOptions);

  if (result.error) {
    cdsExtractorLog('error', `SpawnSync error: ${result.error.message}`);
    throw new Error(`Error executing CDS compiler: ${result.error.message}`);
  }

  // Log stderr for debugging even on success
  if (result.stderr && result.stderr.length > 0) {
    cdsExtractorLog('warn', `CDS stderr output: ${result.stderr.toString()}`);
  }

  if (result.status !== 0) {
    cdsExtractorLog('error', `CDS command failed with status ${result.status}`);
    cdsExtractorLog(
      'error',
      `Command: ${cdsCommand} ${compileArgs.map(arg => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')}`,
    );
    cdsExtractorLog('error', `Stdout: ${result.stdout?.toString() || 'No stdout'}`);
    cdsExtractorLog('error', `Stderr: ${result.stderr?.toString() || 'No stderr'}`);
    throw new Error(
      `Could not compile the root CDS file ${relativeCdsPath}.\nReported error(s):\n\`\`\`\n${
        result.stderr?.toString() || 'Unknown error'
      }\n\`\`\``,
    );
  }

  if (!fileExists(cdsJsonOutPath) && !dirExists(cdsJsonOutPath)) {
    throw new Error(
      `Root CDS file '${relativeCdsPath}' was not compiled to JSON. Expected output: ${cdsJsonOutPath}`,
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
    compiledAsProject: true,
    message: 'Root file compiled using project-aware compilation',
  };
}

/**
 * Creates spawn options for CDS compilation processes.
 * CRITICAL: Always sets cwd to sourceRoot to ensure generated JSON paths are relative to sourceRoot.
 *
 * @param sourceRoot The source root directory - used as cwd for all spawned processes
 * @param cdsCommand The CDS command to determine if we need Node.js environment setup
 * @param cacheDir Optional cache directory for dependencies
 * @returns Spawn options configured for CDS compilation
 */
function createSpawnOptions(
  sourceRoot: string,
  cdsCommand: string,
  cacheDir?: string,
): SpawnSyncOptions {
  const spawnOptions: SpawnSyncOptions = {
    cwd: sourceRoot, // CRITICAL: Always use sourceRoot as cwd to ensure correct path generation
    shell: false, // Use shell=false to ensure proper argument handling for paths with spaces
    stdio: 'pipe',
    env: { ...process.env },
  };

  // Check if we're using a direct binary path (contains node_modules/.bin/) or npx-style command
  const isDirectBinary = cdsCommand.includes('node_modules/.bin/');

  // Only set up Node.js environment for npx-style commands, not for direct binary execution
  if (cacheDir && !isDirectBinary) {
    const nodePath = join(cacheDir, 'node_modules');

    // Set up environment to use the cached dependencies
    spawnOptions.env = {
      ...process.env,
      NODE_PATH: `${nodePath}${delimiter}${process.env.NODE_PATH ?? ''}`,
      PATH: `${join(nodePath, '.bin')}${delimiter}${process.env.PATH}`,
      // Add NPM configuration to ensure dependencies are resolved from the cache directory
      npm_config_prefix: cacheDir,
      // Ensure we don't pick up global CDS installations that might conflict
      npm_config_global: 'false',
      // Clear any existing CDS environment variables that might interfere
      CDS_HOME: cacheDir,
    };
  } else if (isDirectBinary) {
    // For direct binary execution, use minimal environment to avoid conflicts
    // Remove Node.js-specific environment variables that might interfere
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_PATH;
    delete cleanEnv.npm_config_prefix;
    delete cleanEnv.npm_config_global;
    delete cleanEnv.CDS_HOME;

    spawnOptions.env = cleanEnv;
  }

  return spawnOptions;
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
 * Determines if the given project should use project-level compilation.
 *
 * @param project The CDS project to check
 * @returns true if project-level compilation should be used
 */
function shouldUseProjectLevelCompilation(project: CdsProject | undefined): boolean {
  return project?.cdsFilesToCompile?.includes('__PROJECT_LEVEL_COMPILATION__') ?? false;
}
