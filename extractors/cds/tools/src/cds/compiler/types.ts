/** Types for the `src/cds/compiler` package. */

/**
 * Alternative CDS command configuration for retry scenarios
 */
export interface AlternativeCdsCommand {
  /** The command string */
  command: string;
  /** Cache directory to use with this command */
  cacheDir?: string;
  /** Strategy identifier (e.g., 'global-cds', 'npx-cds-dk') */
  strategy: string;
  /** Version information if available */
  version?: string;
  /** Priority for trying this command (higher = try first) */
  priority: number;
  /** Whether this command has been tested successfully */
  tested: boolean;
}

/**
 * Result of a CDS compilation attempt
 */
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

/**
 * Compilation attempt tracking for retry logic
 */
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

/**
 * Compilation status for tracking compilation attempts and results
 */
export type CompilationStatus =
  | 'pending' // File/project is scheduled for compilation
  | 'in_progress' // Compilation is currently running
  | 'success' // Compilation completed successfully
  | 'failed' // Compilation failed
  | 'skipped' // Compilation was skipped (e.g., already compiled)
  | 'retry'; // Marked for retry with different configuration

/**
 * Compilation task representing a unit of work (file or project-level compilation)
 */
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
  /** Priority for task execution (higher = execute first) */
  priority: number;
  /** Tasks that this task depends on */
  dependencies: string[];
  /** Error summary if all attempts failed */
  errorSummary?: string;
}

/**
 * Compilation configuration with retry alternatives
 */
export interface EnhancedCompilationConfig {
  /** Primary CDS command to use */
  primaryCdsCommand: string;
  /** Primary cache directory */
  primaryCacheDir?: string;
  /** Whether to use project-level compilation */
  useProjectLevelCompilation: boolean;
  /** Alternative commands to try if primary fails */
  alternativeCommands: AlternativeCdsCommand[];
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
