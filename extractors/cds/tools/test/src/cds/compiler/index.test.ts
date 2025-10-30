/** Tests for the compiler module index exports */

// Import the actual modules to verify exports are correct
import { determineCdsCommand } from '../../../../src/cds/compiler/command';
import { compileCdsToJson } from '../../../../src/cds/compiler/compile';
import { orchestrateCompilation } from '../../../../src/cds/compiler/graph';
import * as compilerIndex from '../../../../src/cds/compiler/index';
import { findProjectForCdsFile } from '../../../../src/cds/compiler/project';
import { orchestrateRetryAttempts } from '../../../../src/cds/compiler/retry';
import {
  identifyTasksRequiringRetry,
  validateOutputFile,
  validateTaskOutputs,
} from '../../../../src/cds/compiler/validator';
import { getCdsVersion } from '../../../../src/cds/compiler/version';

describe('compiler/index.ts', () => {
  describe('module exports', () => {
    it('should export determineCdsCommand function', () => {
      expect(compilerIndex.determineCdsCommand).toBeDefined();
      expect(typeof compilerIndex.determineCdsCommand).toBe('function');
      expect(compilerIndex.determineCdsCommand).toBe(determineCdsCommand);
    });

    it('should export compileCdsToJson function', () => {
      expect(compilerIndex.compileCdsToJson).toBeDefined();
      expect(typeof compilerIndex.compileCdsToJson).toBe('function');
      expect(compilerIndex.compileCdsToJson).toBe(compileCdsToJson);
    });

    it('should export orchestrateCompilation function', () => {
      expect(compilerIndex.orchestrateCompilation).toBeDefined();
      expect(typeof compilerIndex.orchestrateCompilation).toBe('function');
      expect(compilerIndex.orchestrateCompilation).toBe(orchestrateCompilation);
    });

    it('should export findProjectForCdsFile function', () => {
      expect(compilerIndex.findProjectForCdsFile).toBeDefined();
      expect(typeof compilerIndex.findProjectForCdsFile).toBe('function');
      expect(compilerIndex.findProjectForCdsFile).toBe(findProjectForCdsFile);
    });

    it('should export orchestrateRetryAttempts function', () => {
      expect(compilerIndex.orchestrateRetryAttempts).toBeDefined();
      expect(typeof compilerIndex.orchestrateRetryAttempts).toBe('function');
      expect(compilerIndex.orchestrateRetryAttempts).toBe(orchestrateRetryAttempts);
    });

    it('should export identifyTasksRequiringRetry function', () => {
      expect(compilerIndex.identifyTasksRequiringRetry).toBeDefined();
      expect(typeof compilerIndex.identifyTasksRequiringRetry).toBe('function');
      expect(compilerIndex.identifyTasksRequiringRetry).toBe(identifyTasksRequiringRetry);
    });

    it('should export validateOutputFile function', () => {
      expect(compilerIndex.validateOutputFile).toBeDefined();
      expect(typeof compilerIndex.validateOutputFile).toBe('function');
      expect(compilerIndex.validateOutputFile).toBe(validateOutputFile);
    });

    it('should export validateTaskOutputs function', () => {
      expect(compilerIndex.validateTaskOutputs).toBeDefined();
      expect(typeof compilerIndex.validateTaskOutputs).toBe('function');
      expect(compilerIndex.validateTaskOutputs).toBe(validateTaskOutputs);
    });

    it('should export getCdsVersion function', () => {
      expect(compilerIndex.getCdsVersion).toBeDefined();
      expect(typeof compilerIndex.getCdsVersion).toBe('function');
      expect(compilerIndex.getCdsVersion).toBe(getCdsVersion);
    });
  });

  describe('module structure', () => {
    it('should export all expected functions and no unexpected exports', () => {
      const expectedExports = [
        'determineCdsCommand',
        'determineVersionAwareCdsCommands',
        'compileCdsToJson',
        'orchestrateCompilation',
        'findProjectForCdsFile',
        'orchestrateRetryAttempts',
        'identifyTasksRequiringRetry',
        'validateOutputFile',
        'validateTaskOutputs',
        'getCdsVersion',
      ];

      const actualExports = Object.keys(compilerIndex);

      // Check that all expected exports are present
      for (const expectedExport of expectedExports) {
        expect(actualExports).toContain(expectedExport);
      }

      // Check that no unexpected exports are present
      expect(actualExports).toHaveLength(expectedExports.length);

      // Ensure all exports are exactly the expected ones
      expect(actualExports.sort()).toEqual(expectedExports.sort());
    });

    it('should provide a complete API surface for CDS compilation', () => {
      // Verify that the exported functions cover the main compilation workflow:

      // 1. Version and command determination
      expect(compilerIndex.getCdsVersion).toBeDefined();
      expect(compilerIndex.determineCdsCommand).toBeDefined();

      // 2. Project discovery and file compilation
      expect(compilerIndex.findProjectForCdsFile).toBeDefined();
      expect(compilerIndex.compileCdsToJson).toBeDefined();

      // 3. Compilation orchestration
      expect(compilerIndex.orchestrateCompilation).toBeDefined();

      // 4. Retry mechanisms
      expect(compilerIndex.orchestrateRetryAttempts).toBeDefined();
      expect(compilerIndex.identifyTasksRequiringRetry).toBeDefined();

      // 5. Validation
      expect(compilerIndex.validateOutputFile).toBeDefined();
      expect(compilerIndex.validateTaskOutputs).toBeDefined();
    });

    it('should re-export functions without modification', () => {
      // Verify that the exports are direct re-exports, not wrapped functions

      // Check function names are preserved
      expect(compilerIndex.determineCdsCommand.name).toBe('determineCdsCommand');
      expect(compilerIndex.compileCdsToJson.name).toBe('compileCdsToJson');
      expect(compilerIndex.orchestrateCompilation.name).toBe('orchestrateCompilation');
      expect(compilerIndex.findProjectForCdsFile.name).toBe('findProjectForCdsFile');
      expect(compilerIndex.orchestrateRetryAttempts.name).toBe('orchestrateRetryAttempts');
      expect(compilerIndex.identifyTasksRequiringRetry.name).toBe('identifyTasksRequiringRetry');
      expect(compilerIndex.validateOutputFile.name).toBe('validateOutputFile');
      expect(compilerIndex.validateTaskOutputs.name).toBe('validateTaskOutputs');
      expect(compilerIndex.getCdsVersion.name).toBe('getCdsVersion');
    });
  });

  describe('import integration', () => {
    it('should allow importing individual functions directly from index', () => {
      // Test that selective imports work as expected
      const {
        determineCdsCommand: importedDetermineCdsCommand,
        compileCdsToJson: importedCompileCdsToJson,
        orchestrateCompilation: importedOrchestrateCompilation,
        findProjectForCdsFile: importedFindProjectForCdsFile,
        orchestrateRetryAttempts: importedOrchestrateRetryAttempts,
        identifyTasksRequiringRetry: importedIdentifyTasksRequiringRetry,
        validateOutputFile: importedValidateOutputFile,
        validateTaskOutputs: importedValidateTaskOutputs,
        getCdsVersion: importedGetCdsVersion,
      } = compilerIndex;

      expect(importedDetermineCdsCommand).toBe(determineCdsCommand);
      expect(importedCompileCdsToJson).toBe(compileCdsToJson);
      expect(importedOrchestrateCompilation).toBe(orchestrateCompilation);
      expect(importedFindProjectForCdsFile).toBe(findProjectForCdsFile);
      expect(importedOrchestrateRetryAttempts).toBe(orchestrateRetryAttempts);
      expect(importedIdentifyTasksRequiringRetry).toBe(identifyTasksRequiringRetry);
      expect(importedValidateOutputFile).toBe(validateOutputFile);
      expect(importedValidateTaskOutputs).toBe(validateTaskOutputs);
      expect(importedGetCdsVersion).toBe(getCdsVersion);
    });

    it('should allow importing all functions as a namespace', () => {
      // Test that namespace import works
      expect(typeof compilerIndex).toBe('object');
      expect(compilerIndex).not.toBeNull();

      // Verify that all exports are accessible via the namespace
      const exportedFunctions = Object.values(compilerIndex);
      exportedFunctions.forEach(func => {
        expect(typeof func).toBe('function');
      });
    });
  });
});
