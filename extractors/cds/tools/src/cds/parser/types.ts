/** Types for CDS parsing. */

/** Result of determining CDS files to compile and their expected outputs */
export interface CdsFilesToCompile {
  /** Compilation targets (directories or files relative to project base) */
  compilationTargets: string[];

  /** Always "model.cds.json" relative to project base directory */
  expectedOutputFile: string;
}

/** Represents an import reference in a CDS file. */
export interface CdsImport {
  /** Whether the import is from a module (node_modules). */
  isModule: boolean;

  /** Whether the import is relative. */
  isRelative: boolean;

  /** Path to the imported resource. */
  path: string;

  /** Resolved absolute path of the imported resource (when applicable). */
  resolvedPath?: string;

  /** Original import statement. */
  statement: string;
}

/** Represents a simplified package.json file structure with only the fields we need */
export interface PackageJson {
  /** The name of the package */
  name?: string;

  /** The version of the package */
  version?: string;

  /** Production dependencies */
  dependencies?: Record<string, string>;

  /** Development dependencies */
  devDependencies?: Record<string, string>;

  /** All other fields in package.json */
  [key: string]: unknown;
}

/** Compilation configuration for a CDS project */
export interface CdsCompilationConfig {
  /** The CDS command that will be used for compilation */
  cdsCommand: string;

  /** The cache directory to use for dependencies, if any */
  cacheDir?: string;

  /** Version compatibility status */
  versionCompatibility: {
    /** Whether the CDS versions are compatible */
    isCompatible: boolean;
    /** Error message if incompatible */
    errorMessage?: string;
    /** Detected CDS version */
    cdsVersion?: string;
    /** Project's expected CDS version */
    expectedCdsVersion?: string;
  };
}

/**
 * Debug information for tracking extractor execution
 */
export interface ExtractorDebugInfo {
  /** Run mode of the extractor */
  runMode: string;
  /** Source root directory */
  sourceRootDir: string;
  /** Timestamp when extraction started */
  startTime: Date;
  /** Timestamp when extraction completed */
  endTime?: Date;
  /** Total duration in milliseconds */
  durationMs?: number;
  /** Environment information */
  environment: {
    nodeVersion: string;
    platform: string;
    cwd: string;
    argv: string[];
  };
}

/**
 * Parser debug information
 */
export interface ParserDebugInfo {
  /** Number of projects detected */
  projectsDetected: number;
  /** Number of CDS files found */
  cdsFilesFound: number;
  /** Dependency resolution success */
  dependencyResolutionSuccess: boolean;
  /** Errors encountered during parsing */
  parsingErrors: string[];
  /** Warnings during parsing */
  parsingWarnings: string[];
  /** Debug output file path if generated */
  debugOutputPath?: string;
}

/**
 * Compiler debug information
 */
export interface CompilerDebugInfo {
  /** Available CDS commands discovered */
  availableCommands: Array<{
    command: string;
    version?: string;
    strategy: string;
    tested: boolean;
    error?: string;
  }>;
  /** Selected primary command */
  selectedCommand: string;
  /** Cache directories discovered */
  cacheDirectories: string[];
  /** Command cache initialization success */
  cacheInitialized: boolean;
}

/**
 * Status summary for the entire extraction process
 */
export interface ExtractionStatusSummary {
  /** Overall success status */
  overallSuccess: boolean;
  /** Total projects processed */
  totalProjects: number;
  /** Total CDS files processed */
  totalCdsFiles: number;
  /** Total compilation tasks */
  totalCompilationTasks: number;
  /** Successful compilation tasks */
  successfulCompilations: number;
  /** Failed compilation tasks */
  failedCompilations: number;
  /** Skipped compilation tasks */
  skippedCompilations: number;
  /** JSON files generated */
  jsonFilesGenerated: number;
  /** Critical errors that stopped extraction */
  criticalErrors: string[];
  /** Non-critical warnings */
  warnings: string[];
  /** Performance metrics */
  performance: {
    totalDurationMs: number;
    parsingDurationMs: number;
    compilationDurationMs: number;
    extractionDurationMs: number;
  };
}

/** Represents a basic CDS project with its directory and associated files. */
export interface BasicCdsProject {
  /** All CDS files within this project. */
  cdsFiles: string[];

