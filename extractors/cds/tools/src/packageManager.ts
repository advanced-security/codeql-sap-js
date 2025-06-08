import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';

import { addDependencyDiagnostic, addPackageJsonParsingDiagnostic } from './diagnostics';

/**
 * Interface for package.json structure
 */
export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Represents a unique combination of @sap/cds and @sap/cds-dk dependencies
 */
export interface CdsDependencyCombination {
  cdsVersion: string;
  cdsDkVersion: string;
  hash: string;
}

/**
 * Extract unique combinations of @sap/cds and @sap/cds-dk dependencies from CDS projects
 * @param projectMap Map of project directories to CdsProject objects
 * @param sourceRoot Source root directory
 * @returns Array of unique CdsDependencyCombination objects
 */
export function extractUniqueDependencyCombinations(
  projectMap: Map<string, { packageJson?: PackageJson }>,
): CdsDependencyCombination[] {
  const combinationMap = new Map<string, CdsDependencyCombination>();

  // First, process all projects with package.json
  projectMap.forEach(project => {
    if (!project.packageJson) return;

    // Extract CDS dependency versions
    const dependencies = {
      ...(project.packageJson.dependencies ?? {}),
      ...(project.packageJson.devDependencies ?? {}),
    };

    // Use 'latest' as default for CDS dependencies if not specified
    // This allows us to handle projects that don't specify @sap/cds explicitly
    const cdsVersion = dependencies['@sap/cds'] ?? 'latest';
    const cdsDkVersion = dependencies['@sap/cds-dk'] ?? 'latest';

    // Create a hash of the dependency combination to use as a cache key
    const combinationString = `@sap/cds@${cdsVersion}|@sap/cds-dk@${cdsDkVersion}`;
    const hash = createHash('md5').update(combinationString).digest('hex').slice(0, 8);

    // If this combination hasn't been seen before, add it to the map
    if (!combinationMap.has(hash)) {
      combinationMap.set(hash, { cdsVersion, cdsDkVersion, hash });
    }
  });

  const result = Array.from(combinationMap.values());

  // If no combinations were found, add a default 'latest' combination
  // This ensures we always return at least one combination
  if (result.length === 0) {
    const latestCombination = {
      cdsVersion: 'latest',
      cdsDkVersion: 'latest',
      hash: createHash('md5')
        .update('@sap/cds@latest|@sap/cds-dk@latest')
        .digest('hex')
        .slice(0, 8),
    };
    result.push(latestCombination);
  }

  return result;
}

/**
 * Find directories containing package.json with a `@sap/cds` dependency.
 * @param filePaths List of CDS file paths to check.
 * @param codeqlExePath Path to the CodeQL executable (optional).
 * @param sourceRoot The source root directory (optional) - Limits the search to
 * never go above this directory.
 * @returns Set of directories containing relevant package.json files.
 */
export function findPackageJsonDirs(
  filePaths: string[],
  codeqlExePath?: string,
  sourceRoot?: string,
): Set<string> {
  const packageJsonDirs = new Set<string>();
  const absoluteSourceRoot = sourceRoot ? resolve(sourceRoot) : undefined;

  filePaths.forEach(file => {
    let dir = dirname(resolve(file));

    // Check current directory and parent directories for package.json with a
    // dependency on `@sap/cds`. Never look above the source root directory.
    while (true) {
      // Stop if we've reached or gone above the source root directory.
      if (absoluteSourceRoot && !dir.startsWith(absoluteSourceRoot)) {
        break;
      }

      const packageJsonPath = join(dir, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const rawData = readFileSync(packageJsonPath, 'utf-8');
          const packageJsonData = JSON.parse(rawData) as PackageJson;

          if (
            packageJsonData.name &&
            packageJsonData.dependencies &&
            typeof packageJsonData.dependencies === 'object' &&
            Object.keys(packageJsonData.dependencies).includes('@sap/cds')
          ) {
            packageJsonDirs.add(dir);
            break;
          }
        } catch (error) {
          const errorMessage = `Failed to parse package.json at ${packageJsonPath}: ${String(error)}`;
          console.warn(`WARN: ${errorMessage}`);

          if (codeqlExePath) {
            addPackageJsonParsingDiagnostic(packageJsonPath, errorMessage, codeqlExePath);
          }
        }
      }
      // Move up one directory level
      const parentDir = dirname(dir);
      if (dir === parentDir) {
        // We've reached the root directory, so break out of the loop
        break;
      }
      dir = parentDir;
    }
  });

  return packageJsonDirs;
}

/**
 * Install dependencies for CDS projects using a cache strategy
 * @param projectMap Map of project directories to CdsProject objects
 * @param sourceRoot Source root directory
 * @param codeqlExePath Path to the CodeQL executable (optional)
 * @returns Map of project directories to their corresponding cache directories
 */
