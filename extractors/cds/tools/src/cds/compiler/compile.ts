import { spawnSync, SpawnSyncOptions } from 'child_process';
import { basename, delimiter, dirname, join, relative, resolve, sep } from 'path';

import { CdsCompilationResult } from './types';
import { getCdsVersion } from './version';
import { modelCdsJsonFile } from '../../constants';
import { fileExists, dirExists, recursivelyRenameJsonFiles } from '../../filesystem';
import { cdsExtractorLog } from '../../logging';
import { BasicCdsProject } from '../parser/types';

/**
 * Parses a command string for use with spawnSync, handling multi-word commands like 'npx cds'.
 * @param commandString The command string to parse (e.g., 'npx cds' or 'cds')
 * @returns Object with executable and args arrays for spawnSync
 */
function parseCommandForSpawn(commandString: string): { executable: string; baseArgs: string[] } {
  const parts = commandString.trim().split(/\s+/);
  const executable = parts[0];
  const baseArgs = parts.slice(1);
  return { executable, baseArgs };
}

/**
 * Determines compilation targets for a CDS project according to the new project-only compilation approach.
 * @param project The CDS project
 * @param sourceRoot The source root directory
 * @returns Array of compilation targets (directories or files relative to project base)
 */
function determineCompilationTargets(project: BasicCdsProject, sourceRoot: string): string[] {
  const projectAbsolutePath = join(sourceRoot, project.projectDir);

  // Check for index.cds in the project root first, which takes precedence over CAP directories.
  const rootCdsFiles = project.cdsFiles
    .filter(file => dirname(join(sourceRoot, file)) === projectAbsolutePath)
    .map(file => basename(file));

  if (rootCdsFiles.includes('index.cds')) {
    // Use only index.cds when it exists in the project root
    return ['index.cds'];
  }

  // Check for standard CAP directories
  const capDirectories = ['db', 'srv', 'app'];
  const existingCapDirs = capDirectories.filter(dir => dirExists(join(projectAbsolutePath, dir)));

  if (existingCapDirs.length > 0) {
    // Use standard CAP directories
    return existingCapDirs;
  }

  if (rootCdsFiles.length > 0) {
    // Use other root-level files
    return rootCdsFiles;
  }

  // Use all CDS files with their relative paths
  return project.cdsFiles.map(file => relative(projectAbsolutePath, join(sourceRoot, file)));
}

/**
 * Compiles a CDS project to JSON using project-level compilation only.
 * This function has been simplified to only use project-level compilation,
 * eliminating all individual file compilation logic and standardizing output
 * to a single {@link modelCdsJsonFile} file per project.
 *
 *
 * @param cdsFilePath The path to the CDS file to compile, relative to the `sourceRoot`.
 * @param sourceRoot The source root directory scanned by the CDS extractor.
 * CRITICAL: All spawned processes will use the project base directory as their `cwd` to
 * ensure that paths in generated JSON are relative to the project base directory.
 *
 * @param cdsCommand The actual shell command to use for `cds compile`.
 * @param cacheDir Full path to the cache directory where dependencies are stored.
 * @param projectMap Map of project directories to {@link BasicCdsProject} instances.
 * @param projectDir The project directory to which `cdsFilePath` belongs.
 *
 * @returns The {@link CdsCompilationResult} of the compilation attempt.
 */
