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
  /** Whether to use project-level compilation */
  useProjectLevelCompilation: boolean;
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
  /** Expected output file(s) */
  expectedOutputFiles: string[];
  /** Project directory this task belongs to */
  projectDir: string;
  /** All compilation attempts for this task */
  attempts: CompilationAttempt[];
  /** Whether this task uses project-level compilation */
  useProjectLevelCompilation: boolean;
  /** Tasks that this task depends on */
  dependencies: string[];
  /** Error summary if all attempts failed */
  errorSummary?: string;
}
