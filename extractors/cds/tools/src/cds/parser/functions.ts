import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';

import { sync } from 'glob';

import { writeParserDebugInfo } from './debug';
import {
  CdsAccessControl,
  CdsAnnotation,
  CdsEntity,
  CdsExposedEntity,
  CdsImport,
  CdsParseResult,
  CdsProject,
  CdsProperty,
  CdsService,
  FileCache,
  PackageJson,
} from './types';

// Global file cache to avoid multiple reads of the same file
const fileCache: FileCache = {
  fileContents: new Map<string, string>(),
  packageJsonCache: new Map<string, PackageJson>(),
  cdsParseCache: new Map<string, CdsParseResult>(),
};

/**
 * Builds a dependency graph of CDS projects and performs the initial parsing stage of the CDS extractor.
 * This is the top-level function for the parser stage of the CDS extractor.
 *
 * @param sourceRootDir - Source root directory
 * @param runMode - Current run mode (index-files, debug-parser, or autobuild)
 * @param scriptDir - Directory where the script is running (for debug output)
 * @returns Map of project directories to their CdsProject objects with dependency information
 */
export function buildCdsProjectDependencyGraph(
  sourceRootDir: string,
  runMode?: string,
  scriptDir?: string,
): Map<string, CdsProject> {
  // If debug-parser mode, log additional information
  if (runMode === 'debug-parser') {
    console.log('Running CDS Parser in debug mode...');
    console.log(`Source Root Directory: ${sourceRootDir}`);
  }

  // Find all CDS projects under the source directory
  console.log('Detecting CDS projects...');
  const projectDirs = determineCdsProjectsUnderSourceDir(sourceRootDir);

  if (projectDirs.length === 0) {
    console.log('No CDS projects found.');
    return new Map<string, CdsProject>();
  }

  console.log(`Found ${projectDirs.length} CDS project(s) under source directory.`);

  const projectMap = new Map<string, CdsProject>();

  // First pass: create CdsProject objects for each project directory
  for (const projectDir of projectDirs) {
    const absoluteProjectDir = join(sourceRootDir, projectDir);
    const cdsFiles = determineCdsFilesForProjectDir(sourceRootDir, absoluteProjectDir);

    // Try to load package.json if it exists
    const packageJsonPath = join(absoluteProjectDir, 'package.json');
    const packageJson = readPackageJsonWithCache(packageJsonPath);

    projectMap.set(projectDir, {
      projectDir,
      cdsFiles,
      packageJson,
      dependencies: [],
    });
  }

  // Second pass: analyze dependencies between projects
  console.log('Analyzing dependencies between CDS projects...');
  for (const [projectDir, project] of projectMap.entries()) {
    // Check each CDS file for imports
    for (const relativeFilePath of project.cdsFiles) {
      const absoluteFilePath = join(sourceRootDir, relativeFilePath);

      try {
        const imports = extractCdsImports(absoluteFilePath);

        // Process each import
        for (const importInfo of imports) {
          if (importInfo.isRelative) {
            // Resolve the relative import path
            const importedFilePath = resolve(dirname(absoluteFilePath), importInfo.path);
            const normalizedImportedPath = importedFilePath.endsWith('.cds')
              ? importedFilePath
              : `${importedFilePath}.cds`;

            // Find which project contains this imported file
            for (const [otherProjectDir, otherProject] of projectMap.entries()) {
              if (otherProjectDir === projectDir) continue; // Skip self

              const otherProjectAbsoluteDir = join(sourceRootDir, otherProjectDir);

              // Check if the imported file is in the other project
              const isInOtherProject = otherProject.cdsFiles.some(otherFile => {
                const otherAbsolutePath = join(sourceRootDir, otherFile);
                return (
                  otherAbsolutePath === normalizedImportedPath ||
                  normalizedImportedPath.startsWith(otherProjectAbsoluteDir + sep)
                );
              });

              if (isInOtherProject) {
                // Add dependency if not already present
                project.dependencies ??= [];

                if (!project.dependencies.includes(otherProject)) {
                  project.dependencies.push(otherProject);
                }
              }
            }
          }
          // For module imports, check package.json dependencies
          else if (importInfo.isModule && project.packageJson) {
            const dependencies = {
              ...(project.packageJson.dependencies ?? {}),
              ...(project.packageJson.devDependencies ?? {}),
            };

            // Extract module name from import path (e.g., '@sap/cds/common' -> '@sap/cds')
            const moduleName = importInfo.path.split('/')[0].startsWith('@')
              ? importInfo.path.split('/').slice(0, 2).join('/')
              : importInfo.path.split('/')[0];

            if (dependencies[moduleName]) {
              // This is a valid module dependency, nothing more to do here
              // In the future, we could track module dependencies separately
            }
          }
        }
      } catch (error: unknown) {
        console.warn(`Error processing imports in ${absoluteFilePath}: ${String(error)}`);
      }
    }
  }

  // Handle debug mode specifically if requested
  if (runMode === 'debug-parser' && scriptDir) {
    // Output the project graph to a debug file
    if (!writeParserDebugInfo(projectMap, sourceRootDir, scriptDir)) {
      console.warn(
        'Failed to write parser debug information. This indicates an empty project map, possibly due to a misconfiguration when calling the parent script.',
      );
    }

    // Instead of exiting directly (which interrupts tests), return with a signal property
    if (projectMap.size === 0) {
      return Object.assign(projectMap, { __debugParserFailure: true });
    } else {
      return Object.assign(projectMap, { __debugParserSuccess: true });
    }
  }

  return projectMap;
}

