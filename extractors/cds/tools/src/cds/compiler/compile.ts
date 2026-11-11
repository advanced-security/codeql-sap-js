import type { SpawnSyncOptions, SpawnSyncReturns } from 'child_process';
import { randomUUID } from 'crypto';
import { closeSync, openSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { delimiter, isAbsolute, join, resolve, sep, win32 } from 'path';

import { sync as spawnSync } from 'cross-spawn';

import { CdsCompilationResult } from './types';
import { getCdsVersion } from './version';
import { modelCdsJsonFile } from '../../constants';
import {
  fileExists,
  dirExists,
  recursivelyRenameJsonFiles,
  normalizeLocationPathsInFile,
} from '../../filesystem';
import { cdsExtractorLog } from '../../logging';
import { determineCdsFilesToCompile, getCdsDirectoryEntryPoint } from '../parser/functions';
import { BasicCdsProject } from '../parser/types';

/**
 * Parses a command string for use with spawnSync, handling multi-word commands like 'npx cds'.
 * @param commandString The command string to parse (e.g., 'npx cds' or 'cds')
 * @returns Object with executable and args arrays for spawnSync
 */
function parseCommandForSpawn(commandString: string): { executable: string; baseArgs: string[] } {
  const command = commandString.trim();
  const parts = isAbsolute(command) || win32.isAbsolute(command) ? [command] : command.split(/\s+/);
  const executable = parts[0];
  const baseArgs = parts.slice(1);
  return { executable, baseArgs };
}

/**
 * Compiles a CDS project to JSON using project-level compilation only.
 * This function has been simplified to only use project-level compilation,
 * eliminating all individual file compilation logic and standardizing output
 * to a single {@link modelCdsJsonFile} file per project.
 *
 *
 * @param cdsFilePath A representative CDS source to validate, or undefined for CSN-only selections.
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
  cdsFilePath: string | undefined,
  sourceRoot: string,
  cdsCommand: string,
  cacheDir: string | undefined,
  projectMap: Map<string, BasicCdsProject>,
  projectDir: string,
): CdsCompilationResult {
  try {
    if (cdsFilePath !== undefined) {
      const resolvedCdsFilePath = resolve(cdsFilePath);
      if (!fileExists(resolvedCdsFilePath)) {
        throw new Error(`Expected CDS file '${resolvedCdsFilePath}' does not exist.`);
      }
    }

    // Get and log the CDS version
    const cdsVersion = getCdsVersion(cdsCommand, cacheDir);
    const versionInfo = cdsVersion ? `with CDS v${cdsVersion}` : '';

    // Calculate project base directory for consistent working directory
    const projectBaseDir = join(sourceRoot, projectDir);

    const environment = createCompilerEnvironment(projectBaseDir, cdsCommand, cacheDir);

    // Throw an error if projectDir cannot be found in the projectMap.
    if (!projectMap || !projectDir || !projectMap.has(projectDir)) {
      throw new Error(
        `Project directory '${projectDir}' not found in projectMap. Ensure the project is properly initialized.`,
      );
    }

    const project = projectMap.get(projectDir);

    // Always use project-level compilation
    return compileProject(sourceRoot, projectDir, cdsCommand, environment, versionInfo, project!);
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
 * @param environment Environment for the selected compiler
 * @param versionInfo Version information for logging
 * @param project The CDS project instance
 * @returns Compilation result
 */
function compileProject(
  sourceRoot: string,
  projectDir: string,
  cdsCommand: string,
  environment: NodeJS.ProcessEnv,
  versionInfo: string,
  project: BasicCdsProject,
): CdsCompilationResult {
  cdsExtractorLog('info', `Compiling CDS project '${projectDir}' using ${versionInfo}...`);

  // Determine compilation targets using the new centralized logic
  const { compilationTargets } = determineCdsFilesToCompile(sourceRoot, project);

  if (compilationTargets.length === 0) {
    throw new Error(
      `Project directory '${projectDir}' does not contain any selected CDS or CSN models and cannot be compiled`,
    );
  }

  const projectJsonOutPath = join(sourceRoot, projectDir, modelCdsJsonFile);

  cdsExtractorLog('info', `Compiling CDS project targets: ${compilationTargets.join(', ')}`);

  const { executable, baseArgs } = parseCommandForSpawn(cdsCommand);
  const result = runCdsCompiler(
    join(sourceRoot, projectDir),
    compilationTargets,
    [executable, ...baseArgs],
    { env: environment },
  );

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
      `Command: ${cdsCommand}; targets: ${JSON.stringify(compilationTargets)}`,
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

  // Normalize $location.file paths to POSIX forward slashes.
  // The CDS compiler on Windows produces backslash paths (e.g. "srv\\service1.cds")
  // but CodeQL libraries expect forward slashes (e.g. "srv/service1.cds").
  normalizeLocationPathsInFile(projectJsonOutPath);

  return {
    success: true,
    outputPath: projectJsonOutPath,
    compiledAsProject: true,
    message: 'Project was compiled using project-aware compilation',
  };
}

/** Makes cached dependencies and project-local CDS plugins visible to the compiler. */
function createCompilerEnvironment(
  projectBaseDir: string,
  cdsCommand: string,
  cacheDir?: string,
): NodeJS.ProcessEnv {
  const isDirectBinary = /node_modules[/\\]\.bin[/\\]/.test(cdsCommand);
  const projectNodeModules = join(projectBaseDir, 'node_modules');

  if (cacheDir && !isDirectBinary) {
    const nodePath = join(cacheDir, 'node_modules');
    return {
      ...process.env,
      NODE_PATH: [nodePath, projectNodeModules, process.env.NODE_PATH ?? '']
        .filter(Boolean)
        .join(delimiter),
      PATH: `${join(nodePath, '.bin')}${delimiter}${process.env.PATH}`,
      npm_config_prefix: cacheDir,
      npm_config_global: 'false',
      CDS_HOME: cacheDir,
    };
  }

  const environment = { ...process.env };
  if (isDirectBinary) {
    delete environment.NODE_PATH;
    delete environment.npm_config_prefix;
    delete environment.npm_config_global;
    delete environment.CDS_HOME;
    environment.NODE_PATH = projectNodeModules;
  }
  return environment;
}

function getImportTargets(projectDir: string, targets: string[]): string[] {
  return [
    ...new Set(
      targets.flatMap(target => {
        if (/\.(cds|csn|json)$/.test(target)) return [target];
        // A directory CLI target is not equivalent to a CDS directory import.
        const entry = getCdsDirectoryEntryPoint(projectDir, target);
        if (entry) return [entry];
        const files = readdirSync(join(projectDir, target));
        const csnFiles = files.filter(file => file.endsWith('.csn'));
        const csnNames = new Set(csnFiles.map(file => file.slice(0, -4)));
        return [
          ...csnFiles,
          ...files.filter(file => file.endsWith('.cds') && !csnNames.has(file.slice(0, -4))),
        ].map(file => join(target, file));
      }),
    ),
  ];
}

/** Runs the same shell-safe, bounded project compilation in extraction and test workflows. */
export function runCdsCompiler(
  projectDir: string,
  targets: string[],
  command: readonly [string, ...string[]],
  options: SpawnSyncOptions = {},
): SpawnSyncReturns<string | Buffer> {
  const [executable, ...baseArgs] = command;
  const compile = (selected: string[]): SpawnSyncReturns<string | Buffer> => {
    const args = [
      ...baseArgs,
      'compile',
      ...selected,
      '--to',
      'json',
      '--dest',
      modelCdsJsonFile,
      '--locations',
      '--log-level',
      'warn',
    ];
    cdsExtractorLog('info', `Running CDS compiler '${executable}' with ${JSON.stringify(args)}`);
    return spawnSync(executable, args, {
      ...options,
      cwd: projectDir,
      shell: false,
      stdio: 'pipe',
    });
  };
  // Leave room for command options and Windows npm-shim escaping.
  if (targets.join(' ').length <= 1024) return compile(targets);

  const imports = getImportTargets(projectDir, targets);
  const invalidTarget = imports.find(target => /[\r\n]/.test(target));
  if (invalidTarget) {
    throw new Error(
      `Cannot import a CDS compilation target containing a line break: ${JSON.stringify(invalidTarget)}`,
    );
  }
  const name = `.codeql-cds-${randomUUID()}.cds`;
  const entry = join(projectDir, name);
  const fd = openSync(entry, 'wx', 0o600);
  try {
    try {
      writeFileSync(
        fd,
        imports
          .map(target => `using from './${target.split(sep).join('/').replace(/'/g, "''")}';`)
          .join('\n'),
        'utf8',
      );
    } finally {
      closeSync(fd);
    }
    return compile([name]);
  } finally {
    unlinkSync(entry);
  }
}
