import { existsSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, relative, sep } from 'path';

import { sync } from 'glob';

import { CdsFilesToCompile, CdsImport, PackageJson } from './types';
import { modelCdsJsonFile } from '../../constants';
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
      compilationTargets: [],
      expectedOutputFile: join(project.projectDir, modelCdsJsonFile),
    };
  }

  const absoluteProjectDir = join(sourceRootDir, project.projectDir);

  // Check for standard CAP directories
  const capDirectories = ['db', 'srv', 'app'];
  const existingCapDirs = capDirectories.filter(dir => existsSync(join(absoluteProjectDir, dir)));

  if (existingCapDirs.length > 0) {
    // Use standard CAP directories
    return {
      compilationTargets: existingCapDirs,
      expectedOutputFile: join(project.projectDir, modelCdsJsonFile),
    };
  }

  // Check for root-level CDS files
  const rootCdsFiles = project.cdsFiles
    .filter(file => dirname(join(sourceRootDir, file)) === absoluteProjectDir)
    .map(file => basename(file));

  if (rootCdsFiles.length > 0) {
    // Use root-level files
    return {
      compilationTargets: rootCdsFiles,
      expectedOutputFile: join(project.projectDir, modelCdsJsonFile),
    };
  }

  // Use all CDS files with their relative paths
  const compilationTargets = project.cdsFiles.map(file =>
    relative(absoluteProjectDir, join(sourceRootDir, file)),
  );

  return {
    compilationTargets,
    expectedOutputFile: join(project.projectDir, modelCdsJsonFile),
  };
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
