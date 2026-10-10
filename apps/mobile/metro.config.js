const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const packagesRoot = path.resolve(monorepoRoot, 'packages');
const nodeCryptoShim = path.resolve(projectRoot, 'src/shims/node-crypto.js');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch shared package dist/ plus the monorepo tsconfig base so export/build can resolve
// `apps/mobile/tsconfig.json` extends during Metro's TypeScript path setup.
config.watchFolders = [packagesRoot, monorepoRoot];

// Test runs write screenshots and logs under `.artifacts/`. Metro answers any watched write with an
// HMR update, and the dev client's "Refreshing..." banner window then swallows taps in the header row.
const artifactsRoot = path.resolve(monorepoRoot, '.artifacts');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  new RegExp(`^${escapeRegExp(artifactsRoot)}(?:[\\\\/].*)?$`),
];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Shared packages (via parser-mapping → v4v-metaboost → helpers) import Node `crypto`.
// RN has no Node stdlib — resolve to a pure-JS createHash shim (md5 / sha256).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto' || moduleName === 'node:crypto') {
    return { type: 'sourceFile', filePath: nodeCryptoShim };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
