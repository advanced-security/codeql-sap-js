import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

import { CdsProject } from './types';

const PARSER_DEBUG_FILE = 'cds-extractor.parser.debug.txt';
const PARSER_DEBUG_SUBDIR = 'debug';

/**
 * Writes debug information about the CDS project dependency graph to a file
 *
 * @param projectMap - Map of project directories to CdsProject objects
 * @param sourceRootDir - Source root directory
 * @param scriptDir - The directory where the script is running
 * @returns True if successful, false otherwise
 */
export function writeParserDebugInfo(
  projectMap: Map<string, CdsProject>,
  sourceRootDir: string,
  scriptDir: string,
): boolean {
  try {
    // Early check if project map is empty
    if (!projectMap || projectMap.size === 0) {
      console.warn('Cannot write debug information: Empty project map or no CDS projects found.');
      return false;
    }

    // Create debug output
    const outputLines: string[] = [];

    // Header
    outputLines.push('CDS Parser Debug Information');
    outputLines.push('===========================');
    outputLines.push(`Source Root Directory: ${sourceRootDir}`);
    outputLines.push(`Generated: ${new Date().toISOString()}`);
    outputLines.push('');

    // Project summary
    outputLines.push(`Found ${projectMap.size} CDS project(s):`);
    Array.from(projectMap.keys()).forEach((dir, index) => {
      outputLines.push(`  ${index + 1}. ${dir}`);
    });
    outputLines.push('');

    // Detailed project information
    outputLines.push('Project Details:');
    outputLines.push('===============');

    projectMap.forEach((project, projectDir) => {
      outputLines.push(`\nProject: ${projectDir}`);

      // Display basic project info
      outputLines.push(`  CDS Files: ${project.cdsFiles.length}`);
      if (project.cdsFiles.length > 0) {
        outputLines.push('  Files:');
        project.cdsFiles.slice(0, 10).forEach(file => {
          outputLines.push(`    - ${file}`);
        });
        if (project.cdsFiles.length > 10) {
          outputLines.push(`    ... and ${project.cdsFiles.length - 10} more files`);
        }
      }

      // Display package.json info
      if (project.packageJson) {
        outputLines.push('  Package Info:');
        outputLines.push(`    Name: ${project.packageJson.name ?? 'undefined'}`);
        outputLines.push(
          `    CDS Version: ${
            project.packageJson.dependencies?.['@sap/cds'] ??
            project.packageJson.devDependencies?.['@sap/cds'] ??
            'not specified'
          }`,
        );
        outputLines.push(
          `    CDS-DK Version: ${
            project.packageJson.dependencies?.['@sap/cds-dk'] ??
            project.packageJson.devDependencies?.['@sap/cds-dk'] ??
            'not specified'
          }`,
        );
      } else {
        outputLines.push('  No package.json found');
      }

      if (project.dependencies && project.dependencies.length > 0) {
        outputLines.push(`  Dependencies: ${project.dependencies.length}`);
        project.dependencies.forEach(dep => {
          outputLines.push(`    - ${dep.projectDir}`);
        });
      } else {
        outputLines.push('  No dependencies');
      }
    });

    // Check if we have meaningful content to write
    const debugContent = outputLines.join('\n');
    if (!debugContent.trim()) {
      console.warn('No debug information to write. Empty project map or no CDS projects found.');
      return false;
    }

    const debugFilePath = join(scriptDir, PARSER_DEBUG_SUBDIR, PARSER_DEBUG_FILE);

    // Ensure the debug directory exists
    const debugDir = join(scriptDir, PARSER_DEBUG_SUBDIR);
    if (!existsSync(debugDir)) {
      mkdirSync(debugDir, { recursive: true });
    }

    // Intentionally add a newline at the end of the file to make it easier to
    // cat/read when debugging.
    writeFileSync(debugFilePath, `${debugContent}\n`, 'utf-8');

    console.log(`INFO: CDS extractor parser debug information written to: ${debugFilePath}`);
    return true;
  } catch (error: unknown) {
    console.error(`Error writing parser debug information: ${String(error)}`);
    return false;
  }
}
