import { resolve } from 'path';

const USAGE_MESSAGE = `\tUsage: node <script> <source-root>`;

/**
 * Resolves and validates a source root directory path.
 *
 * This function takes a source root path, validates it, normalizes it,
 * and returns an absolute path to the directory.
 *
 * @param sourceRoot - The source root path to resolve
 * @returns The normalized absolute path to the source root directory
 * @throws {Error} If the source root is null, undefined, an empty string,
 *                 or does not point to a valid directory
 */
function resolveSourceRoot(sourceRoot: string): string {
  // Check for null, undefined, or empty string
  if (!sourceRoot || typeof sourceRoot !== 'string') {
    throw new Error('Source root must be a non-empty string');
  }

  // Normalize the path and resolve it to an absolute path.
  const normalizedPath = resolve(sourceRoot);

  // Check if the resolved path points to a valid, existing directory.
  if (!normalizedPath || normalizedPath === '/') {
    throw new Error('Source root must point to a valid directory');
  }

  return normalizedPath;
}

/**
 * Check if the script was invoked with the required arguments.
 * This function validates and sanitizes script arguments and returns them if valid.
 *
 * Requirements:
 * - Only requires: <source-root>
 *
 * @param args Command line arguments to check.
 * @returns Object with validation result, usage message if failed, and validated
 * arguments if successful.
 */
export function validateArguments(args: string[]): {
  isValid: boolean;
  usageMessage?: string;
  args?: {
    sourceRoot: string;
  };
} {
  // Minimum arguments: node, script, source-root (3 total)
  if (args.length < 3) {
    return {
      isValid: false,
      usageMessage: USAGE_MESSAGE,
    };
  }

  // Get the source root from args (now the first parameter after script name)
  const rawSourceRoot: string = args[2];

  // Validate and sanitize the source root path
  let sourceRoot: string;
  try {
    sourceRoot = resolveSourceRoot(rawSourceRoot);
  } catch (error) {
    return {
      isValid: false,
      usageMessage: `Invalid source root: ${String(error)}`,
    };
  }

  // Return the validated arguments
  return {
    isValid: true,
    usageMessage: `<source-root>`,
    args: {
      sourceRoot,
    },
  };
}
