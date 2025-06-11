import { filterPathsInMessage } from './filter';
import type { LogLevel } from './types';

/**
 * Source root directory for path filtering. When set, absolute paths
 * starting with this directory will be converted to relative paths.
 */
let sourceRootDirectory: string | undefined;

/**
 * Sets the source root directory for path filtering in log messages.
 * This should typically be called once at the start of the CDS extractor.
 *
 * @param sourceRoot - The absolute path to the source root directory
 */
export function setSourceRootDirectory(sourceRoot: string): void {
  sourceRootDirectory = sourceRoot;
}

/**
 * Unified logging function for the CDS extractor. Provides consistent
 * log formatting with level prefixes and path filtering.
 *
 * @param level - The log level ('debug', 'info', 'warn', 'error')
 * @param message - The primary message or data to log
 * @param optionalParams - Additional parameters to log (same as console.log)
 */
export function cdsExtractorLog(
  level: LogLevel,
  message: unknown,
  ...optionalParams: unknown[]
): void {
  if (!sourceRootDirectory) {
    throw new Error('Source root directory is not set. Call setSourceRootDirectory() first.');
  }

  // Convert log level to uppercase for consistent formatting
  const levelPrefix = `${level.toUpperCase()}: `;

  // Process the primary message for path filtering if it's a string
  let processedMessage: string;
  if (typeof message === 'string') {
    processedMessage = levelPrefix + filterPathsInMessage(sourceRootDirectory, message);
  } else {
    // For non-string messages, just add the prefix
    processedMessage = levelPrefix;
  }

  // Select the appropriate console function based on log level
  switch (level) {
    case 'debug':
    case 'info':
      if (typeof message === 'string') {
        console.log(processedMessage, ...optionalParams);
      } else {
        console.log(processedMessage, message, ...optionalParams);
      }
      break;
    case 'warn':
      if (typeof message === 'string') {
        console.warn(processedMessage, ...optionalParams);
      } else {
        console.warn(processedMessage, message, ...optionalParams);
      }
      break;
    case 'error':
      if (typeof message === 'string') {
        console.error(processedMessage, ...optionalParams);
      } else {
        console.error(processedMessage, message, ...optionalParams);
      }
      break;
    default:
      // This should never happen due to TypeScript typing
      throw new Error(`Invalid log level: ${String(level)}`);
  }
}
