import { relative } from 'path';

/**
 * Helper functions for mapping CDS files to their projects and cache directories
 */

/**
 * Find the project directory for a CDS file
 * @param cdsFilePath Path to the CDS file
 * @param sourceRoot Source root directory
 * @param projectMap Map of project directories to project objects
 * @returns The project directory the file belongs to, or undefined if not found
 */
export function findProjectForCdsFile(
  cdsFilePath: string,
  sourceRoot: string,
  projectMap: Map<string, { cdsFiles: string[] }>,
): string | undefined {
  // Get the relative path to the project directory for this CDS file
  const relativeCdsFilePath = relative(sourceRoot, cdsFilePath);

  // If the file is outside the source root, path.relative() will start with '../'
  // In this case, we should also check against the absolute path
  const isOutsideSourceRoot = relativeCdsFilePath.startsWith('../');

  // Find the project this file belongs to
  for (const [projectDir, project] of projectMap.entries()) {
    if (
      project.cdsFiles.some(
        cdsFile =>
          cdsFile === relativeCdsFilePath ||
          relativeCdsFilePath.startsWith(projectDir) ||
          (isOutsideSourceRoot && cdsFile === cdsFilePath),
      )
    ) {
      return projectDir;
    }
  }

  return undefined;
}
