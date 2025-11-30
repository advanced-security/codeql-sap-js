/** Common constants used throughout the CDS extractor. */

/**
 * Common, expected name of the JSON file created by CDS compilation
 * tasks performed by, or on behalf of, the CDS extractor.
 */
export const modelCdsJsonFile = 'model.cds.json';

/**
 * Common, expected name of the marker file created to meet the JavaScript
 * extractor's requirement for at least one .js file to be present under
 * the source root. This file is auto-created in the source root directory
 * prior to invoking the JavaScript extractor, and removed afterwards, to
 * enable extraction of the .cds.json files by the JavaScript extractor.
 */
export const cdsExtractorMarkerFileName = 'cds-extractor-marker.js';

/**
 * Expected content of the {@link cdsExtractorMarkerFileName} file.
 */
export const cdsExtractorMarkerFileContent =
  '"Placeholder content created by the CDS extractor. This file can be safely deleted.";';