export function compileCdsToJson(
  cdsFilePath: string,
  sourceRoot: string,
  cdsCommand: string,
  cacheDir: string | undefined,
  projectMap: Map<string, BasicCdsProject>,
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

    // Calculate project base directory for consistent working directory
    const projectBaseDir = join(sourceRoot, projectDir);

    // Create spawn options with project base directory as cwd.
    const spawnOptions = createSpawnOptions(projectBaseDir, cdsCommand, cacheDir);

    // Throw an error if projectDir cannot be found in the projectMap.
    if (!projectMap || !projectDir || !projectMap.has(projectDir)) {
      throw new Error(
        `Project directory '${projectDir}' not found in projectMap. Ensure the project is properly initialized.`,
      );
    }

    const project = projectMap.get(projectDir);

    // Always use project-level compilation
    return compileProject(sourceRoot, projectDir, cdsCommand, spawnOptions, versionInfo, project!);
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

/**
 * Handles project-level compilation for CAP projects.
 * CRITICAL: Uses the project base directory as cwd and calculates paths relative to project base directory.
 *
 * @param sourceRoot The source root directory
 * @param projectDir The project directory (relative to sourceRoot)
 * @param cdsCommand The CDS command to use
 * @param spawnOptions Pre-configured spawn options with project base directory as cwd
 * @param versionInfo Version information for logging
 * @param project The CDS project instance
 * @returns Compilation result
 */
function compileProject(
  sourceRoot: string,
  projectDir: string,
  cdsCommand: string,
  spawnOptions: SpawnSyncOptions,
  versionInfo: string,
  project: BasicCdsProject,
): CdsCompilationResult {
  cdsExtractorLog('info', `Compiling CDS project '${projectDir}' using ${versionInfo}...`);

  // Determine compilation targets using the new centralized logic
  const compilationTargets = determineCompilationTargets(project, sourceRoot);

  if (compilationTargets.length === 0) {
    throw new Error(
      `Project directory '${projectDir}' does not contain any CDS files and cannot be compiled`,
    );
  }

  const projectJsonOutPath = join(sourceRoot, projectDir, modelCdsJsonFile);

  const compileArgs = [
    'compile',
    ...compilationTargets,
    '--to',
    'json',
    '--dest',
    modelCdsJsonFile,
    '--locations',
    '--log-level',
    'warn',
  ];

  cdsExtractorLog('info', `Compiling CDS project targets: ${compilationTargets.join(', ')}`);
  cdsExtractorLog(
    'info',
    `Running compilation task for CDS project '${projectDir}': command='${cdsCommand}' args='${JSON.stringify(compileArgs)}'`,
  );

  // Parse command for proper spawnSync execution
  const { executable, baseArgs } = parseCommandForSpawn(cdsCommand);
  const allArgs = [...baseArgs, ...compileArgs];

  const result = spawnSync(executable, allArgs, spawnOptions);

  if (result.error) {
    cdsExtractorLog('error', `SpawnSync error: ${result.error.message}`);
    throw new Error(`Error executing CDS compiler: ${result.error.message}`);
  }

  // Log stderr for debugging even on success (CDS often writes warnings to stderr).
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

  // Handle directory output if the CDS compiler generated a directory.
  if (dirExists(projectJsonOutPath)) {
    cdsExtractorLog(
      'info',
      `CDS compiler generated JSON to output directory: ${projectJsonOutPath}`,
    );
    // Recursively rename generated .json files to have a .cds.json extension
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
 * Creates spawn options for CDS compilation processes.
 * CRITICAL: Always sets cwd to project base directory to ensure generated JSON paths are relative to project base directory.
 *
 * @param projectBaseDir The project base directory (where package.json is located) - used as cwd for all spawned processes
 * @param cdsCommand The CDS command to determine if we need Node.js environment setup
 * @param cacheDir Optional cache directory for dependencies
 * @returns Spawn options configured for CDS compilation
 */
function createSpawnOptions(
  projectBaseDir: string,
  cdsCommand: string,
  cacheDir?: string,
): SpawnSyncOptions {
  const spawnOptions: SpawnSyncOptions = {
    cwd: projectBaseDir, // CRITICAL: Always use project base directory as cwd to ensure correct path generation
    shell: false, // Use shell=false to ensure proper argument handling for paths with spaces
    stdio: 'pipe',
    env: { ...process.env },
  };

  // Check if we're using a direct binary path (contains node_modules/.bin/ or node_modules\.bin\) or npx-style command
  // Check both platform-native separator and forward slash for cross-platform compatibility
  const binPathNative = `node_modules${sep}.bin${sep}`;
  const binPathPosix = 'node_modules/.bin/';
  const isDirectBinary = cdsCommand.includes(binPathNative) || cdsCommand.includes(binPathPosix);

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
