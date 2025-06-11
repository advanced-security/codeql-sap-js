/**
 * Filters absolute paths in a message to relative paths when they start
 * with the configured source root directory. Special handling for the
 * source root directory logging message itself.
 *
 * @param sourceRootDirectory - The absolute path to the source root directory.
 * @param message - The message to filter.
 * @returns The filtered message with relative paths.
 */
export function filterPathsInMessage(sourceRootDirectory: string, message: string): string {
  // Special case: allow source root directory logging message to pass through unchanged
  if (message.startsWith('CDS extractor source root directory: ')) {
    return message;
  }

  // If no source root directory is configured, return message unchanged
  if (!sourceRootDirectory) {
    return message;
  }

  // Normalize source root directory (ensure it ends with a path separator)
  const normalizedSourceRoot = sourceRootDirectory.endsWith('/')
    ? sourceRootDirectory
    : sourceRootDirectory + '/';

  // Replace all occurrences of the source root directory with relative paths
  return message.replace(
    new RegExp(normalizedSourceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    '',
  );
}
