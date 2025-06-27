import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, sep } from 'path';

import { sync } from 'glob';

import {
  CdsAccessControl,
  CdsAnnotation,
  CdsEntity,
  CdsExposedEntity,
  CdsImport,
  CdsParseResult,
  CdsProperty,
  CdsService,
  FileCache,
  PackageJson,
} from './types';
import { cdsExtractorLog } from '../../logging';

// Global file cache to avoid multiple reads of the same file
const fileCache: FileCache = {
  fileContents: new Map<string, string>(),
  packageJsonCache: new Map<string, PackageJson>(),
  cdsParseCache: new Map<string, CdsParseResult>(),
};

/**
 * Clear the file cache - useful for testing or when memory needs to be freed
 */
export function clearFileCache(): void {
  fileCache.fileContents.clear();
  fileCache.packageJsonCache.clear();
  fileCache.cdsParseCache.clear();
}

/**
 * Merge and consolidate multiple CDS parse results
 * This is useful when analyzing related CDS files that belong to to the same project
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

  const projectDirs: string[] = [];
  const processedDirectories = new Set<string>();

  // Find all package.json files under the source directory, excluding node_modules
  const packageJsonFiles = sync(join(sourceRootDir, '**/package.json'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
  });

  // Check each directory containing a package.json file
  for (const packageJsonFile of packageJsonFiles) {
    const dir = dirname(packageJsonFile);

    // Skip if we've already processed this directory
    if (processedDirectories.has(dir)) {
      continue;
    }

    // Only consider this directory if it's likely a CDS project
    if (isLikelyCdsProject(dir)) {
      // Add the directory relative to sourceRootDir
      const relativePath = relative(sourceRootDir, dir);
      // Handle the case where the project is at the root (relative path becomes empty string)
      const projectDir = relativePath || '.';
      projectDirs.push(projectDir);
      processedDirectories.add(dir);
    }
  }

  // Also check directories that have .cds files but no package.json, excluding node_modules
  const cdsFiles = sync(join(sourceRootDir, '**/*.cds'), {
    nodir: true,
    ignore: ['**/node_modules/**', '**/*.testproj/**'],
  });
  const cdsDirsSet = new Set(cdsFiles.map(file => dirname(file)));
  const cdsDirs = Array.from(cdsDirsSet);

  for (const dir of cdsDirs) {
    // Skip if we've already processed this directory or a parent
    if (isDirectoryProcessed(dir, processedDirectories)) {
      continue;
    }

    // Only proceed if this directory is likely a CDS project on its own
    // But first check if it's part of an already identified project
    let isPartOfExistingProject = false;
    for (const processedDir of processedDirectories) {
      if (dir.startsWith(processedDir + sep) || dir === processedDir) {
        isPartOfExistingProject = true;
        break;
      }
    }

    if (isPartOfExistingProject) {
      continue;
    }

    if (isLikelyCdsProject(dir)) {
      // Check if this directory appears to be a standalone CDS project
      const standaloneProjectDir = findProjectRootFromCdsFile(dir, sourceRootDir);
      if (standaloneProjectDir) {
        const relativePath = relative(sourceRootDir, standaloneProjectDir);
        // Handle the case where the project is at the root (relative path becomes empty string)
        const projectDir = relativePath || '.';
        if (!projectDirs.includes(projectDir)) {
          projectDirs.push(projectDir);
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
  // Skip node_modules and testproj directories entirely
  if (dir.includes('node_modules') || dir.includes('.testproj')) {
    return true; // Consider these as already processed to skip them
  }

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
  // Skip node_modules and testproj directories entirely
  if (cdsFileDir.includes('node_modules') || cdsFileDir.includes('.testproj')) {
    return null;
  }

  let currentDir = cdsFileDir;

  // Limit the upward search to the sourceRootDir
  while (currentDir.startsWith(sourceRootDir)) {
    // Check if this directory looks like a project root
    if (isLikelyCdsProject(currentDir)) {
      // Instead of returning immediately, check for parent directories that might
      // be the real project root containing both db and srv directories
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
 * Determines if a directory likely contains a CAP project
 * by checking for key indicators like package.json with CAP dependencies
 * or .cds files in standard locations
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
        // If this has workspaces defined, it's likely a monorepo root, not a CDS project itself
        // unless it also has CDS files or standard CDS directories
        if (
          packageJson.workspaces &&
          Array.isArray(packageJson.workspaces) &&
          packageJson.workspaces.length > 0
        ) {
          // This is likely a monorepo - only treat as CDS project if it has actual CDS content
          const hasStandardCdsDirectories = hasStandardCdsContent(dir);
          const hasDirectCdsFiles = hasDirectCdsContent(dir);

          if (!hasStandardCdsDirectories && !hasDirectCdsFiles) {
            // This is a monorepo root without its own CDS content
            return false;
          }
        }

        return true;
      }
    }

    // Check for CDS files in standard locations (checking both direct and nested files)
    if (hasStandardCdsContent(dir)) {
      return true;
    }

    // Check for direct CDS files in the directory
    if (hasDirectCdsContent(dir)) {
      return true;
    }

    return false;
  } catch (error: unknown) {
    cdsExtractorLog('error', `Error checking directory ${dir}: ${String(error)}`);
    return false;
  }
}

/**
 * Check if a directory has CDS content in standard CAP directories
 */
function hasStandardCdsContent(dir: string): boolean {
  const standardLocations = [join(dir, 'db'), join(dir, 'srv'), join(dir, 'app')];

  for (const location of standardLocations) {
    if (existsSync(location) && statSync(location).isDirectory()) {
      // Check for any .cds files at any level under these directories
      const cdsFiles = sync(join(location, '**/*.cds'), { nodir: true });
      if (cdsFiles.length > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a directory has direct CDS files
 */
function hasDirectCdsContent(dir: string): boolean {
  const directCdsFiles = sync(join(dir, '*.cds'));
  return directCdsFiles.length > 0;
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
      cdsExtractorLog('error', `Error processing file ${absoluteFilePath}: ${String(error)}`);
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
    cdsExtractorLog('error', `Error reading file ${filePath}: ${String(error)}`);
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
    cdsExtractorLog('warn', `Error parsing package.json at ${filePath}: ${String(error)}`);
    return undefined;
  }
}

/**
 * Determines which CDS files in a project should be compiled to JSON.
 * For CAP projects with typical directory structure (db/, srv/), we should use project-aware compilation.
 * For other projects, we fall back to the previous approach of identifying root files.
 *
 * @param sourceRootDir - The source root directory
 * @param project - The CDS project to analyze
 * @returns Array of CDS file paths (relative to source root) that should be compiled
 */
export function determineCdsFilesToCompile(
  sourceRootDir: string,
  project: {
    cdsFiles: string[];
    imports?: Map<string, CdsImport[]>;
    projectDir: string;
  },
): string[] {
  if (!project.cdsFiles || project.cdsFiles.length === 0) {
    return [];
  }

  // If there's only one CDS file, it should be compiled individually
  if (project.cdsFiles.length === 1) {
    return [...project.cdsFiles];
  }

  // Check if this looks like a CAP project with typical directory structure
  const absoluteProjectDir = join(sourceRootDir, project.projectDir);
  const hasCapStructure = hasTypicalCapDirectoryStructure(project.cdsFiles);
  const isCapProject = isLikelyCdsProject(absoluteProjectDir);

  // Use project-level compilation only if:
  // 1. It has CAP package.json dependencies OR
  // 2. It has the typical CAP directory structure (db/, srv/ etc.)
  if (
    project.cdsFiles.length > 1 &&
    (hasCapStructure || (isCapProject && hasPackageJsonWithCapDeps(absoluteProjectDir)))
  ) {
    // For CAP projects, we should use project-level compilation
    // Return a special marker that indicates the entire project should be compiled together
    return ['__PROJECT_LEVEL_COMPILATION__'];
  }

  // For non-CAP projects or when we can't determine project type,
  // fall back to the original logic of identifying root files
  if (!project.imports || project.imports.size === 0) {
    return [...project.cdsFiles];
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
      return [...project.cdsFiles];
    }

    return rootFiles;
  } catch (error) {
    cdsExtractorLog(
      'warn',
      `Error determining files to compile for project ${project.projectDir}: ${String(error)}`,
    );
    // Fall back to compiling all files on error
    return [...project.cdsFiles];
  }
}

/**
 * Determines the expected output files for a project based on its compilation strategy.
 * This function predicts what .cds.json files will be generated during compilation.
 *
 * @param project - The CDS project to analyze
 * @returns Array of expected output file paths (relative to source root)
 */
export function determineExpectedOutputFiles(project: {
  cdsFiles: string[];
  cdsFilesToCompile: string[];
  projectDir: string;
}): string[] {
  const expectedFiles: string[] = [];

  // Check if this project uses project-level compilation
  const usesProjectLevelCompilation = project.cdsFilesToCompile.includes(
    '__PROJECT_LEVEL_COMPILATION__',
  );

  if (usesProjectLevelCompilation) {
    // For project-level compilation, expect a single model.cds.json file in the project root
    const projectModelFile = join(project.projectDir, 'model.cds.json');
    expectedFiles.push(projectModelFile);
  } else {
    // For individual file compilation, expect a .cds.json file for each file to compile
    for (const cdsFile of project.cdsFilesToCompile) {
      if (cdsFile !== '__PROJECT_LEVEL_COMPILATION__') {
        expectedFiles.push(`${cdsFile}.json`);
      }
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
 * Checks if a directory has a package.json with CAP dependencies
 */
function hasPackageJsonWithCapDeps(dir: string): boolean {
  try {
    const packageJsonPath = join(dir, 'package.json');
    const packageJson = readPackageJsonWithCache(packageJsonPath);

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
