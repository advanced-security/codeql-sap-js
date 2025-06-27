"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArg = getArg;
exports.validateArguments = validateArguments;
const path_1 = require("path");
const USAGE_MESSAGE = `\tUsage: node <script> <source-root>`;
/**
 * Safely get a command-line parameter and properly resolve the path.
 * @param `args` - Command line arguments array.
 * @param `index` - Index of the argument to get.
 * @param `defaultValue` - Default value to return if argument is not present.
 * @returns The resolved argument value or the default value
 */
function getArg(args, index, defaultValue = '') {
    if (index < args.length) {
        // Handle the path resolution properly without unnecessary quoting
        return (0, path_1.resolve)(args[index]);
    }
    return defaultValue;
}
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
function validateArguments(args) {
    // Minimum arguments: node, script, source-root (3 total)
    if (args.length < 3) {
        return {
            isValid: false,
            usageMessage: USAGE_MESSAGE,
        };
    }
    // Get the source root from args (now the first parameter after script name)
    const sourceRoot = args[2];
    // Return the validated arguments
    return {
        isValid: true,
        usageMessage: `<source-root>`,
        args: {
            sourceRoot,
        },
    };
}
//# sourceMappingURL=utils.js.map