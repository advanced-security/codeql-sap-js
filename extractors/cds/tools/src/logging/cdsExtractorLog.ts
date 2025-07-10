import type { LogLevel } from './types';

/**
 * Source root directory for logging context.
 */
let sourceRootDirectory: string | undefined;

/**
 * Unique session ID for this CDS extractor run to help distinguish
 * between multiple concurrent or sequential runs in logs.
 * Uses the extractor start timestamp for uniqueness.
 */
const sessionId = Date.now().toString();

/**
 * Start time of the CDS extractor session for performance tracking.
 */
const extractorStartTime = Date.now();

/**
 * Performance tracking state for timing critical operations.
 */
const performanceTracking = new Map<string, number>();

/**
 * Unified logging function for the CDS extractor. Provides consistent
 * log formatting with level prefixes, elapsed time, and session IDs.
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

  const currentTime = Date.now();
  const elapsedMs = currentTime - extractorStartTime;
  const levelPrefix = `[CDS-${sessionId} ${elapsedMs}] ${level.toUpperCase()}: `;

  // Select the appropriate console function based on log level
  switch (level) {
    case 'debug':
    case 'info':
      if (typeof message === 'string') {
        console.log(levelPrefix + message, ...optionalParams);
      } else {
        console.log(levelPrefix, message, ...optionalParams);
      }
      break;
    case 'warn':
      if (typeof message === 'string') {
        console.warn(levelPrefix + message, ...optionalParams);
      } else {
        console.warn(levelPrefix, message, ...optionalParams);
      }
      break;
    case 'error':
      if (typeof message === 'string') {
        console.error(levelPrefix + message, ...optionalParams);
      } else {
        console.error(levelPrefix, message, ...optionalParams);
      }
      break;
    default:
      // This should never happen due to TypeScript typing
      throw new Error(`Invalid log level: ${String(level)}`);
  }
}
/**
 * Calculates elapsed time from start and formats it with appropriate units.
 *
 * @param startTime - The start timestamp in milliseconds
 * @param endTime - The end timestamp in milliseconds (defaults to current time)
 * @returns Formatted duration string
 */
function formatDuration(startTime: number, endTime: number = Date.now()): string {
  const durationMs = endTime - startTime;

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Logs the start of the CDS extractor session with session information.
 *
 * @param sourceRoot - The source root directory being processed
 */
export function logExtractorStart(sourceRoot: string): void {
  cdsExtractorLog('info', `=== CDS EXTRACTOR START [${sessionId}] ===`);
  cdsExtractorLog('info', `Source Root: ${sourceRoot}`);
}

/**
 * Logs the end of the CDS extractor session with final performance summary.
 *
 * @param success - Whether the extraction completed successfully
 * @param additionalSummary - Optional additional summary information
 */
export function logExtractorStop(success: boolean = true, additionalSummary?: string): void {
  const endTime = Date.now();
  const totalDuration = formatDuration(extractorStartTime, endTime);
  const status = success ? 'SUCCESS' : 'FAILURE';

  if (additionalSummary) {
    cdsExtractorLog('info', additionalSummary);
  }

  cdsExtractorLog('info', `=== CDS EXTRACTOR END [${sessionId}] - ${status} ===`);
  cdsExtractorLog('info', `Total Duration: ${totalDuration}`);
}

/**
 * Logs a performance milestone with timing information.
 *
 * @param milestone - Description of the milestone reached
 * @param additionalInfo - Optional additional information to include
 */
export function logPerformanceMilestone(milestone: string, additionalInfo?: string): void {
  const currentTime = Date.now();
  const overallDuration = formatDuration(extractorStartTime, currentTime);
  const info = additionalInfo ? ` - ${additionalInfo}` : '';
  cdsExtractorLog('info', `MILESTONE: ${milestone} (after ${overallDuration})${info}`);
}

/**
 * Starts tracking performance for a named operation.
 *
 * @param operationName - Name of the operation to track
 */
export function logPerformanceTrackingStart(operationName: string): void {
  performanceTracking.set(operationName, Date.now());
  cdsExtractorLog('debug', `Started: ${operationName}`);
}

/**
 * Ends tracking performance for a named operation and logs the duration.
 *
 * @param operationName - Name of the operation to stop tracking
 */
export function logPerformanceTrackingStop(operationName: string): void {
  const startTime = performanceTracking.get(operationName);
  if (startTime) {
    const duration = formatDuration(startTime);
    performanceTracking.delete(operationName);
    cdsExtractorLog('info', `Completed: ${operationName} (took ${duration})`);
  } else {
    cdsExtractorLog('warn', `No start time found for operation: ${operationName}`);
  }
}

/**
 * Sets the source root directory for logging context.
 * This should typically be called once at the start of the CDS extractor.
 *
 * @param sourceRoot - The absolute path to the source root directory
 */
export function setSourceRootDirectory(sourceRoot: string): void {
  sourceRootDirectory = sourceRoot;
}
