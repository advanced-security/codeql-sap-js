import { existsSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, relative, resolve, sep } from 'path';

import { sync } from 'glob';

import { CdsFilesToCompile, CdsImport, PackageJson } from './types';
import { modelCdsJsonFile } from '../../constants';
import { cdsExtractorLog } from '../../logging';
import {
  filterIgnoredPaths,
  getPathsIgnorePatterns,
  isSourcePathInclude,
  shouldIgnorePath,
} from '../../paths-ignore';

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
      windowsPathsNoEscape: true,
    });

    // Convert absolute paths to paths relative to sourceRootDir
    const relativePaths = cdsFiles.map(file => relative(sourceRootDir, file));

    // Apply paths-ignore filtering from CodeQL config
    const pathsIgnorePatterns = getPathsIgnorePatterns(sourceRootDir);
    if (pathsIgnorePatterns.length > 0) {
      const filtered = filterIgnoredPaths(relativePaths, pathsIgnorePatterns);
      const ignoredCount = relativePaths.length - filtered.length;
      if (ignoredCount > 0) {
        cdsExtractorLog(
          'info',
          `Filtered ${ignoredCount} CDS file(s) matching paths-ignore patterns in project ${relative(sourceRootDir, projectDir) || '.'}`,
        );
      }
      return filtered;
    }

    return relativePaths;
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

  // Discover explicit project markers before applying the directory heuristics.
  const projectFiles = sync(join(sourceRootDir, '**/{package.json,pom.xml}'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
    windowsPathsNoEscape: true,
  });

  const cdsFiles = sync(join(sourceRootDir, '**/*.cds'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
    windowsPathsNoEscape: true,
  });

  // Collect all potential project directories
  const candidateDirectories = new Set<string>();

  // Add directories with project markers
  for (const projectFile of projectFiles) {
    candidateDirectories.add(dirname(projectFile));
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

          // If parent is a monorepo with CDS content, allow both parent and child,
          // but only when the child has its own project marker.
          if (
            isParentMonorepo &&
            (existsSync(join(dir, 'package.json')) || existsSync(join(dir, 'pom.xml'))) &&
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
          if (!(
            isCurrentMonorepo &&
            (existsSync(join(existingAbsPath, 'package.json')) ||
              existsSync(join(existingAbsPath, 'pom.xml'))) &&
            isLikelyCdsProject(existingAbsPath)
          )) {
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
      const cdsFiles = sync(join(location, '**/*.cds'), {
        nodir: true,
        windowsPathsNoEscape: true,
      });
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
  const directCdsFiles = sync(join(dir, '*.cds'), { windowsPathsNoEscape: true });
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
 * Selects project-relative compilation targets, respecting source filters and
 * CAP directory entry-point precedence.
 *
 * @param sourceRootDir - The source root directory
 * @param project - The project to analyze, containing cdsFiles, imports, and projectDir
 * @returns Object containing files to compile and expected output files
 */
export function determineCdsFilesToCompile(
  sourceRootDir: string,
  project: {
    cdsFiles: string[];
    childProjectDirs?: string[];
    imports?: Map<string, CdsImport[]>;
    projectDir: string;
  },
): CdsFilesToCompile {
  const patterns = getPathsIgnorePatterns(sourceRootDir);
  const absoluteProjectDir = join(sourceRootDir, project.projectDir);
  const childProjectDirs = (project.childProjectDirs ?? []).map(dir => resolve(sourceRootDir, dir));
  const isOwned = (file: string): boolean => {
    const absoluteFile = resolve(file);
    return !childProjectDirs.some(
      dir => absoluteFile === dir || absoluteFile.startsWith(dir + sep),
    );
  };
  const relativeFiles = filterIgnoredPaths(project.cdsFiles ?? [], patterns)
    .filter(file => isOwned(resolve(sourceRootDir, file)))
    .map(file => relative(absoluteProjectDir, join(sourceRootDir, file)));
  const modelFiles = sync(join(absoluteProjectDir, '**/{*.cds,*.csn,csn.json}'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
    windowsPathsNoEscape: true,
  })
    .filter(isOwned)
    .map(file => relative(absoluteProjectDir, file));
  const csnFiles = modelFiles.filter(
    file => !file.endsWith('.cds') && !shouldIgnorePath(join(project.projectDir, file), patterns),
  );
  const selectedFiles = [...relativeFiles, ...csnFiles];
  const selected = new Set(selectedFiles);
  const plan = (compilationTargets: string[], selectedCsnFiles: string[]): CdsFilesToCompile => ({
    compilationTargets,
    csnFiles: selectedCsnFiles.map(file => join(project.projectDir, file)),
    expectedOutputFile: join(project.projectDir, modelCdsJsonFile),
  });

  if (selected.has('index.cds')) {
    return plan(
      modelFiles.every(file => selected.has(file))
        ? ['index.cds']
        : ['index.cds', ...selectedFiles.filter(file => file !== 'index.cds')],
      csnFiles,
    );
  }

  const capDirectories = ['db', 'srv', 'app'];
  const hasSourceIncludes = patterns.some(isSourcePathInclude);
  const isExtraModelFile = (file: string): boolean =>
    file.includes(sep) &&
    !capDirectories.some(dir => file.startsWith(dir + sep)) &&
    (file.startsWith('fts' + sep) || hasSourceIncludes);
  const extraFiles = relativeFiles.filter(isExtraModelFile);
  const rootCdsFiles = relativeFiles.filter(file => dirname(file) === '.');
  const existingCapDirs = capDirectories.filter(dir => existsSync(join(absoluteProjectDir, dir)));
  const capEntryPoints = new Set<string>();
  const capTargets: string[] = [];
  const nestedCapDirs = new Set<string>();
  const selectedCsnFiles: string[] = [];
  let skipped = 0;
  for (const dir of existingCapDirs) {
    const entry = getCdsDirectoryEntryPoint(absoluteProjectDir, dir);
    const allFiles = modelFiles.filter(file => file.startsWith(dir + sep));
    if (entry && isOwned(join(absoluteProjectDir, entry))) {
      capEntryPoints.add(entry);
      allFiles.push(entry);
    }
    const directoryFiles = selectedFiles.filter(
      file => file.startsWith(dir + sep) || file === entry,
    );
    if (directoryFiles.length === 0) {
      skipped++;
      continue;
    }
    selectedCsnFiles.push(...directoryFiles.filter(file => !file.endsWith('.cds')));
    const complete = allFiles.every(file => selected.has(file));
    capTargets.push(
      ...(complete
        ? [dir]
        : directoryFiles.filter(file => dirname(file) === dir || file === entry)),
    );
    if (!complete || !entry) {
      nestedCapDirs.add(dir);
    }
  }

  if (skipped > 0) {
    cdsExtractorLog(
      'info',
      `Skipped ${skipped} CAP directory(ies) without selected models in project ${project.projectDir || '.'}`,
    );
  }

  if (existingCapDirs.length > skipped) {
    const extraCsnFiles = csnFiles
      .filter(
        file =>
          !capEntryPoints.has(file) &&
          ((hasSourceIncludes && dirname(file) === '.') || isExtraModelFile(file)),
      )
      .sort();
    const nestedFiles = [...relativeFiles, ...selectedCsnFiles].filter(file => {
      const segments = file.split(sep);
      return segments.length > 2 && nestedCapDirs.has(segments[0]);
    });
    return plan(
      [
        ...capTargets,
        ...(hasSourceIncludes ? rootCdsFiles.filter(file => !capEntryPoints.has(file)) : []),
        ...extraFiles,
        ...extraCsnFiles,
        ...nestedFiles,
      ],
      [...selectedCsnFiles, ...extraCsnFiles],
    );
  }

  const fallbackCsnFiles = csnFiles
    .filter(file => rootCdsFiles.length === 0 || dirname(file) === '.' || isExtraModelFile(file))
    .sort();
  return plan(
    [
      ...(rootCdsFiles.length > 0 ? [...rootCdsFiles, ...extraFiles] : relativeFiles),
      ...fallbackCsnFiles,
    ],
    fallbackCsnFiles,
  );
}

/** Returns the effective entry point for a directory target, relative to the project. */
export function getCdsDirectoryEntryPoint(
  projectDir: string,
  directory: string,
): string | undefined {
  return ['.csn', '.cds', `${sep}index.csn`, `${sep}index.cds`, `${sep}csn.json`]
    .map(suffix => directory + suffix)
    .find(file => existsSync(join(projectDir, file)));
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
