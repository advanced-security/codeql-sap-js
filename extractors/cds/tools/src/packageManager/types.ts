/** Interface types for the CDS extractor `packageMangager` package. */

/**
 * Represents a unique combination of @sap/cds and @sap/cds-dk dependencies.
 */
export interface CdsDependencyCombination {
  cdsVersion: string;
  cdsDkVersion: string;
  hash: string;
  resolvedCdsVersion?: string;
  resolvedCdsDkVersion?: string;
  isFallback?: boolean;
  warning?: string;
}

/** Result of full dependency installation for a CAP/CDS project. */
export interface FullDependencyInstallationResult {
  /** Whether installation was successful */
  success: boolean;
  /** Path to the project directory where dependencies were installed */
  projectDir: string;
  /** Installation error message if failed */
  error?: string;
  /** Warnings during installation */
  warnings: string[];
  /** Duration of installation in milliseconds */
  durationMs: number;
  /** Whether a timeout occurred */
  timedOut: boolean;
}

/**
 * Represents a semantic version.
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  original: string;
}
