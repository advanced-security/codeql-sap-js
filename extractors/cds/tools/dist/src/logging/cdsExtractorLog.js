"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSourceRootDirectory = setSourceRootDirectory;
exports.startPerformanceTracking = startPerformanceTracking;
exports.endPerformanceTracking = endPerformanceTracking;
exports.logPerformanceMilestone = logPerformanceMilestone;
exports.logExtractorStart = logExtractorStart;
exports.logExtractorStop = logExtractorStop;
exports.logMemoryUsage = logMemoryUsage;
exports.logPerformanceCounter = logPerformanceCounter;
exports.cdsExtractorLog = cdsExtractorLog;
/**
 * Source root directory for logging context.
 */
let sourceRootDirectory;
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
const performanceTracking = new Map();
/**
 * Sets the source root directory for logging context.
 * This should typically be called once at the start of the CDS extractor.
 *
 * @param sourceRoot - The absolute path to the source root directory
 */
function setSourceRootDirectory(sourceRoot) {
    sourceRootDirectory = sourceRoot;
}
/**
 * Calculates elapsed time from start and formats it with appropriate units.
 *
 * @param startTime - The start timestamp in milliseconds
 * @param endTime - The end timestamp in milliseconds (defaults to current time)
 * @returns Formatted duration string
 */
function formatDuration(startTime, endTime = Date.now()) {
    const durationMs = endTime - startTime;
    if (durationMs < 1000) {
        return `${durationMs}ms`;
    }
    else if (durationMs < 60000) {
        return `${(durationMs / 1000).toFixed(2)}s`;
    }
    else {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = ((durationMs % 60000) / 1000).toFixed(2);
        return `${minutes}m ${seconds}s`;
    }
}
/**
 * Starts tracking performance for a named operation.
 *
 * @param operationName - Name of the operation to track
 */
function startPerformanceTracking(operationName) {
    performanceTracking.set(operationName, Date.now());
    cdsExtractorLog('debug', `Started: ${operationName}`);
}
/**
 * Ends tracking performance for a named operation and logs the duration.
 *
 * @param operationName - Name of the operation to stop tracking
 */
function endPerformanceTracking(operationName) {
    const startTime = performanceTracking.get(operationName);
    if (startTime) {
        const duration = formatDuration(startTime);
        performanceTracking.delete(operationName);
        cdsExtractorLog('info', `Completed: ${operationName} (took ${duration})`);
    }
    else {
        cdsExtractorLog('warn', `No start time found for operation: ${operationName}`);
    }
}
/**
 * Logs a performance milestone with timing information.
 *
 * @param milestone - Description of the milestone reached
 * @param additionalInfo - Optional additional information to include
 */
function logPerformanceMilestone(milestone, additionalInfo) {
    const currentTime = Date.now();
    const overallDuration = formatDuration(extractorStartTime, currentTime);
    const info = additionalInfo ? ` - ${additionalInfo}` : '';
    cdsExtractorLog('info', `MILESTONE: ${milestone} (after ${overallDuration})${info}`);
}
/**
 * Logs the start of the CDS extractor session with session information.
 *
 * @param sourceRoot - The source root directory being processed
 */
function logExtractorStart(sourceRoot) {
    cdsExtractorLog('info', `=== CDS EXTRACTOR START [${sessionId}] ===`);
    cdsExtractorLog('info', `Source Root: ${sourceRoot}`);
}
/**
 * Logs the end of the CDS extractor session with final performance summary.
 *
 * @param success - Whether the extraction completed successfully
 * @param additionalSummary - Optional additional summary information
 */
function logExtractorStop(success = true, additionalSummary) {
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
 * Logs current memory usage for performance debugging.
 *
 * @param context - Context description for the memory check
 */
function logMemoryUsage(context) {
    if (typeof process !== 'undefined' && process.memoryUsage) {
        try {
            const memUsage = process.memoryUsage();
            const formatBytes = (bytes) => {
                if (bytes === 0)
                    return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
            };
            cdsExtractorLog('debug', `Memory usage - ${context}: RSS=${formatBytes(memUsage.rss)}, Heap Used=${formatBytes(memUsage.heapUsed)}, Heap Total=${formatBytes(memUsage.heapTotal)}, External=${formatBytes(memUsage.external)}`);
        }
        catch (_a) {
            // Silently ignore errors when memory usage is not available
            // This ensures the function never throws and doesn't interrupt the extraction process
        }
    }
}
/**
 * Logs a performance counter with current count and rate information.
 *
 * @param counterName - Name of the counter
 * @param currentCount - Current count value
 * @param startTime - Start time for rate calculation (optional)
 * @param totalExpected - Total expected count for progress percentage (optional)
 */
function logPerformanceCounter(counterName, currentCount, startTime, totalExpected) {
    let message = `${counterName}: ${currentCount}`;
    if (totalExpected && totalExpected > 0) {
        const percentage = ((currentCount / totalExpected) * 100).toFixed(1);
        message += ` / ${totalExpected} (${percentage}%)`;
    }
    if (startTime) {
        const elapsed = Date.now() - startTime;
        const rate = elapsed > 0 ? ((currentCount / elapsed) * 1000).toFixed(1) : '0';
        message += ` - Rate: ${rate}/sec`;
    }
    cdsExtractorLog('debug', message);
}
/**
 * Unified logging function for the CDS extractor. Provides consistent
 * log formatting with level prefixes, elapsed time, and session IDs.
 *
 * @param level - The log level ('debug', 'info', 'warn', 'error')
 * @param message - The primary message or data to log
 * @param optionalParams - Additional parameters to log (same as console.log)
 */
function cdsExtractorLog(level, message, ...optionalParams) {
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
            }
            else {
                console.log(levelPrefix, message, ...optionalParams);
            }
            break;
        case 'warn':
            if (typeof message === 'string') {
                console.warn(levelPrefix + message, ...optionalParams);
            }
            else {
                console.warn(levelPrefix, message, ...optionalParams);
            }
            break;
        case 'error':
            if (typeof message === 'string') {
                console.error(levelPrefix + message, ...optionalParams);
            }
            else {
                console.error(levelPrefix, message, ...optionalParams);
            }
            break;
        default:
            // This should never happen due to TypeScript typing
            throw new Error(`Invalid log level: ${String(level)}`);
    }
}
//# sourceMappingURL=cdsExtractorLog.js.map