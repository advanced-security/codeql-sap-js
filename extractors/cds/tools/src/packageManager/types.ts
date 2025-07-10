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