/**
 * Clear the file cache - useful for testing or when memory needs to be freed
 */
export function clearFileCache(): void {
  fileCache.fileContents.clear();
  fileCache.packageJsonCache.clear();
  fileCache.cdsParseCache.clear();
}

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
  if (!projectDir.startsWith(sourceRootDir)) {
    throw new Error('projectDir must be a subdirectory of sourceRootDir.');
  }

  try {
    // Use glob to find all .cds files under the project directory
    const cdsFiles = sync(join(projectDir, '**/*.cds'), { nodir: true });

    // Convert absolute paths to paths relative to sourceRootDir
    return cdsFiles.map(file => relative(sourceRootDir, file));
  } catch (error: unknown) {
    console.error(`Error finding CDS files in ${projectDir}: ${String(error)}`);
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

  const projectDirs: string[] = [];
  const processedDirectories = new Set<string>();

  // Find all package.json files under the source directory
  const packageJsonFiles = sync(join(sourceRootDir, '**/package.json'), { nodir: true });

  // Check each directory containing a package.json file
  for (const packageJsonFile of packageJsonFiles) {
    const dir = dirname(packageJsonFile);

    // Skip if we've already processed this directory
    if (processedDirectories.has(dir)) {
      continue;
    }

    processedDirectories.add(dir);

    // Only consider this directory if it's likely a CDS project
    if (isLikelyCdsProject(dir)) {
      // Add the directory relative to sourceRootDir
      projectDirs.push(relative(sourceRootDir, dir));
    }
  }

  // Also check directories that have .cds files but no package.json
  const cdsFiles = sync(join(sourceRootDir, '**/*.cds'), { nodir: true });
  const cdsDirsSet = new Set(cdsFiles.map(file => dirname(file)));
  const cdsDirs = Array.from(cdsDirsSet);

  for (const dir of cdsDirs) {
    // Skip if we've already processed this directory or a parent
    if (isDirectoryProcessed(dir, processedDirectories)) {
      continue;
    }

    // Only proceed if this directory is likely a CDS project on its own
    if (isLikelyCdsProject(dir)) {
      // Check if this directory appears to be a standalone CDS project
      const standaloneProjectDir = findProjectRootFromCdsFile(dir, sourceRootDir);
      if (standaloneProjectDir) {
        const relativePath = relative(sourceRootDir, standaloneProjectDir);
        if (!projectDirs.includes(relativePath)) {
          projectDirs.push(relativePath);
          processedDirectories.add(standaloneProjectDir);
        }
      }
    }
  }

  return projectDirs;
}

