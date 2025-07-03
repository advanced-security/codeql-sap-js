/** Context for CDS access control. */
export interface CdsAccessControl {
  /** Source file where the access control is defined. */
  sourceFile: string;

  /** Service or entity being restricted. */
  target: string;

  /** Type of restriction (e.g. 'requires', 'grant'). */
  type: string;

  /** Authorization value. */
  value: unknown;
}

/** Represents a CDS annotation. */
export interface CdsAnnotation {
  /** Name of the annotation. */
  name: string;

  /** Source file where the annotation is defined. */
  sourceFile: string;

  /** Value of the annotation. */
  value: unknown;
}

/** Represents a CDS entity definition. */
export interface CdsEntity {
  /** Annotations attached to the entity. */
  annotations: CdsAnnotation[];

  /** Parent entity or aspect if extended. */
  extends?: string;

  /** Full qualified name including namespace. */
  fqn: string;

  /** Name of the entity. */
  name: string;

  /** Properties of the entity. */
  properties: CdsProperty[];

  /** Source file where the entity is defined. */
  sourceFile: string;
}

/** Represents an entity exposed in a CDS service. */
export interface CdsExposedEntity {
  /** Annotations attached to the exposed entity. */
  annotations: CdsAnnotation[];

  /** Whether this is a projection. */
  isProjection: boolean;

  /** Name of the exposed entity in the service. */
  name: string;

  /** Source entity that is being exposed. */
  sourceEntity: string;
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

/** Results of parsing CDS content. */
export interface CdsParseResult {
  /** List of access controls found. */
  accessControls: CdsAccessControl[];

  /** List of context blocks. */
  contexts: {
    entities: CdsEntity[];
    name: string;
    services: CdsService[];
  }[];

  /** List of entities found. */
  entities: CdsEntity[];

  /** Errors encountered during parsing. */
  errors: string[];

  /** List of imports found. */
  imports: CdsImport[];

  /** Namespace declared in the file. */
  namespace?: string;

  /** List of services found. */
  services: CdsService[];
}

/** Represents a property of a CDS entity. */
export interface CdsProperty {
  /** Annotations attached to the property. */
  annotations: CdsAnnotation[];

  /** Cardinality if this is an association. */
  cardinality?: 'one' | 'many';

  /** Whether this property is an association. */
  isAssociation: boolean;

  /** Whether this is a composition. */
  isComposition: boolean;

  /** Whether this property is a key. */
  isKey: boolean;

  /** Name of the property. */
  name: string;

  /** Target entity if this is an association. */
  target?: string;

  /** Data type of the property. */
  type: string;
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

/** File cache to avoid reading the same file multiple times */
export interface FileCache {
  /** Map of file paths to their content */
  fileContents: Map<string, string>;

  /** Map of file paths to their parsed package.json content */
  packageJsonCache: Map<string, PackageJson>;

  /** Map of file paths to their parsed CDS content */
  cdsParseCache: Map<string, CdsParseResult>;
}

/** Compilation configuration for a CDS project */
export interface CdsCompilationConfig {
  /** The CDS command that will be used for compilation */
  cdsCommand: string;

  /** The cache directory to use for dependencies, if any */
  cacheDir?: string;

  /** Whether to use project-level compilation */
  useProjectLevelCompilation: boolean;

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
  /** Script directory where extractor is running */
  scriptDir?: string;
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
  /** Tasks that required retries */
  retriedCompilations: number;
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

/**
 * Enhanced CDS project with comprehensive tracking and debug information
 */
export interface EnhancedCdsProject extends CdsProject {
  /** Unique identifier for this project */
  id: string;

  /** Enhanced compilation configuration with retry support */
  enhancedCompilationConfig?: import('../compiler/types.js').EnhancedCompilationConfig;

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
}

/** Represents a CDS project with its directory and associated files. */
export interface CdsProject {
  /** All CDS files within this project. */
  cdsFiles: string[];

  /** CDS files that should be compiled to JSON (typically root files not imported by others). */
  cdsFilesToCompile: string[];

  /** Expected JSON output files that will be generated (relative to source root). */
  expectedOutputFiles: string[];

  /** Dependencies on other CDS projects. */
  dependencies?: CdsProject[];

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
 * Comprehensive CDS dependency graph that supports all extractor phases
 */
export interface CdsDependencyGraph {
  /** Unique identifier for this dependency graph */
  id: string;

  /** Source root directory */
  sourceRootDir: string;

  /** Script directory where extractor is running */
  scriptDir: string;

  /** Enhanced projects with comprehensive tracking */
  projects: Map<string, EnhancedCdsProject>;

  /** Global cache directories available */
  globalCacheDirectories: Map<string, string>;

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

  /** File cache for avoiding repeated reads */
  fileCache: FileCache;

  /** Configuration and settings */
  config: {
    /** Maximum retry attempts for compilation */
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
}

/** Represents a CDS service definition. */
export interface CdsService {
  /** Annotations attached to the service. */
  annotations: CdsAnnotation[];

  /** Exposed entities in this service. */
  entities: CdsExposedEntity[];

  /** Full qualified name including namespace. */
  fqn: string;

  /** Name of the service. */
  name: string;

  /** Source file where the service is defined. */
  sourceFile: string;
}
