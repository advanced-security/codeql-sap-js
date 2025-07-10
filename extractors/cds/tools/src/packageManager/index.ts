// Export the new robust installer functionality (preferred)
export { installDependencies } from './installer';
export type { CdsDependencyCombination } from './types';

// Export version resolver functionality
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
