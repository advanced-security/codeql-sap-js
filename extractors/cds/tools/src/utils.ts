const USAGE_MESSAGE = `\tUsage: node <script> <source-root>`;

/**
 * Check if the script was invoked with the required arguments.
 * This function validates and sanitizes script arguments and returns them if valid.
 * The CDS extractor now runs in autobuild mode by default.
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
  const sourceRoot: string = args[2];

  // Return the validated arguments
  return {
    isValid: true,
    usageMessage: `<source-root>`,
    args: {
      sourceRoot,
    },
  };
}
