import { statSync } from 'fs';

import { build as esbuildFunc } from 'esbuild';

const NODE_VERSION_TARGET = 'node20';

const buildOptions = {
  banner: {
    js: '#!/usr/bin/env node',
  },
  bundle: true,
  conditions: ['node'],
  entryPoints: ['cds-extractor.ts'],
  external: [
    // Node.js built-in modules
    'assert',
    'buffer',
    'child_process',
    'crypto',
    'events',
    'fs',
    'http',
    'https',
    'module',
    'net',
    'os',
    'path',
    'process',
    'readline',
    'stream',
    'tls',
    'url',
    'util',
    'worker_threads',
    'zlib',
  ],
  format: 'cjs',
  // Handle TypeScript files
  loader: {
    '.ts': 'ts',
  },
  logLevel: 'info',
  // Ensure proper module resolution
  mainFields: ['main', 'module'],
  minifyIdentifiers: false,
  minifySyntax: false,
  minifyWhitespace: false,
  outfile: 'dist/cds-extractor.bundle.js',
  platform: 'node',
  plugins: [],
  // Resolve TypeScript paths
  resolveExtensions: ['.ts', '.js'],
  sourcemap: true,
  target: NODE_VERSION_TARGET,
  treeShaking: true,
};

async function build() {
  try {
    console.log('🚀 Building CDS extractor bundle...');

    const result = await esbuildFunc(buildOptions);

    if (result.errors.length > 0) {
      console.error('❌ Build errors:', result.errors);
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️  Build warnings:', result.warnings);
    }

    console.log('✅ Bundle created successfully at dist/cds-extractor.bundle.js');

    // Check bundle size
    const stats = statSync('dist/cds-extractor.bundle.js');
    // Convert bytes to MB
    const sizeInMB = stats.size / (1024 * 1024);
    console.log(`📦 Created CDS extractor JS bundle: total bundle size: ${sizeInMB.toFixed(2)} MB`);

    // Build the workflow library bundle (used by compile-test-cds.mjs)
    console.log('🚀 Building compile-test-cds library bundle...');

    const libResult = await esbuildFunc({
      ...buildOptions,
      banner: {},
      entryPoints: ['compile-test-cds-lib.ts'],
      outfile: 'dist/compile-test-cds-lib.cjs',
    });

    if (libResult.errors.length > 0) {
      console.error('❌ Library build errors:', libResult.errors);
      process.exit(1);
    }

    console.log('✅ Library bundle created at dist/compile-test-cds-lib.cjs');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

void build();
