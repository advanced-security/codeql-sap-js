import { resolve } from 'path';

import { RunMode } from './runMode';

const USAGE_MESSAGE = `\tUsage1: node <script> ${RunMode.DEBUG_PARSER} <source-root>
\tUsage2: node <script> ${RunMode.DEBUG_COMPILER} <source-root>
\tUsage3: node <script> ${RunMode.INDEX_FILES} <source-root> <response-file>
\tUsage4: node <script> ${RunMode.AUTOBUILD} <source-root>`;

/**
 * Safely get a command-line parameter and properly resolve the path.
 * @param `args` - Command line arguments array.
 * @param `index` - Index of the argument to get.
 * @param `defaultValue` - Default value to return if argument is not present.
 * @returns The resolved argument value or the default value
 */
export function getArg(args: string[], index: number, defaultValue = ''): string {
  if (index < args.length) {
    // Handle the path resolution properly without unnecessary quoting
    return resolve(args[index]);
  }
  return defaultValue;
}

/**
 * Check if the script was invoked with the required arguments based on run mode.
 * This function validates and sanitizes script arguments and returns them if valid.
 *
 * Requirements:
 * - For 'index-files' mode: <run-mode> <source-root> <response-file>
 * - For 'debug-*' modes: <run-mode> <source-root> [<response-file>]
 * - For 'autobuild' mode: <run-mode> <source-root>
 *
 * @param args Command line arguments to check.
 * @returns Object with validation result, usage message if failed, and validated
 * arguments if successful.
 */
export function validateArguments(args: string[]): {
  isValid: boolean;
  usageMessage?: string;
  args?: {
    runMode: string;
    sourceRoot: string;
    responseFile: string;
  };
} {
  const scriptPath = args[1] ?? '';
  const scriptName = scriptPath.split(/[/\\]/).pop() ?? 'cds-extractor.js';

  // Minimum arguments: node, script, run-mode, source-root (4 total)
  if (args.length < 4) {
    return {
      isValid: false,
      usageMessage: USAGE_MESSAGE,
    };
  }

  // Get the run mode from args.
  const runMode: string = args[2];

  // Validate that the run mode is supported.
  if (!Object.values(RunMode).includes(runMode as RunMode)) {
    return {
      isValid: false,
      usageMessage: `Invalid run mode '${runMode}'. Supported run modes: [${Object.values(RunMode).join(', ')}]\n${USAGE_MESSAGE}`,
    };
  }

  // Validate argument count based on the actual run mode
  // For 'index-files' mode, all three args are required: run-mode, source-root, response-file
  if (runMode === (RunMode.INDEX_FILES as string) && args.length < 5) {
    return {
      isValid: false,
      usageMessage: `For '${RunMode.INDEX_FILES}' mode: node ${scriptName} ${RunMode.INDEX_FILES} <source-root> <response-file>`,
    };
  }

  // For other modes, only run-mode and source-root are required
  if (runMode !== (RunMode.INDEX_FILES as string) && args.length < 4) {
    return {
      isValid: false,
      usageMessage: `For '${runMode}' mode: node ${scriptName} ${runMode} <source-root> [<response-file>]`,
    };
  }

  // If we made it here, arguments are valid.
  const sourceRoot: string = args[3];

  // responseFile is only required for index-files mode, otherwise it can be empty.
  const responseFile: string = args[4] || '';

  // Create a usage message specific to the run mode for valid arguments
  let usageMessage = '';
  if (runMode === (RunMode.DEBUG_PARSER as string)) {
    usageMessage = `${RunMode.DEBUG_PARSER} <source-root> [<response-file>]`;
  } else if (runMode === (RunMode.DEBUG_COMPILER as string)) {
    usageMessage = `${RunMode.DEBUG_COMPILER} <source-root> [<response-file>]`;
  } else if (runMode === (RunMode.INDEX_FILES as string)) {
    usageMessage = `${RunMode.INDEX_FILES} <source-root> <response-file>`;
  } else if (runMode === (RunMode.AUTOBUILD as string)) {
    usageMessage = `${RunMode.AUTOBUILD} <source-root>`;
  }

  // Return the validated arguments without modifying them.
  return {
    isValid: true,
    usageMessage,
    args: {
      runMode,
      sourceRoot,
      responseFile,
    },
  };
}
