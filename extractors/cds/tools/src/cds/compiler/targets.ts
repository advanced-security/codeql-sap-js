import { existsSync, readdirSync, writeFileSync } from 'fs';
import { basename, join, sep } from 'path';

import { fileSync } from 'tmp';

function getImportTargets(projectDir: string, targets: string[]): string[] {
  return [
    ...new Set(
      targets.flatMap(target => {
        if (target.endsWith('.cds')) {
          return [target];
        }

        // CDS directory arguments resolve an index or immediate model files;
        // importing the directory itself does not have the same behavior.
        const entry = ['.csn', '.cds', `${sep}index.csn`, `${sep}index.cds`, `${sep}csn.json`]
          .map(suffix => target + suffix)
          .find(file => existsSync(join(projectDir, file)));
        if (entry) {
          return [entry];
        }

        const files = readdirSync(join(projectDir, target));
        const csnFiles = files.filter(file => file.endsWith('.csn'));
        const csnNames = new Set(csnFiles.map(file => file.slice(0, -4)));
        return [
          ...csnFiles,
          ...files.filter(file => file.endsWith('.cds') && !csnNames.has(file.slice(0, -4))),
        ].map(file => join(target, file));
      }),
    ),
  ];
}

/**
 * Keeps large project compilations within Windows command-line limits.
 */
export function withCdsCompilationTargets<T>(
  projectDir: string,
  targets: string[],
  compile: (targets: string[]) => T,
): T {
  // Leave room for command options and Windows npm-shim escaping.
  if (targets.join(' ').length <= 1024) {
    return compile(targets);
  }

  const imports = getImportTargets(projectDir, targets);
  const invalidTarget = imports.find(target => /[\r\n]/.test(target));
  if (invalidTarget) {
    throw new Error(
      `Cannot import a CDS compilation target containing a line break: ${JSON.stringify(invalidTarget)}`,
    );
  }
  const entry = fileSync({
    postfix: '.cds',
    prefix: '.codeql-cds-',
    tmpdir: projectDir,
  });
  try {
    writeFileSync(
      entry.fd,
      imports
        .map(target => `using from './${target.split(sep).join('/').replace(/'/g, "''")}';`)
        .join('\n'),
      'utf8',
    );
    return compile([basename(entry.name)]);
  } finally {
    entry.removeCallback();
  }
}
