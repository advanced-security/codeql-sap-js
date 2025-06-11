/**
 * Result of a CDS compilation
 */
export interface CdsCompilationResult {
  success: boolean;
  message?: string;
  outputPath?: string;
  /** Flag indicating if this file was compiled directly or as part of a project */
  compiledAsProject?: boolean;
}
