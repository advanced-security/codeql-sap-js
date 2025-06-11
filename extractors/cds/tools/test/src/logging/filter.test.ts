import { filterPathsInMessage } from '../../../src/logging/filter';

describe('filterPathsInMessage', () => {
  describe('special message handling', () => {
    it('should allow source root directory logging message to pass through unchanged', () => {
      const message = 'CDS extractor source root directory: /my/source-root';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('CDS extractor source root directory: /my/source-root');
    });
  });

  describe('path filtering', () => {
    it('should filter absolute paths to relative paths within source root', () => {
      const message = 'Processing file at /my/source-root/project1/service.cds';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('Processing file at project1/service.cds');
    });

    it('should filter absolute paths with trailing slash on source root', () => {
      const message = 'Processing file at /my/source-root/project1/service.cds';
      const result = filterPathsInMessage('/my/source-root/', message);

      expect(result).toBe('Processing file at project1/service.cds');
    });

    it('should handle multiple paths in the same message', () => {
      const message = 'Copying from /my/source-root/src/file.cds to /my/source-root/dist/file.cds';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('Copying from src/file.cds to dist/file.cds');
    });

    it('should handle paths that do not start with source root directory', () => {
      const message = 'External file at /other/path/file.cds';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('External file at /other/path/file.cds');
    });

    it('should handle relative paths without modification', () => {
      const message = 'Processing relative file at project1/service.cds';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('Processing relative file at project1/service.cds');
    });

    it('should handle messages without paths', () => {
      const message = 'Starting compilation process';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('Starting compilation process');
    });

    it('should filter paths in complex messages', () => {
      const message =
        'Potential problem with CDS file at expected path /my/source-root/project1/service.cds';
      const result = filterPathsInMessage('/my/source-root', message);

      expect(result).toBe('Potential problem with CDS file at expected path project1/service.cds');
    });
  });

  describe('edge cases', () => {
    it('should handle empty source root directory', () => {
      const message = 'Test message with /some/path';
      const result = filterPathsInMessage('', message);

      expect(result).toBe('Test message with /some/path');
    });

    it('should handle source root directory with special regex characters', () => {
      const message = 'Processing file at /my/[source-root]/project1/service.cds';
      const result = filterPathsInMessage('/my/[source-root]', message);

      expect(result).toBe('Processing file at project1/service.cds');
    });
  });
});