  /** Compilation targets (directories or files relative to project base). */
  compilationTargets: string[];

  /** Always "model.cds.json" relative to project base directory. */
  expectedOutputFile: string;

  /** Dependencies on other CDS projects. */
  dependencies?: BasicCdsProject[];

  /** Map of file paths (relative to source root) to their import information. */
  imports?: Map<string, CdsImport[]>;

  /** The package.json content if available. */
  packageJson?: PackageJson;

  /** The directory path of the project. */
  projectDir: string;

  /** Compilation configuration determined during project detection */
  compilationConfig?: CdsCompilationConfig;
}

/**
 * CDS project with comprehensive tracking and debug information
 */
export interface CdsProject extends BasicCdsProject {
  /** Unique identifier for this project */
  id: string;

  /** Compilation configuration */
  enhancedCompilationConfig?: import('../compiler/types.js').CompilationConfig;

  /** Compilation tasks for this project */
  compilationTasks: import('../compiler/types.js').CompilationTask[];

  /** Parser debug information for this project */
  parserDebugInfo?: {
    /** Dependencies successfully resolved */
    dependenciesResolved: string[];
    /** Import resolution errors */
    importErrors: string[];
    /** Files that couldn't be parsed */
    parseErrors: Map<string, string>;
  };

  /** Current status of the project */
  status:
    | 'discovered'
    | 'dependencies_resolved'
    | 'compilation_planned'
    | 'compiling'
    | 'completed'
    | 'failed';

  /** Timestamps for tracking project processing */
  timestamps: {
    discovered: Date;
    dependenciesResolved?: Date;
    compilationStarted?: Date;
    compilationCompleted?: Date;
  };

  /** Retry status for this project */
  retryStatus?: {
    /** Whether full dependencies have been installed */
    fullDependenciesInstalled: boolean;
    /** Number of tasks that require retry */
    tasksRequiringRetry: number;
    /** Number of tasks that have been retried */
    tasksRetried: number;
    /** Installation errors, if any */
    installationErrors?: string[];
  };
}

/**
 * Comprehensive CDS dependency graph that supports all extractor phases
 */
export interface CdsDependencyGraph {
  /** Unique identifier for this dependency graph */
  id: string;

  /** Source root directory */
  sourceRootDir: string;

  /** CDS projects with comprehensive tracking */
  projects: Map<string, CdsProject>;

  /** Debug information for the entire extraction process */
  debugInfo: {
    extractor: ExtractorDebugInfo;
    parser: ParserDebugInfo;
    compiler: CompilerDebugInfo;
  };

  /** Current phase of processing */
  currentPhase:
    | 'initializing'
    | 'parsing'
    | 'dependency_resolution'
    | 'compilation_planning'
    | 'compiling'
    | 'extracting'
    | 'completed'
    | 'failed';

  /** Status summary updated as processing progresses */
  statusSummary: ExtractionStatusSummary;

  /** Configuration and settings */
  config: {
    /** Maximum retry attempts for task re-execution */
    maxRetryAttempts: number;
    /** Whether to enable detailed logging */
    enableDetailedLogging: boolean;
    /** Whether to generate debug output files */
    generateDebugOutput: boolean;
    /** Timeout for individual compilation tasks (ms) */
    compilationTimeoutMs: number;
  };

  /** Error tracking and reporting */
  errors: {
    /** Critical errors that stop processing */
    critical: Array<{
      phase: string;
      message: string;
      timestamp: Date;
      stack?: string;
    }>;
    /** Non-critical warnings */
    warnings: Array<{
      phase: string;
      message: string;
      timestamp: Date;
      context?: string;
    }>;
  };

  /** Retry-specific status tracking */
  retryStatus: {
    /** Total tasks requiring retry */
    totalTasksRequiringRetry: number;
    /** Total tasks successfully retried */
    totalTasksSuccessfullyRetried: number;
    /** Total retry attempts made */
    totalRetryAttempts: number;
    /** Projects requiring full dependency installation */
    projectsRequiringFullDependencies: Set<string>;
    /** Projects with successful full dependency installation */
    projectsWithFullDependencies: Set<string>;
  };
}
