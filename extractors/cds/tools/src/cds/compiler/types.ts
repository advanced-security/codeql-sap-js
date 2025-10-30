/** Types for the `src/cds/compiler` package. */

/** Result of a CDS compilation attempt. */
export interface CdsCompilationResult {
  success: boolean;
  message?: string;
  outputPath?: string;
  /** Flag indicating if this file was compiled directly or as part of a project */
  compiledAsProject?: boolean;
  /** Timestamp when compilation was attempted */
  timestamp?: Date;
  /** Duration of compilation in milliseconds */
  durationMs?: number;
  /** Command used for compilation */
  commandUsed?: string;
  /** Cache directory used during compilation */
  cacheDir?: string;
}

/** Compilation attempt tracking for retry logic. */
export interface CompilationAttempt {
  /** Unique identifier for this attempt */
  id: string;
  /** The CDS command used */
  cdsCommand: string;
  /** Cache directory used, if any */
  cacheDir?: string;
  /** Timestamp when attempt was made */
  timestamp: Date;
  /** Result of the compilation attempt */
  result: CdsCompilationResult;
  /** Error details if compilation failed */
  error?: {
    code?: string | number;
    message: string;
    stack?: string;
  };
}

/** Compilation configuration for managing compilation commands and retries. */
export interface CompilationConfig {
  /** CDS command to use */
  cdsCommand: string;
  /** Cache directory */
  cacheDir?: string;
  /** Version compatibility information */
  versionCompatibility: {
    isCompatible: boolean;
    errorMessage?: string;
    cdsVersion?: string;
    expectedCdsVersion?: string;
  };
  /** Maximum number of retry attempts allowed */
  maxRetryAttempts: number;
  /** Command analysis details for debugging */
  commandAnalysis?: Record<string, unknown>;
}

/** Compilation status for tracking compilation attempts and results. */
export type CompilationStatus =
  | 'pending' // File/project is scheduled for compilation
  | 'in_progress' // Compilation is currently running
  | 'success' // Compilation completed successfully
  | 'failed' // Compilation failed
  | 'skipped'; // Compilation was skipped (e.g., already compiled)

/** Represents an expected CDS compilation task for a file or project. */
export interface CompilationTask {
  /** Unique identifier for this task */
  id: string;
  /** Type of compilation task */
  type: 'file' | 'project';
  /** Current status of the task */
  status: CompilationStatus;
  /** Source file(s) involved in this task */
  sourceFiles: string[];
  /** Expected output file */
  expectedOutputFile: string;
  /** Project directory this task belongs to */
  projectDir: string;
  /** All compilation attempts for this task */
  attempts: CompilationAttempt[];
  /** Tasks that this task depends on */
  dependencies: string[];
  /** Error summary if all attempts failed */
  errorSummary?: string;

  /** Primary CDS command for initial compilation attempts */
  primaryCommand: ValidatedCdsCommand;
  /** Retry CDS command for retry attempts (typically npx-based for project dependency access) */
  retryCommand: ValidatedCdsCommand;

  /** Retry tracking information */
  retryInfo?: {
    /** Whether this task has been retried */
    hasBeenRetried: boolean;
    /** Retry attempt details */
    retryAttempt?: CompilationAttempt;
    /** Reason for retry */
    retryReason?: string;
    /** Full dependency installation status */
    fullDependenciesInstalled?: boolean;
    /** Timestamp when retry was initiated */
    retryTimestamp?: Date;
  };
}

/** Result of updating dependency graph status. */
export interface ResultDependencyStatusUpdate {
  tasksValidated: number;
  successfulTasks: number;
  failedTasks: number;
  tasksSuccessfullyRetried: number;
}

/** Result of validating a single output file. */
export interface ResultOutputFileValidation {
  /** Whether the file is valid */
  isValid: boolean;
  /** Path to the validated file */
  filePath: string;
  /** Validation error message if validation failed */
  error?: string;
  /** Whether the file exists */
  exists: boolean;
  /** Whether the file contains valid JSON (if it exists) */
  hasValidJson?: boolean;
}

/** Result of retry orchestration for the entire dependency graph. */
export interface ResultRetryCompilationOrchestration {
  /** Overall success status */
  success: boolean;
  /** Projects that had retry attempts */
  projectsWithRetries: string[];
  /** Total number of tasks that required retry */
  totalTasksRequiringRetry: number;
  /** Total number of successful retry attempts */
  totalSuccessfulRetries: number;
  /** Total number of failed retry attempts */
  totalFailedRetries: number;
  /** Projects where full dependency installation succeeded */
  projectsWithSuccessfulDependencyInstallation: string[];
  /** Projects where full dependency installation failed */
  projectsWithFailedDependencyInstallation: string[];
  /** Duration of retry phase in milliseconds */
  retryDurationMs: number;
  /** Duration of dependency installation in milliseconds */
  dependencyInstallationDurationMs: number;
  /** Duration of retry compilation in milliseconds */
  retryCompilationDurationMs: number;
}

/** Result of executing retry compilation for specific tasks. */
export interface ResultRetryCompilationTask {
  /** Project directory */
  projectDir: string;
  /** Tasks that were retried */
  retriedTasks: CompilationTask[];
  /** Number of successful retry attempts */
  successfulRetries: number;
  /** Number of failed retry attempts */
  failedRetries: number;
  /** Whether full dependencies were available for retry */
  fullDependenciesAvailable: boolean;
  /** Retry execution duration in milliseconds */
  executionDurationMs: number;
  /** Error messages from failed retries */
  retryErrors: string[];
}

/** Result of validating all outputs for a compilation task. */
export interface ResultTaskValidation {
  /** Whether all outputs are valid */
  isValid: boolean;
  /** The task that was validated */
  task: CompilationTask;
  /** Validation results for each expected output file */
  fileResults: ResultOutputFileValidation[];
  /** Number of valid output files */
  validFileCount: number;
  /** Number of expected output files */
  expectedFileCount: number;
}

/** Validated CDS command descriptor. */
export interface ValidatedCdsCommand {
  /** The executable name or path */
  executable: string;
  /** Command arguments */
  args: string[];
  /** Original command string for caching */
  originalCommand: string;
}