/**
 * Checks if a directory or any of its parent directories has already been processed
 * @param dir - Directory to check
 * @param processedDirectories - Set of already processed directories
 * @returns true if the directory or a parent has been processed
 */
export function isDirectoryProcessed(dir: string, processedDirectories: Set<string>): boolean {
  let currentDir = dir;

  while (currentDir) {
    if (processedDirectories.has(currentDir)) {
      return true;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return false;
}

/**
 * Extract annotations for an entity or service
 */
export function extractAnnotations(content: string, targetName: string): CdsAnnotation[] {
  const annotations: CdsAnnotation[] = [];

  // Look for annotations before the entity or service definition
  const targetRegex = new RegExp(
    `(@\\w+(?:\\.[\\w.]+)?(?:\\s*:\\s*[^;]+)?\\s*\\n\\s*)*(?:entity|service)\\s+${targetName}\\s*`,
    'g',
  );
  let targetMatch;

  if ((targetMatch = targetRegex.exec(content)) !== null) {
    const annotationText = targetMatch[0];
    const annotationRegex = /@([\w.]+)(?:\s*:\s*([^;\n]+))?/g;
    let annotationMatch;

    while ((annotationMatch = annotationRegex.exec(annotationText)) !== null) {
      const name = annotationMatch[1];
      const value = annotationMatch[2] ? parseAnnotationValue(annotationMatch[2]) : true;

      annotations.push({
        name,
        value,
        sourceFile: '', // Will be filled in by the caller
      });
    }
  }

  // Also check for annotate statements
  const annotateRegex = new RegExp(`annotate\\s+${targetName}\\s+with\\s+{([^}]*)}`, 'g');
  let annotateMatch;

  if ((annotateMatch = annotateRegex.exec(content)) !== null) {
    const annotateBody = annotateMatch[1];
    const annotationRegex = /@([\w.]+)(?:\s*:\s*([^;\n]+))?/g;
    let annotationMatch;

    while ((annotationMatch = annotationRegex.exec(annotateBody)) !== null) {
      const name = annotationMatch[1];
      const value = annotationMatch[2] ? parseAnnotationValue(annotationMatch[2]) : true;

      annotations.push({
        name,
        value,
        sourceFile: '', // Will be filled in by the caller
      });
    }
  }

  return annotations;
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

  const content = readFileWithCache(filePath);
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
 * Extract property annotations from an entity body
 */
export function extractPropertyAnnotations(
  entityBody: string,
  propertyName: string,
): CdsAnnotation[] {
  const annotations: CdsAnnotation[] = [];

  // Look for annotations before the property definition
  const propertyRegex = new RegExp(
    `(@\\w+(?:\\.[\\w.]+)?(?:\\s*:\\s*[^;]+)?\\s*\\n\\s*)*${propertyName}\\s*:`,
    'g',
  );
  let propertyMatch;

  if ((propertyMatch = propertyRegex.exec(entityBody)) !== null) {
    const annotationText = propertyMatch[0];
    const annotationRegex = /@([\w.]+)(?:\s*:\s*([^;\n]+))?/g;
    let annotationMatch;

    while ((annotationMatch = annotationRegex.exec(annotationText)) !== null) {
      const name = annotationMatch[1];
      const value = annotationMatch[2] ? parseAnnotationValue(annotationMatch[2]) : true;

      annotations.push({
        name,
        value,
        sourceFile: '', // Will be filled in by the caller
      });
    }
  }

  return annotations;
}

/**
 * Attempts to find the project root directory starting from a directory containing a CDS file
 *
 * @param cdsFileDir - Directory containing a CDS file
 * @param sourceRootDir - Source root directory to limit the search
 * @returns The project root directory or null if not found
 */
export function findProjectRootFromCdsFile(
  cdsFileDir: string,
  sourceRootDir: string,
): string | null {
  let currentDir = cdsFileDir;

  // Limit the upward search to the sourceRootDir
  while (currentDir.startsWith(sourceRootDir)) {
    // Check if this directory looks like a project root
    if (isLikelyCdsProject(currentDir)) {
      // Instead of returning immediately, check for parent directories that might
      // be the real project root containing both db and srv directories
      const parentDir = dirname(currentDir);

      if (parentDir !== currentDir && parentDir.startsWith(sourceRootDir)) {
        const hasDbDir =
          existsSync(join(parentDir, 'db')) && statSync(join(parentDir, 'db')).isDirectory();
        const hasSrvDir =
          existsSync(join(parentDir, 'srv')) && statSync(join(parentDir, 'srv')).isDirectory();

        if (hasDbDir && hasSrvDir) {
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
 * Gets a list of all CDS files in the given source directory, organized by project.
 * This function attempts to avoid duplicate processing by understanding project structure.
 *
 * @param sourceRootDir - Source root directory
 * @returns Array of CDS files, each with project information
 */
export function getAllCdsFiles(sourceRootDir: string): { filePath: string; project: string }[] {
  try {
    // Build project dependency graph directly
    const projectMap = buildCdsProjectDependencyGraph(sourceRootDir);

    // Collect all CDS files with their project information
    const result: { filePath: string; project: string }[] = [];

    for (const [projectDir, project] of projectMap.entries()) {
      for (const cdsFile of project.cdsFiles) {
        result.push({
          filePath: cdsFile,
          project: projectDir,
        });
      }
    }

    return result;
  } catch (error: unknown) {
    console.error(`Error getting all CDS files: ${String(error)}`);
    return [];
  }
}

/**
 * Determines if a directory likely contains a CAP project
 * by checking for key indicators like package.json with CAP dependencies
 * or .cds files in standard locations
 *
 * @param dir - Directory to check
 * @returns true if the directory likely contains a CAP project
 */
export function isLikelyCdsProject(dir: string): boolean {
  try {
    // Check if package.json exists and has CAP dependencies
    const packageJsonPath = join(dir, 'package.json');
    const packageJson = readPackageJsonWithCache(packageJsonPath);

    if (packageJson) {
      const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {}),
      };

      // Check for common CAP dependencies
      if (dependencies['@sap/cds'] || dependencies['@sap/cds-dk']) {
        return true;
      }
    }

    // Check for CDS files in standard locations
    const standardLocations = [join(dir, 'db'), join(dir, 'srv'), join(dir, 'app')];

    for (const location of standardLocations) {
      if (existsSync(location) && statSync(location).isDirectory()) {
        const cdsFiles = sync(join(location, '*.cds'));
        if (cdsFiles.length > 0) {
          return true;
        }
      }
    }

    // Check for direct CDS files in the directory
    const directCdsFiles = sync(join(dir, '*.cds'));
    if (directCdsFiles.length > 0) {
      return true;
    }

    return false;
  } catch (error: unknown) {
    console.error(`Error checking directory ${dir}: ${String(error)}`);
    return false;
  }
}

/**
 * Parses the content of a CDS file to extract entities, services, etc.
 * This is a lightweight parser that uses regex to identify key structures
 * in a CDS file without using the full CDS compiler
 *
 * @param filePath - Path to the CDS file
 * @returns Parsed CDS content
 */
export function parseCdsFile(filePath: string): CdsParseResult {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  // Check cache first
  if (fileCache.cdsParseCache.has(filePath)) {
    return fileCache.cdsParseCache.get(filePath)!;
  }

  const content = readFileWithCache(filePath);
  const result: CdsParseResult = {
    entities: [],
    services: [],
    imports: extractCdsImports(filePath),
    accessControls: [],
    contexts: [],
    errors: [],
  };

  try {
    // Extract namespace
    const namespaceMatch = content.match(/namespace\s+([\w.]+)\s*;/);
    if (namespaceMatch) {
      result.namespace = namespaceMatch[1];
    }

    // Extract entity definitions
    const entityRegex = /entity\s+(\w+)(?:\s*:\s*(\w+))?\s*\{([^}]*)}/g;
    let entityMatch;
    while ((entityMatch = entityRegex.exec(content)) !== null) {
      const entityName = entityMatch[1];
      const extendsName = entityMatch[2];
      const entityBody = entityMatch[3];

      const fqn = result.namespace ? `${result.namespace}.${entityName}` : entityName;

      // Extract properties
      const properties = parseEntityProperties(entityBody);

      // Extract annotations for the entity
      const annotations = extractAnnotations(content, entityName);

      result.entities.push({
        name: entityName,
        fqn,
        sourceFile: filePath,
        properties,
        annotations,
        extends: extendsName,
      });
    }

    // Extract service definitions
    const serviceRegex = /service\s+(\w+)\s*\{([^}]*)}/g;
    let serviceMatch;
    while ((serviceMatch = serviceRegex.exec(content)) !== null) {
      const serviceName = serviceMatch[1];
      const serviceBody = serviceMatch[2];

      const fqn = result.namespace ? `${result.namespace}.${serviceName}` : serviceName;

      // Extract exposed entities in the service
      const entities = parseServiceEntities(serviceBody);

      // Extract annotations for the service
      const annotations = extractAnnotations(content, serviceName);

      result.services.push({
        name: serviceName,
        fqn,
        sourceFile: filePath,
        entities,
        annotations,
      });
    }

    // Extract context blocks
    const contextRegex = /context\s+(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)}/g;
    let contextMatch;
    while ((contextMatch = contextRegex.exec(content)) !== null) {
      const contextName = contextMatch[1];
      const contextBody = contextMatch[2];

      // Create a mock content for the context body to reuse the existing parsers
      const contextContent = contextBody;

      // Use a recursive parser for the context content
      const contextFqnPrefix = result.namespace
        ? `${result.namespace}.${contextName}`
        : contextName;

      // Extract entities in the context
      const entityRegex = /entity\s+(\w+)(?:\s*:\s*(\w+))?\s*\{([^}]*)}/g;
      const contextEntities: CdsEntity[] = [];

      while ((entityMatch = entityRegex.exec(contextContent)) !== null) {
        const entityName = entityMatch[1];
        const extendsName = entityMatch[2];
        const entityBody = entityMatch[3];

        const fqn = `${contextFqnPrefix}.${entityName}`;

        // Extract properties
        const properties = parseEntityProperties(entityBody);

        // Extract annotations for the entity
        const annotations = extractAnnotations(contextContent, entityName);

        contextEntities.push({
          name: entityName,
          fqn,
          sourceFile: filePath,
          properties,
          annotations,
          extends: extendsName,
        });
      }

      // Extract services in the context
      const serviceRegex = /service\s+(\w+)\s*\{([^}]*)}/g;
      const contextServices: CdsService[] = [];

      while ((serviceMatch = serviceRegex.exec(contextContent)) !== null) {
        const serviceName = serviceMatch[1];
        const serviceBody = serviceMatch[2];

        const fqn = `${contextFqnPrefix}.${serviceName}`;

        // Extract exposed entities in the service
        const entities = parseServiceEntities(serviceBody);

        // Extract annotations for the service
        const annotations = extractAnnotations(contextContent, serviceName);

        contextServices.push({
          name: serviceName,
          fqn,
          sourceFile: filePath,
          entities,
          annotations,
        });
      }

      result.contexts.push({
        name: contextName,
        entities: contextEntities,
        services: contextServices,
      });
    }

    // Extract access controls
    result.accessControls = extractAccessControls(content, filePath);

    // Cache the parsed result
    fileCache.cdsParseCache.set(filePath, result);
  } catch (error: unknown) {
    result.errors.push(`Error parsing ${filePath}: ${String(error)}`);
  }

  return result;
}

/**
 * Parse properties from an entity body
 */
export function parseEntityProperties(entityBody: string): CdsProperty[] {
  const properties: CdsProperty[] = [];

  // Regular expression to match property definitions
  // This handles: [key] name : Type; and [key] name : Association to [many] Target;
  const propertyRegex =
    /(?:(key)\s+)?(\w+)\s*:\s*(?:(Association|Composition)\s+to\s+(?:(many)\s+)?(\w+)|(\w+))(?:\s*\((.*?)\))?(?:\s+on\s+(.*?))?(?:;|$)/g;

  let propertyMatch;
  while ((propertyMatch = propertyRegex.exec(entityBody)) !== null) {
    const isKey = !!propertyMatch[1];
    const name = propertyMatch[2];
    const isAssociation = propertyMatch[3] === 'Association';
    const isComposition = propertyMatch[3] === 'Composition';
    const cardinality = propertyMatch[4] ? 'many' : 'one';
    const target = propertyMatch[5];
    const type = isAssociation || isComposition ? 'Association' : propertyMatch[6];

    // Extract annotations for the property from the entity body
    const annotations = extractPropertyAnnotations(entityBody, name);

    properties.push({
      name,
      type,
      isKey,
      isAssociation: isAssociation || isComposition,
      isComposition,
      cardinality: isAssociation || isComposition ? cardinality : undefined,
      target,
      annotations,
    });
  }

  return properties;
}

/**
 * Parse the value of an annotation
 */
export function parseAnnotationValue(valueStr: string): unknown {
  valueStr = valueStr.trim();

  // Try to parse as JSON
  try {
    return JSON.parse(valueStr);
  } catch {
    // If it's a quoted string
    if (
      (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))
    ) {
      return valueStr.slice(1, -1);
    }

    // If it's a boolean
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    // If it's a number
    if (!isNaN(Number(valueStr))) return Number(valueStr);

    // Default to returning the string as is
    return valueStr;
  }
}

