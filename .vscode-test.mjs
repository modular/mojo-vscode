import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  platform: 'desktop',
  version: '1.92.2',
  files: 'out/**/*.test.js',
  // CI environments don't have a monorepo.
  workspaceFolder: './',
  mocha: {
    // Longer timeout because this will download Magic + the SDK.
    timeout: 5 * 60 * 1000,
    reporter: 'out/test/reporter.js',
  },
  env: {
    // Force magic download.
    MOJO_EXTENSION_FORCE_MAGIC: '1',
  },
});
