import { existsSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, relative, sep } from 'path';

import { sync } from 'glob';

import { CdsFilesToCompile, CdsImport, PackageJson } from './types';
import { cdsExtractorLog } from '../../logging';

/**
 * Determines the list of CDS files to be parsed for the specified project directory.
 *
 * @param sourceRootDir - The source root directory to search for CDS files. This is
 * used to resolve relative paths in relation to a common (source root) directory for
 * multiple projects.
 * @param projectDir - The full, local filesystem path of the directory that contains
 * the individual `.cds` definition files for some `CAP` project.
 * @returns An array of strings representing the paths, relative to the source root
 * directory, of the `.cds` files to be parsed for a given project.
 */
export function determineCdsFilesForProjectDir(
  sourceRootDir: string,
  projectDir: string,
): string[] {
  if (!sourceRootDir || !projectDir) {
    throw new Error(
      `Unable to determine CDS files for project dir '${projectDir}'; both sourceRootDir and projectDir must be provided.`,
    );
  }

  // Normalize paths by removing trailing slashes for comparison
  const normalizedSourceRoot = sourceRootDir.replace(/[/\\]+$/, '');
  const normalizedProjectDir = projectDir.replace(/[/\\]+$/, '');

  if (
    !normalizedProjectDir.startsWith(normalizedSourceRoot) &&
    normalizedProjectDir !== normalizedSourceRoot
  ) {
    throw new Error(
      'projectDir must be a subdirectory of sourceRootDir or equal to sourceRootDir.',
    );
  }

  try {
    // Use glob to find all .cds files under the project directory, excluding node_modules
    const cdsFiles = sync(join(projectDir, '**/*.cds'), {
      nodir: true,
      ignore: ['**/node_modules/**', '**/*.testproj/**'],
    });

    // Convert absolute paths to paths relative to sourceRootDir
    return cdsFiles.map(file => relative(sourceRootDir, file));
  } catch (error: unknown) {
    cdsExtractorLog('error', `Error finding CDS files in ${projectDir}: ${String(error)}`);
    return [];
  }
}

/**
 * Determines the list of distinct CDS projects under the specified source
 * directory.
 * @param sourceRootDir - The source root directory to search for CDS projects.
 * @returns An array of strings representing the paths, relative to the source
 * root directory, of the detected CDS projects.
 */
export function determineCdsProjectsUnderSourceDir(sourceRootDir: string): string[] {
  if (!sourceRootDir || !existsSync(sourceRootDir)) {
    throw new Error(`Source root directory '${sourceRootDir}' does not exist.`);
  }

  const foundProjects = new Set<string>();

  // Find all potential project directories by looking for package.json files and CDS files
  const packageJsonFiles = sync(join(sourceRootDir, '**/package.json'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
  });

  const cdsFiles = sync(join(sourceRootDir, '**/*.cds'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
  });

  // Collect all potential project directories
  const candidateDirectories = new Set<string>();

  // Add directories with package.json files
  for (const packageJsonFile of packageJsonFiles) {
    candidateDirectories.add(dirname(packageJsonFile));
  }

  // Add directories with CDS files and try to find their project roots
  for (const cdsFile of cdsFiles) {
    const cdsDir = dirname(cdsFile);
    const projectRoot = findProjectRootFromCdsFile(cdsDir, sourceRootDir);
    if (projectRoot) {
      candidateDirectories.add(projectRoot);
    } else {
      candidateDirectories.add(cdsDir);
    }
  }

  // Filter candidates to only include likely CDS projects
  for (const dir of candidateDirectories) {
    if (isLikelyCdsProject(dir)) {
      const relativePath = relative(sourceRootDir, dir);
      const projectDir = relativePath || '.';

      // Check if this project is already included as a parent or child of an existing project
      let shouldAdd = true;
      const existingProjects = Array.from(foundProjects);

      for (const existingProject of existingProjects) {
        const existingAbsPath = join(sourceRootDir, existingProject);

        // Skip if this directory is a subdirectory of an existing project,
        // but only if the parent is not a monorepo with its own CDS content
        if (dir.startsWith(existingAbsPath + sep)) {
          // Check if parent is a monorepo root with its own CDS content
          const parentPackageJsonPath = join(existingAbsPath, 'package.json');
          const parentPackageJson = readPackageJsonFile(parentPackageJsonPath);
          const isParentMonorepo =
            parentPackageJson?.workspaces &&
            Array.isArray(parentPackageJson.workspaces) &&
            parentPackageJson.workspaces.length > 0;

          // If parent is a monorepo with CDS content, allow both parent and child
          if (
            isParentMonorepo &&
            (hasStandardCdsContent(existingAbsPath) || hasDirectCdsContent(existingAbsPath))
          ) {
            // Both parent and child can coexist as separate CDS projects
            shouldAdd = true;
          } else {
            // Traditional case: exclude subdirectory
            shouldAdd = false;
          }
          break;
        }

        // Remove existing project if it's a subdirectory of the current directory,
        // unless the current directory is a monorepo root and the existing project has its own CDS content
        if (existingAbsPath.startsWith(dir + sep)) {
          const currentPackageJsonPath = join(dir, 'package.json');
          const currentPackageJson = readPackageJsonFile(currentPackageJsonPath);
          const isCurrentMonorepo =
            currentPackageJson?.workspaces &&
            Array.isArray(currentPackageJson.workspaces) &&
            currentPackageJson.workspaces.length > 0;

          // If current is a monorepo and the existing project is a legitimate CDS project, keep both
          if (!(isCurrentMonorepo && isLikelyCdsProject(existingAbsPath))) {
            foundProjects.delete(existingProject);
          }
        }
      }

      if (shouldAdd) {
        foundProjects.add(projectDir);
      }
    }
  }

  return Array.from(foundProjects).sort();
}

