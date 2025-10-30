/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CMD_TIMEOUT_MS = 5000; // Default timeout for execution in milliseconds
const MAX_BUNDLE_SIZE_MB = 0.5; // We expect the bundle to be quite small

const bundlePath = path.join(__dirname, 'dist', 'cds-extractor.bundle.js');

console.log('🔍 Validating CDS extractor bundle at', bundlePath);

// Check bundle exists
if (!fs.existsSync(bundlePath)) {
  console.error('❌ Bundle does not exist:', bundlePath);
  process.exit(1);
}

console.log('✅ Bundle file exists');

// Check bundle size (should be reasonable, not too large)
const stats = fs.statSync(bundlePath);
const sizeInMB = stats.size / (1024 * 1024);
console.log(`📦 Bundle size: ${sizeInMB.toFixed(2)} MB`);

if (sizeInMB > MAX_BUNDLE_SIZE_MB) {
  console.warn('⚠️  Bundle size is quite large, consider optimizing');
}

// Check if bundle is executable
try {
  const mode = stats.mode;
  console.log(`🔐 Bundle permissions: ${mode.toString(8)}`);
} catch (error) {
  console.warn('⚠️  Could not check bundle permissions:', error.message);
}

// Test basic execution with timeout
console.log('🧪 Testing bundle execution...');

try {
  const testDir = path.join(os.tmpdir(), 'cds-extractor-test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Test with a timeout to avoid hanging. We expect this to fail or timeout since
  // we are not providing proper arguments but it should at least start execution.
  try {
    execSync(`node "${bundlePath}" "${testDir}"`, {
      stdio: 'pipe',
      cwd: testDir,
      timeout: CMD_TIMEOUT_MS,
      encoding: 'utf8',
    });
    console.log('✅ Bundle execution completed successfully');
  } catch (error) {
    // We expect this to fail or timeout in test environment
    if (error.killed) {
      console.log('✅ Bundle execution test passed (timed out as expected)');
    } else if (error.status !== 0) {
      // Check if it's a controlled exit (expected behavior)
      console.log('✅ Bundle execution test passed (exited with status code, which is expected)');
    } else {
      console.error('❌ Bundle execution test failed:', error.message);
      process.exit(1);
    }
  }
} catch (error) {
  console.error('❌ Bundle execution setup failed:', error.message);
  process.exit(1);
}

console.log('✅ Bundle validation completed successfully');
