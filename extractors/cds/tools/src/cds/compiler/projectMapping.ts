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
  const relativeCdsFilePath = cdsFilePath.startsWith(sourceRoot)
    ? cdsFilePath.substring(sourceRoot.length + 1)
    : cdsFilePath;

  // Find the project this file belongs to
  for (const [projectDir, project] of projectMap.entries()) {
    if (
      project.cdsFiles.some(
        cdsFile => cdsFile === relativeCdsFilePath || relativeCdsFilePath.startsWith(projectDir),
      )
    ) {
      return projectDir;
    }
  }

  return undefined;
}
