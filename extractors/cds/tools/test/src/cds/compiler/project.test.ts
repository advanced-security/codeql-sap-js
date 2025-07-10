// filepath: test/src/cds/compiler/projectMapping.test.ts
import { findProjectForCdsFile } from '../../../../src/cds/compiler';

describe('projectMapping', () => {
  describe('findProjectForCdsFile', () => {
    it('should find project when file is in project cdsFiles list', () => {
      // Setup
      const sourceRoot = '/source/root';
      const cdsFilePath = '/source/root/project1/file.cds';
      const projectMap = new Map([
        ['project1', { cdsFiles: ['project1/file.cds'] }],
        ['project2', { cdsFiles: ['project2/file1.cds', 'project2/file2.cds'] }],
      ]);

      // Execute
      const result = findProjectForCdsFile(cdsFilePath, sourceRoot, projectMap);

      // Verify
      expect(result).toBe('project1');
    });

    it('should find project based on path prefix match', () => {
      // Setup
      const sourceRoot = '/source/root';
      const cdsFilePath = '/source/root/project2/subfolder/file.cds';
      const projectMap = new Map([
        ['project1', { cdsFiles: ['project1/file.cds'] }],
        ['project2', { cdsFiles: ['project2/file1.cds'] }],
      ]);

      // Execute
      const result = findProjectForCdsFile(cdsFilePath, sourceRoot, projectMap);

      // Verify
      expect(result).toBe('project2');
    });

    it('should return undefined when no project matches', () => {
      // Setup
      const sourceRoot = '/source/root';
      const cdsFilePath = '/source/root/unknown/file.cds';
      const projectMap = new Map([
        ['project1', { cdsFiles: ['project1/file.cds'] }],
        ['project2', { cdsFiles: ['project2/file1.cds'] }],
      ]);

      // Execute
      const result = findProjectForCdsFile(cdsFilePath, sourceRoot, projectMap);

      // Verify
      expect(result).toBeUndefined();
    });

    it('should handle file paths outside of sourceRoot', () => {
      // Setup
      const sourceRoot = '/source/root';
      const cdsFilePath = '/other/path/file.cds';
      // The file path outside sourceRoot becomes the relativeCdsFilePath
      // So we need to add that exact path to the cdsFiles list
      const projectMap = new Map([['project1', { cdsFiles: ['/other/path/file.cds'] }]]);

      // Execute
      const result = findProjectForCdsFile(cdsFilePath, sourceRoot, projectMap);

      // Verify
      expect(result).toBe('project1');
    });
  });
});