/**
 * Parses a CDS file to extract import statements
 *
 * @param filePath - Path to the CDS file
 * @returns Array of import statements found in the file
 */
export function extractCdsImports(filePath: string): CdsImport[] {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf8');
  const imports: CdsImport[] = [];

  // Regular expression to match using statements
  // This handles: using X from 'path'; and using { X, Y } from 'path';
  // and also using X as Y from 'path';
  const usingRegex =
    /using\s+(?:{[^}]+}|[\w.]+(?:\s+as\s+[\w.]+)?)\s+from\s+['"`]([^'"`]+)['"`]\s*;/g;

  let match;
  while ((match = usingRegex.exec(content)) !== null) {
    const path = match[1];
    imports.push({
      statement: match[0],
      path,
      isRelative: path.startsWith('./') || path.startsWith('../'),
      isModule: !path.startsWith('./') && !path.startsWith('../') && !path.startsWith('/'),
    });
  }

  return imports;
}

/**
 * Attempts to find the project root directory starting from a directory containing a CDS file
 *
 * @param cdsFileDir - Directory containing a CDS file
 * @param sourceRootDir - Source root directory to limit the search
 * @returns The project root directory or null if not found
 */
function findProjectRootFromCdsFile(cdsFileDir: string, sourceRootDir: string): string | null {
  // Skip node_modules and testproj directories entirely
  if (cdsFileDir.includes('node_modules') || cdsFileDir.includes('.testproj')) {
    return null;
  }

  let currentDir = cdsFileDir;

  // Limit the upward search to the sourceRootDir
  while (currentDir.startsWith(sourceRootDir)) {
    // Check if this directory looks like a project root
    if (isLikelyCdsProject(currentDir)) {
      // If this is a standard CAP subdirectory (srv, db, app), check if the parent
      // directory should be the real project root
      const currentDirName = basename(currentDir);
      const isStandardSubdir = ['srv', 'db', 'app'].includes(currentDirName);

      if (isStandardSubdir) {
        const parentDir = dirname(currentDir);

        if (
          parentDir !== currentDir &&
          parentDir.startsWith(sourceRootDir) &&
          !parentDir.includes('node_modules') &&
          !parentDir.includes('.testproj') &&
          isLikelyCdsProject(parentDir)
        ) {
          // The parent is also a CDS project, so it's likely the real project root
          return parentDir;
        }
      }

      // For non-standard subdirectories, also check if the parent might be a better project root
      const parentDir = dirname(currentDir);

      if (
        parentDir !== currentDir &&
        parentDir.startsWith(sourceRootDir) &&
        !parentDir.includes('node_modules') &&
        !parentDir.includes('.testproj')
      ) {
        const hasDbDir =
          existsSync(join(parentDir, 'db')) && statSync(join(parentDir, 'db')).isDirectory();
        const hasSrvDir =
          existsSync(join(parentDir, 'srv')) && statSync(join(parentDir, 'srv')).isDirectory();
        const hasAppDir =
          existsSync(join(parentDir, 'app')) && statSync(join(parentDir, 'app')).isDirectory();

        // Use the same CAP project structure logic as below
        if ((hasDbDir && hasSrvDir) || (hasSrvDir && hasAppDir)) {
          return parentDir;
        }
      }

      return currentDir;
    }

    // Check for typical CAP project structure indicators
    const hasDbDir =
      existsSync(join(currentDir, 'db')) && statSync(join(currentDir, 'db')).isDirectory();
    const hasSrvDir =
      existsSync(join(currentDir, 'srv')) && statSync(join(currentDir, 'srv')).isDirectory();
    const hasAppDir =
      existsSync(join(currentDir, 'app')) && statSync(join(currentDir, 'app')).isDirectory();

    if ((hasDbDir && hasSrvDir) || (hasSrvDir && hasAppDir)) {
      return currentDir;
    }

    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root of the filesystem
      break;
    }
    currentDir = parentDir;
  }

  // If we couldn't determine a proper project root, return the original directory
  return cdsFileDir;
}

/**
 * Determines if a directory likely contains a CAP project by checking for key
 * indicators like package.json with CAP dependencies or .cds files in standard
 * locations.
 *
 * @param dir - Directory to check
 * @returns true if the directory likely contains a CAP project
 */
export function isLikelyCdsProject(dir: string): boolean {
  try {
    // Skip node_modules and testproj directories entirely
    if (dir.includes('node_modules') || dir.includes('.testproj')) {
      return false;
    }

    // Check for CDS files in standard locations (checking both direct and nested files)
    const hasStandardCdsDirectories = hasStandardCdsContent(dir);
    const hasDirectCdsFiles = hasDirectCdsContent(dir);
    const hasCdsFiles = hasStandardCdsDirectories || hasDirectCdsFiles;

    // Check if package.json exists and has CAP dependencies
    const hasCapDependencies = hasPackageJsonWithCapDeps(dir);

    if (hasCapDependencies) {
      // If there are CAP dependencies but no CDS files, there's nothing for us to do
      if (!hasCdsFiles) {
        return false;
      }

      // Check if this is a monorepo root
      const packageJsonPath = join(dir, 'package.json');
      const packageJson = readPackageJsonFile(packageJsonPath);

      if (
        packageJson?.workspaces &&
        Array.isArray(packageJson.workspaces) &&
        packageJson.workspaces.length > 0
      ) {
        // This is likely a monorepo - only treat as CDS project if it has actual CDS content
        if (!hasCdsFiles) {
          // This is a monorepo root without its own CDS content
          return false;
        }
      }

      return true;
    }

    // If no CAP dependencies, only consider it a CDS project if it has CDS files
    return hasCdsFiles;
  } catch (error: unknown) {
    cdsExtractorLog('error', `Error checking directory ${dir}: ${String(error)}`);
    return false;
  }
}

/**
 * Check if a directory has CDS content in standard CAP directories.
 */
function hasStandardCdsContent(dir: string): boolean {
  const standardLocations = [join(dir, 'db'), join(dir, 'srv'), join(dir, 'app')];

  for (const location of standardLocations) {
    if (existsSync(location) && statSync(location).isDirectory()) {
      // Check for any .cds files at any level under these directories.
      const cdsFiles = sync(join(location, '**/*.cds'), { nodir: true });
      if (cdsFiles.length > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a directory has direct CDS files.
 */
function hasDirectCdsContent(dir: string): boolean {
  const directCdsFiles = sync(join(dir, '*.cds'));
  return directCdsFiles.length > 0;
}

/**
 * Safely parses a package.json file, using the cache if available
 * @param filePath - Path to the package.json file
 * @returns The parsed package.json content or undefined if the file doesn't exist or can't be parsed
 */
export function readPackageJsonFile(filePath: string): PackageJson | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content) as PackageJson;
    return packageJson;
  } catch (error) {
    cdsExtractorLog('warn', `Error parsing package.json at ${filePath}: ${String(error)}`);
    return undefined;
  }
}

/**
 * Determines which CDS files should be compiled for a given project and what output files to expect.
 * This function analyzes the project structure and dependencies to decide
 * whether to use project-level compilation or individual file compilation.
 *
 * For CAP projects (identified by either having @sap/cds dependencies or
 * typical CAP directory structure), it returns a special marker indicating
 * project-level compilation should be used. For other projects, it attempts
 * to identify root files (files that are not imported by others) and returns
 * those for individual compilation.
 *
 * @param sourceRootDir - The source root directory
 * @param project - The project to analyze, containing cdsFiles, imports, and projectDir
 * @returns Object containing files to compile and expected output files
 */
export function determineCdsFilesToCompile(
  sourceRootDir: string,
  project: {
    cdsFiles: string[];
    imports?: Map<string, CdsImport[]>;
    projectDir: string;
  },
): CdsFilesToCompile {
  if (!project.cdsFiles || project.cdsFiles.length === 0) {
    return {
      filesToCompile: [],
      expectedOutputFiles: [],
    };
  }

  // If there's only one CDS file, it should be compiled individually.
  if (project.cdsFiles.length === 1) {
    const filesToCompile = [...project.cdsFiles];
    return {
      filesToCompile,
      expectedOutputFiles: computeExpectedOutputFiles(filesToCompile, project.projectDir),
    };
  }

  const absoluteProjectDir = join(sourceRootDir, project.projectDir);
  const hasCapStructure = hasTypicalCapDirectoryStructure(project.cdsFiles);
  const hasCapDeps = hasPackageJsonWithCapDeps(absoluteProjectDir);

  // Use project-level compilation only if:
  // 1. It has CAP package.json dependencies, OR
  // 2. It has the typical CAP directory structure (db/, srv/ etc.)
  if (project.cdsFiles.length > 1 && (hasCapStructure || hasCapDeps)) {
    // For CAP projects, we should use project-level compilation
    // Return a special marker that indicates the entire project should be compiled together
    const filesToCompile = ['__PROJECT_LEVEL_COMPILATION__'];
    return {
      filesToCompile,
      expectedOutputFiles: computeExpectedOutputFiles(filesToCompile, project.projectDir),
    };
  }

  // For non-CAP projects or when we can't determine project type,
  // fall back to the original logic of identifying root files
  if (!project.imports || project.imports.size === 0) {
    const filesToCompile = [...project.cdsFiles];
    return {
      filesToCompile,
      expectedOutputFiles: computeExpectedOutputFiles(filesToCompile, project.projectDir),
    };
  }

  try {
    // Create a map to track imported files in the project
    const importedFiles = new Map<string, boolean>();

    // First pass: collect all imported files in the project
    for (const file of project.cdsFiles) {
      try {
        const absoluteFilePath = join(sourceRootDir, file);
        if (existsSync(absoluteFilePath)) {
          // Get imports for this file
          const imports = project.imports.get(file) ?? [];

          // Mark imported files
          for (const importInfo of imports) {
            if (importInfo.resolvedPath) {
              importedFiles.set(importInfo.resolvedPath, true);
            }
          }
        }
      } catch (error) {
        cdsExtractorLog('warn', `Error processing imports for ${file}: ${String(error)}`);
      }
    }

    // Second pass: identify root files (files that are not imported by others)
    const rootFiles: string[] = [];
    for (const file of project.cdsFiles) {
      const relativePath = relative(sourceRootDir, join(sourceRootDir, file));
      const isImported = importedFiles.has(relativePath);

      if (!isImported) {
        rootFiles.push(file);
      }
    }

    // If no root files were identified, fall back to compiling all files
    if (rootFiles.length === 0) {
      cdsExtractorLog(
        'warn',
        `No root CDS files identified in project ${project.projectDir}, will compile all files`,
      );
      const filesToCompile = [...project.cdsFiles];
      return {
        filesToCompile,
        expectedOutputFiles: computeExpectedOutputFiles(filesToCompile, project.projectDir),
      };
    }

    return {
      filesToCompile: rootFiles,
      expectedOutputFiles: computeExpectedOutputFiles(rootFiles, project.projectDir),
    };
  } catch (error) {
    cdsExtractorLog(
      'warn',
      `Error determining files to compile for project ${project.projectDir}: ${String(error)}`,
    );
    // Fall back to compiling all files on error
    const filesToCompile = [...project.cdsFiles];
    return {
      filesToCompile,
      expectedOutputFiles: computeExpectedOutputFiles(filesToCompile, project.projectDir),
    };
  }
}

/**
 * Computes the expected output files for a given set of files to compile.
 * This function predicts what .cds.json files will be generated during compilation.
 *
 * @param filesToCompile - Array of files to compile (may include special markers)
 * @param projectDir - The project directory
 * @returns Array of expected output file paths (relative to source root)
 */
function computeExpectedOutputFiles(filesToCompile: string[], projectDir: string): string[] {
  const expectedFiles: string[] = [];

  // Check if this project uses project-level compilation.
  const usesProjectLevelCompilation = filesToCompile.includes('__PROJECT_LEVEL_COMPILATION__');

  // Validate that __PROJECT_LEVEL_COMPILATION__ element does not coexist with other
  // files. We either expect a single project-level compilation marker or a list of
  // individual files to compile, not both.
  if (usesProjectLevelCompilation && filesToCompile.length !== 1) {
    throw new Error(
      `Invalid compilation configuration: '__PROJECT_LEVEL_COMPILATION__' must be the only element in filesToCompile array, but found ${filesToCompile.length} elements: ${filesToCompile.join(', ')}`,
    );
  }

  if (usesProjectLevelCompilation) {
    // For project-level compilation, expect a single model.cds.json file in the project
    // root directory.
    const projectModelFile = join(projectDir, 'model.cds.json');
    expectedFiles.push(projectModelFile);
  } else {
    // For individual file compilation, expect a .cds.json file for each .cds file compiled.
    for (const cdsFile of filesToCompile) {
      expectedFiles.push(`${cdsFile}.json`);
    }
  }

  return expectedFiles;
}

/**
 * Determines the expected output files for a project based on its compilation strategy.
 * This function predicts what .cds.json files will be generated during compilation.
 *
 * @param project - The CDS project to analyze
 * @returns Array of expected output file paths (relative to source root)
 */
export function determineExpectedOutputFiles(project: {
  cdsFilesToCompile: string[];
  projectDir: string;
}): string[] {
  const expectedFiles: string[] = [];

  // Check if this project uses project-level compilation.
  const usesProjectLevelCompilation = project.cdsFilesToCompile.includes(
    '__PROJECT_LEVEL_COMPILATION__',
  );
  // Validate that __PROJECT_LEVEL_COMPILATION__ element does not coexist with other
  // files. We either expect a single project-level compilation marker or a list of
  // individual files to compile, not both.
  if (usesProjectLevelCompilation && project.cdsFilesToCompile.length !== 1) {
    throw new Error(
      `Invalid compilation configuration: '__PROJECT_LEVEL_COMPILATION__' must be the only element in cdsFilesToCompile array, but found ${project.cdsFilesToCompile.length} elements: ${project.cdsFilesToCompile.join(', ')}`,
    );
  }

  if (usesProjectLevelCompilation) {
    // For project-level compilation, expect a single model.cds.json file in the project
    // root directory.
    const projectModelFile = join(project.projectDir, 'model.cds.json');
    expectedFiles.push(projectModelFile);
  } else {
    // For individual file compilation, expect a .cds.json file for each .cds file compiled.
    for (const cdsFile of project.cdsFilesToCompile) {
      expectedFiles.push(`${cdsFile}.json`);
    }
  }

  return expectedFiles;
}

/**
 * Checks if a project has a typical CAP directory structure by looking at the file paths.
 * This is used as a heuristic to determine if project-level compilation should be used.
 *
 * @param cdsFiles - List of CDS files in the project (relative to source root)
 * @returns true if the project appears to have a CAP structure
 */
function hasTypicalCapDirectoryStructure(cdsFiles: string[]): boolean {
  // Check if there are files in common CAP directories
  const hasDbFiles = cdsFiles.some(file => file.includes('db/') || file.includes('database/'));
  const hasSrvFiles = cdsFiles.some(file => file.includes('srv/') || file.includes('service/'));

  // If we have both db and srv files, this looks like a CAP project
  if (hasDbFiles && hasSrvFiles) {
    return true;
  }

  // Check if files are spread across multiple meaningful directories (not just the root)
  const meaningfulDirectories = new Set(
    cdsFiles.map(file => dirname(file)).filter(dir => dir !== '.' && dir !== ''), // Exclude root directory
  );

  // If there are multiple meaningful directories with CDS files, this might be a structured project
  // But we need to be more selective - only consider it structured if there are actual subdirectories
  return meaningfulDirectories.size >= 2;
}

/**
 * Checks if a directory has a package.json with CAP dependencies.
 * This function is used to determine if a directory has the necessary CAP packages installed,
 * which is one indicator that it might be a CAP project.
 *
 * @param dir - Directory to check for package.json with CAP dependencies
 * @returns true if the directory has a package.json with CAP dependencies
 */
export function hasPackageJsonWithCapDeps(dir: string): boolean {
  try {
    const packageJsonPath = join(dir, 'package.json');
    const packageJson = readPackageJsonFile(packageJsonPath);

    if (packageJson) {
      const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {}),
      };

      // Check for common CAP dependencies
      return !!(dependencies['@sap/cds'] || dependencies['@sap/cds-dk']);
    }

    return false;
  } catch {
    return false;
  }
}
