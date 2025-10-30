// Export the new robust installer functionality (preferred)
export { cacheInstallDependencies } from './cacheInstaller';
export { needsFullDependencyInstallation, projectInstallDependencies } from './projectInstaller';
export type { CdsDependencyCombination } from './types';
export {
  checkVersionCompatibility,
  compareVersions,
  findBestAvailableVersion,
  getAvailableVersions,
  getCacheStatistics,
  parseSemanticVersion,
  resolveCdsVersions,
  satisfiesRange,
} from './versionResolver';
