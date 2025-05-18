import { execFileSync, spawnSync, SpawnSyncOptions } from 'child_process';
import { resolve, join, delimiter, relative } from 'path';

import { CdsCompilationResult } from './types';
import { fileExists, dirExists, recursivelyRenameJsonFiles } from '../../filesystem';

/**
 * Determine the `cds` command to use based on the environment and cache directory.
 * @param cacheDir Optional path to a directory containing installed dependencies
 * @returns A string representing the CLI command to run to invoke the
 * CDS compiler.
 */
export function determineCdsCommand(cacheDir?: string): string {
  // If we have a cache directory, use the cds binary from there
  if (cacheDir) {
    const localCdsBin = join(cacheDir, 'node_modules', '.bin', 'cds');

    // Check if the local cds binary exists in the cache directory
    if (fileExists(localCdsBin)) {
      // We need to use node to execute the local bin directly to ensure correct resolution
      return `node "${localCdsBin}"`;
    }

    // If there's a cache directory but no local binary, use npx with NODE_PATH
    return `npx --no-install cds`;
  }

  // Default behavior when no cache directory is provided
  let cdsCommand = 'cds';
  try {
    execFileSync('cds', ['--version'], { stdio: 'ignore' });
  } catch {
    // If 'cds' command is not available, use npx to run it
    cdsCommand = 'npx -y --package @sap/cds-dk cds';
  }
  return cdsCommand;
}

/**
 * Get the CDS compiler version from a specific command or cache directory
 * @param cdsCommand The CDS command to use
 * @param cacheDir Optional path to a directory containing installed dependencies
 * @returns The CDS compiler version string, or undefined if it couldn't be determined
 */
export function getCdsVersion(cdsCommand: string, cacheDir?: string): string | undefined {
  try {
    // Set up environment vars if using a cache directory
    const spawnOptions: SpawnSyncOptions = {
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
        npm_config_prefix: cacheDir,
      };
    }

    // Execute the CDS command with the --version flag
    const result = spawnSync(cdsCommand, ['--version'], spawnOptions);
    if (result.status === 0 && result.stdout) {
      const versionOutput = result.stdout.toString().trim();
      // Extract version number, which is typically in formats like "@sap/cds: 6.1.3" or similar
      const match = versionOutput.match(/@sap\/cds[^0-9]*([0-9]+\.[0-9]+\.[0-9]+)/);
      if (match?.[1]) {
        return match[1]; // Return just the version number
      }
      return versionOutput; // Return full output if we couldn't parse it
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Compile a CDS file to JSON
 * @param cdsFilePath Path to the CDS file
 * @param sourceRoot The source root directory
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
  projectMap?: Map<
    string,
    {
      projectDir: string;
      cdsFiles: string[];
      imports?: Map<string, Array<{ resolvedPath?: string }>>;
    }
  >,
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

    // Prepare spawn options
    const spawnOptions: SpawnSyncOptions = {
      cwd: sourceRoot,
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

    // Determine if we should compile this file directly or as part of a project
    // Check if the projectMap and projectDir are provided
    const isProjectAware = projectMap && projectDir && projectMap.get(projectDir);
    let isRootCdsFile = false;
    let projectBasedCompilation = false;

    if (isProjectAware) {
      const project = projectMap.get(projectDir);
      const relativePath = relative(sourceRoot, resolvedCdsFilePath);

      // Check if this is a root CDS file (not imported by other files)
      if (project?.cdsFiles) {
        // Create a map to track imported files in the project
        const importedFiles = new Map<string, boolean>();

        // First pass: collect all imported files in the project
        for (const file of project.cdsFiles) {
          try {
            const absoluteFilePath = join(sourceRoot, file);
            if (fileExists(absoluteFilePath)) {
              // Get imports for this file
              const imports = project.imports?.get(file) ?? [];

              // Mark imported files
              for (const importInfo of imports) {
                if (importInfo.resolvedPath) {
                  importedFiles.set(importInfo.resolvedPath, true);
                }
              }
            }
          } catch (error) {
            console.warn(`Warning: Error processing imports for ${file}: ${String(error)}`);
          }
        }

        // Check if current file is not imported by any other file in the project
        isRootCdsFile = !importedFiles.has(relativePath);

        // If the file is a root CDS file, we'll use a project-based compilation approach
        if (isRootCdsFile) {
          projectBasedCompilation = true;
          console.log(
            `${resolvedCdsFilePath} identified as a root CDS file - using project-aware compilation ${versionInfo}...`,
          );
        } else {
          console.log(
            `${resolvedCdsFilePath} is imported by other files - will be compiled as part of a project ${versionInfo}...`,
          );
        }
      }
    } else {
      // Fallback to individual file compilation if project information is not available
      console.log(`Processing individual CDS file ${resolvedCdsFilePath} ${versionInfo}...`);
    }

    // If it's not a root file and project-based compilation is enabled,
    // return success without additional processing since it will be compiled as part of its root file
    if (isProjectAware && !isRootCdsFile) {
      return {
        success: true,
        outputPath: cdsJsonOutPath,
        compiledAsProject: true,
        message: 'File was compiled as part of a project-based compilation',
      };
    }

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

    // For root CDS files in project-aware mode, add --parse flag to ensure complete model
    if (projectBasedCompilation) {
      compileArgs.push('--parse');
    }

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
      console.log(`CDS compiler generated JSON to output directory: ${cdsJsonOutPath}`);
      // Recursively rename all .json files to have a .cds.json extension
      recursivelyRenameJsonFiles(cdsJsonOutPath);
    } else {
      console.log(`CDS compiler generated JSON to file: ${cdsJsonOutPath}`);
    }

    return {
      success: true,
      outputPath: cdsJsonOutPath,
      compiledAsProject: projectBasedCompilation,
    };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}
