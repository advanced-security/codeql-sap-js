import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import * as tmp from 'tmp';

import { buildCdsProjectDependencyGraph } from '../../src/cds/parser/graph';

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

describe('CDS extractor end-to-end scenarios', () => {
  let root: string;
  let cleanup: () => void;

  beforeEach(() => {
    const dir = tmp.dirSync({ unsafeCleanup: true });
    root = dir.name;
    cleanup = dir.removeCallback;
  });

  afterEach(() => {
    cleanup();
  });

  describe('CAP Java backend with JS UI workspaces in one repository', () => {
    // Subdirectories without their own package.json must not become separate projects.
    it('detects a single CDS project at the repository root', () => {
      writeTree(root, {
        'pom.xml': '<project><artifactId>cds-maven-plugin</artifactId></project>',
        'package.json': JSON.stringify({
          name: 'specmgmt-root',
          workspaces: ['app/ui-a'],
          devDependencies: { '@sap/cds-dk': '10.1.2' },
        }),
        'db/model/schema.cds': "using { cuid } from '@sap/cds/common';\nentity Books : cuid {}",
        'db/model/common/types.cds': 'type Code : String(10);',
        'db/view/views.cds': "using from '../model/schema';",
        'fts/feature-a/flag.cds': "using from '../../db/model/schema';",
        'srv/cds/api/service.cds':
          "using from '../../../db/model/schema';\n" +
          "using from 'com.sap.plm/units-and-codes/external/ApiCurrencyServiceV1';\nservice S {}",
        'srv/cds/ui/config/annotations.cds': "using from '../../api/service';",
        'app/ui-a/package.json': JSON.stringify({ name: 'ui-a' }),
      });
      const graph = buildCdsProjectDependencyGraph(root);
      expect([...graph.projects.keys()]).toEqual(['.']);
    });
  });
});