/**
 * Parse exposed entities in a service
 */
export function parseServiceEntities(serviceBody: string): CdsExposedEntity[] {
  const entities: CdsExposedEntity[] = [];

  // Regular expression to match entity exposures
  // This handles: entity Name as projection on Source; and entity Name as select from Source;
  const entityRegex = /entity\s+(\w+)\s+as\s+(?:projection\s+on|select\s+from)\s+([\w.]+)/g;

  let entityMatch;
  while ((entityMatch = entityRegex.exec(serviceBody)) !== null) {
    const name = entityMatch[1];
    const sourceEntity = entityMatch[2];
    const isProjection = serviceBody.includes(`projection on ${sourceEntity}`);

    // Extract annotations for the exposed entity
    const annotations = extractPropertyAnnotations(serviceBody, name);

    entities.push({
      name,
      sourceEntity,
      isProjection,
      annotations,
    });
  }

  return entities;
}

/**
 * Extract access control definitions from a CDS file
 */
export function extractAccessControls(content: string, sourceFile: string): CdsAccessControl[] {
  const accessControls: CdsAccessControl[] = [];

  // Look for @requires annotations
  const requiresRegex = /@requires\s*:\s*['"]([^'"]+)['"]/g;
  let requiresMatch;

  while ((requiresMatch = requiresRegex.exec(content)) !== null) {
    // Find the target entity or service for this annotation
    const targetMatch = content
      .substring(0, requiresMatch.index)
      .match(/(?:entity|service)\s+(\w+)[^{]*$/);
    if (targetMatch) {
      accessControls.push({
        target: targetMatch[1],
        type: 'requires',
        value: requiresMatch[1],
        sourceFile,
      });
    }
  }

  // Look for annotate statements with @requires
  const annotateRequiresRegex = /annotate\s+([\w.]+)\s+with\s+@requires\s*:\s*['"]([^'"]+)['"]/g;
  let annotateMatch;

  while ((annotateMatch = annotateRequiresRegex.exec(content)) !== null) {
    accessControls.push({
      target: annotateMatch[1],
      type: 'requires',
      value: annotateMatch[2],
      sourceFile,
    });
  }

  // Check for annotate statements with @(...) format
  const annotateBracketRegex =
    /annotate\s+([\w.]+)\s+with\s+@\(\s*requires\s*:\s*['"]([^'"]+)['"]\s*\)/g;
  let bracketMatch;

  while ((bracketMatch = annotateBracketRegex.exec(content)) !== null) {
    accessControls.push({
      target: bracketMatch[1],
      type: 'requires',
      value: bracketMatch[2],
      sourceFile,
    });
  }

  // Also check for annotate statements with braces
  const annotateWithBracesRegex =
    /annotate\s+([\w.]+)\s+with\s+{[^}]*@requires\s*:\s*['"]([^'"]+)['"]/g;
  let bracesMatch;

  while ((bracesMatch = annotateWithBracesRegex.exec(content)) !== null) {
    accessControls.push({
      target: bracesMatch[1],
      type: 'requires',
      value: bracesMatch[2],
      sourceFile,
    });
  }

  // Look for @readonly annotations
  const readonlyRegex = /annotate\s+([\w.]+)\s+with\s+@readonly\s*:\s*(true|false)/g;
  let readonlyMatch;

  while ((readonlyMatch = readonlyRegex.exec(content)) !== null) {
    accessControls.push({
      target: readonlyMatch[1],
      type: 'readonly',
      value: readonlyMatch[2] === 'true', // Convert string to boolean
      sourceFile,
    });
  }

  // Check for readonly annotations with @(...) format
  const readonlyBracketRegex =
    /annotate\s+([\w.]+)\s+with\s+@\(\s*readonly\s*:\s*(true|false)\s*\)/g;
  let readonlyBracketMatch;

  while ((readonlyBracketMatch = readonlyBracketRegex.exec(content)) !== null) {
    accessControls.push({
      target: readonlyBracketMatch[1],
      type: 'readonly',
      value: readonlyBracketMatch[2] === 'true', // Convert string to boolean
      sourceFile,
    });
  }

  return accessControls;
}

/**
 * Merge and consolidate multiple CDS parse results
 * This is useful when analyzing related CDS files that belong to the same project
 *
 * @param results - Array of CDS parse results
 * @returns Consolidated CDS parse result
 */
export function consolidateCdsResults(results: CdsParseResult[]): CdsParseResult {
  const consolidated: CdsParseResult = {
    entities: [],
    services: [],
    imports: [],
    accessControls: [],
    contexts: [],
    errors: [],
  };

  // First, collect all basic definitions
  for (const result of results) {
    consolidated.entities.push(...result.entities);
    consolidated.services.push(...result.services);
    consolidated.imports.push(...result.imports);
    consolidated.accessControls.push(...result.accessControls);
    consolidated.contexts.push(...result.contexts);
    consolidated.errors.push(...result.errors);
  }

  // Then process access controls and apply them to their targets
  const processedAccessControls = new Set<string>();

  for (const accessControl of consolidated.accessControls) {
    const accessControlKey = `${accessControl.target}-${accessControl.type}-${String(accessControl.value)}`;

    // Skip if we've already processed an identical access control
    if (processedAccessControls.has(accessControlKey)) {
      continue;
    }

    processedAccessControls.add(accessControlKey);

    // Find the target service or entity
    // First try exact match, then try with just the name part (allowing for qualified names)
    let targetService = consolidated.services.find(
      s => s.name === accessControl.target || s.fqn === accessControl.target,
    );

    // If no exact match found, try to match just the name part (for cases like "CatalogService")
    if (!targetService && !accessControl.target.includes('.')) {
      targetService = consolidated.services.find(s => s.name === accessControl.target);
    }

    if (targetService) {
      // Check if this annotation already exists
      const existingAnnotation = targetService.annotations.find(
        a => a.name === accessControl.type && a.value === accessControl.value,
      );

      if (!existingAnnotation) {
        // Add this access control as an annotation to the service
        targetService.annotations.push({
          name: accessControl.type,
          value: accessControl.value,
          sourceFile: accessControl.sourceFile,
        });
      }
    } else {
      // Check if this is a qualified entity name like "ServiceName.EntityName"
      const qualifiedNameParts = accessControl.target.split('.');
      if (qualifiedNameParts.length === 2) {
        const serviceName = qualifiedNameParts[0];
        const entityName = qualifiedNameParts[1];

        // Find the service first
        const service = consolidated.services.find(s => s.name === serviceName);
        if (service) {
          // Find the entity inside the service
          const entity = service.entities.find(e => e.name === entityName);
          if (entity) {
            // Check if this annotation already exists
            const existingAnnotation = entity.annotations.find(
              a => a.name === accessControl.type && a.value === accessControl.value,
            );

            if (!existingAnnotation) {
              // Add this access control as an annotation to the entity within service
              entity.annotations.push({
                name: accessControl.type,
                value: accessControl.value,
                sourceFile: accessControl.sourceFile,
              });
            }

            // Skip checking standalone entities since we found a match
            continue;
          }
        }
      }

      // Check if this targets a standalone entity
      const targetEntity = consolidated.entities.find(
        e => e.name === accessControl.target || e.fqn === accessControl.target,
      );

      if (targetEntity) {
        // Check if this annotation already exists
        const existingAnnotation = targetEntity.annotations.find(
          a => a.name === accessControl.type && a.value === accessControl.value,
        );

        if (!existingAnnotation) {
          // Add this access control as an annotation to the entity
          targetEntity.annotations.push({
            name: accessControl.type,
            value: accessControl.value,
            sourceFile: accessControl.sourceFile,
          });
        }
      }
    }
  }

  return consolidated;
}

/**
 * Process a collection of CDS files from a project and build a consolidated model
 *
 * @param sourceRootDir - Source root directory
 * @param projectDir - Project directory
 * @returns Consolidated CDS parse result for the project
 */
export function processCdsProject(sourceRootDir: string, projectDir: string): CdsParseResult {
  const absoluteProjectDir = join(sourceRootDir, projectDir);
  const cdsFiles = determineCdsFilesForProjectDir(sourceRootDir, absoluteProjectDir);

  const parseResults: CdsParseResult[] = [];

  for (const relativeFilePath of cdsFiles) {
    const absoluteFilePath = join(sourceRootDir, relativeFilePath);
    try {
      const result = parseCdsFile(absoluteFilePath);
      parseResults.push(result);
    } catch (error: unknown) {
      console.error(`Error processing file ${absoluteFilePath}: ${String(error)}`);
      // Add an empty result with the error
      parseResults.push({
        entities: [],
        services: [],
        imports: [],
        accessControls: [],
        contexts: [],
        errors: [`Error processing file ${absoluteFilePath}: ${String(error)}`],
      });
    }
  }

  return consolidateCdsResults(parseResults);
}

/**
 * Safely reads a file's content, using the cache if available
 * @param filePath - Path to the file to read
 * @returns The file content as a string
 */
export function readFileWithCache(filePath: string): string {
  if (fileCache.fileContents.has(filePath)) {
    return fileCache.fileContents.get(filePath)!;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    fileCache.fileContents.set(filePath, content);
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${String(error)}`);
    throw error;
  }
}

/**
 * Safely parses a package.json file, using the cache if available
 * @param filePath - Path to the package.json file
 * @returns The parsed package.json content or undefined if the file doesn't exist or can't be parsed
 */
export function readPackageJsonWithCache(filePath: string): PackageJson | undefined {
  if (fileCache.packageJsonCache.has(filePath)) {
    return fileCache.packageJsonCache.get(filePath);
  }

  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    const content = readFileWithCache(filePath);
    const packageJson = JSON.parse(content) as PackageJson;
    fileCache.packageJsonCache.set(filePath, packageJson);
    return packageJson;
  } catch (error) {
    console.warn(`Error parsing package.json at ${filePath}: ${String(error)}`);
    return undefined;
  }
}