export function installDependencies(
  projectMap: Map<string, { packageJson?: PackageJson; projectDir: string }>,
  sourceRoot: string,
  codeqlExePath?: string,
): Map<string, string> {
  // Sanity check that we found at least one project
  if (projectMap.size === 0) {
    console.warn('WARN: failed to detect any CDS projects for dependency installation.');
    return new Map<string, string>();
  }

  // Extract unique dependency combinations from all projects
  const dependencyCombinations = extractUniqueDependencyCombinations(projectMap);

  // This block is redundant since extractUniqueDependencyCombinations will always
  // return at least one combination (the 'latest' default if none found)
  // But we keep it for clarity and backward compatibility
  if (dependencyCombinations.length === 0) {
    console.warn('WARN: No CDS dependencies found in any project.');
    // Create a default 'latest' version combination for projects with no CDS dependencies
    const latestCombination = {
      cdsVersion: 'latest',
      cdsDkVersion: 'latest',
      hash: createHash('md5')
        .update('@sap/cds@latest|@sap/cds-dk@latest')
        .digest('hex')
        .slice(0, 8),
    };
    dependencyCombinations.push(latestCombination);
  }

  console.log(`Found ${dependencyCombinations.length} unique CDS dependency combination(s).`);

  // Create a cache directory under the source root
  const cacheRootDir = join(sourceRoot, '.cds-extractor-cache');
  if (!existsSync(cacheRootDir)) {
    try {
      mkdirSync(cacheRootDir, { recursive: true });
    } catch (err) {
      console.error(
        `Failed to create cache directory: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Fall back to a temporary directory if we can't create the cache dir
      return fallbackToDirectInstallation(projectMap, sourceRoot, codeqlExePath);
    }
  }

  // Map to track which cache directory to use for each project
  const projectCacheDirMap = new Map<string, string>();

  // Install each unique dependency combination in its own cache directory
  for (const combination of dependencyCombinations) {
    const { cdsVersion, cdsDkVersion, hash } = combination;
    const cacheDirName = `cds-${hash}`;
    const cacheDir = join(cacheRootDir, cacheDirName);

    // Create the cache directory if it doesn't exist
    if (!existsSync(cacheDir)) {
      try {
        mkdirSync(cacheDir, { recursive: true });
      } catch (err) {
        console.error(
          `Failed to create cache directory for combination ${hash}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      // Create a package.json for this dependency combination
      const packageJson = {
        name: `cds-extractor-cache-${hash}`,
        version: '1.0.0',
        private: true,
        dependencies: {
          '@sap/cds': cdsVersion,
          '@sap/cds-dk': cdsDkVersion,
        },
      };

      try {
        writeFileSync(join(cacheDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      } catch (err) {
        console.error(
          `Failed to create package.json in cache directory: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }
    }

    // Check if node_modules directory already exists in the cache dir
    const nodeModulesExists =
      existsSync(join(cacheDir, 'node_modules', '@sap', 'cds')) &&
      existsSync(join(cacheDir, 'node_modules', '@sap', 'cds-dk'));

    if (!nodeModulesExists) {
      // Install dependencies in the cache directory
      console.log(`Installing @sap/cds@${cdsVersion} and @sap/cds-dk@${cdsDkVersion} in cache...`);
      try {
        execFileSync('npm', ['install', '--quiet', '--no-audit', '--no-fund'], {
          cwd: cacheDir,
          stdio: 'inherit',
        });
      } catch (err) {
        const errorMessage = `Failed to install dependencies in cache directory ${cacheDir}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMessage);
        // Skip this combination
        continue;
      }
    } else {
      console.log(
        `Using cached dependencies for @sap/cds@${cdsVersion} and @sap/cds-dk@${cdsDkVersion}`,
      );
    }

    // Associate projects with this dependency combination
    projectMap.forEach((project, projectPath) => {
      if (!project.packageJson) return;

      const projectDeps = {
        ...(project.packageJson.dependencies ?? {}),
        ...(project.packageJson.devDependencies ?? {}),
      };

      // Get the project's CDS dependency versions, defaulting to 'latest' if not specified
      const projectCdsVersion = projectDeps['@sap/cds'] ?? 'latest';
      const projectCdsDkVersion = projectDeps['@sap/cds-dk'] ?? 'latest';

      // Map the project to this cache dir if the versions match
      if (projectCdsVersion === cdsVersion && projectCdsDkVersion === cdsDkVersion) {
        projectCacheDirMap.set(projectPath, cacheDir);
      }
    });
  }

  return projectCacheDirMap;
}

/**
 * Fallback function that performs direct installation in project directories
 * if the cache approach fails
 * @param projectMap Map of project directories to CdsProject objects
 * @param sourceRoot Source root directory
 * @param codeqlExePath Path to the CodeQL executable (optional)
 * @returns Empty map (no cache directories used)
 */
function fallbackToDirectInstallation(
  projectMap: Map<string, { packageJson?: PackageJson; projectDir: string }>,
  sourceRoot: string,
  codeqlExePath?: string,
): Map<string, string> {
  console.warn('WARN: Falling back to direct dependency installation in project directories.');

  // Convert project directories to the set format expected by the original implementation
  const packageJsonDirs = new Set<string>();
  projectMap.forEach((project, _projectDir) => {
    if (project.packageJson) {
      // Include all projects with package.json, even if they don't specify @sap/cds explicitly
      packageJsonDirs.add(join(sourceRoot, project.projectDir));
    }
  });

  // Sanity check that we found at least one package.json directory
  if (packageJsonDirs.size === 0) {
    console.warn(
      'WARN: failed to detect any package.json directories for cds compiler installation.',
    );
    return new Map<string, string>();
  }

  packageJsonDirs.forEach(dir => {
    console.log(`Installing node dependencies from ${dir}/package.json ...`);
    try {
      execFileSync('npm', ['install', '--quiet', '--no-audit', '--no-fund'], {
        cwd: dir,
        stdio: 'inherit',
      });

      // Order is important here. Install dependencies from package.json in the directory,
      // then install the CDS development kit (`@sap/cds-dk`) in the directory.
      console.log(`Installing '@sap/cds-dk' into ${dir} to enable CDS compilation ...`);
      execFileSync(
        'npm',
        ['install', '--quiet', '--no-audit', '--no-fund', '--no-save', '@sap/cds-dk'],
        { cwd: dir, stdio: 'inherit' },
      );
    } catch (err) {
      const errorMessage = `Failed to install dependencies in ${dir}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMessage);
      if (codeqlExePath) {
        const packageJsonPath = join(dir, 'package.json');
        addDependencyDiagnostic(packageJsonPath, errorMessage, codeqlExePath);
      }
    }
  });

  return new Map<string, string>();
}
