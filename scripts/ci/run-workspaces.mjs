import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const scriptName = getArgValue('--script');
if (!scriptName) {
  console.error('Missing required --script <name> argument.');
  process.exit(1);
}

const hasAll = args.includes('--all');
const workspacesFlagIndex = args.indexOf('--workspaces');

// Parse --exclude flags (repeatable): e.g. --exclude apps/api --exclude apps/management-api
const excludedPaths = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--exclude' && args[i + 1] && !args[i + 1].startsWith('--')) {
    excludedPaths.push(args[i + 1]);
    i += 1;
  }
}

const readWorkspacePatterns = () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  if (Array.isArray(pkg.workspaces)) {
    return pkg.workspaces;
  }
  if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
    return pkg.workspaces.packages;
  }
  return [];
};

const readWorkspacePackage = (workspacePath) => {
  const packageJsonPath = path.join(workspacePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  return {
    name: pkg.name ?? workspacePath,
    id: workspacePath,
  };
};

const expandWorkspacePattern = (pattern, repoRoot) => {
  const parts = pattern.split('/');

  const expandFrom = (currentPath, partIndex) => {
    if (partIndex >= parts.length) {
      const workspace = readWorkspacePackage(currentPath);
      return workspace ? [workspace] : [];
    }

    const part = parts[partIndex];
    if (part === '*') {
      if (!fs.existsSync(currentPath)) {
        return [];
      }
      const matches = [];
      for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        matches.push(...expandFrom(path.join(currentPath, entry.name), partIndex + 1));
      }
      return matches;
    }

    return expandFrom(path.join(currentPath, part), partIndex + 1);
  };

  return expandFrom(repoRoot, 0);
};

/** Resolve workspaces from root package.json `workspaces` entries (explicit paths and globs). */
const resolveWorkspacesFromManifest = (patterns) => {
  const repoRoot = process.cwd();
  const seen = new Set();
  const resolved = [];

  for (const pattern of patterns) {
    for (const workspace of expandWorkspacePattern(pattern, repoRoot)) {
      const key = path.resolve(workspace.id);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      resolved.push(workspace);
    }
  }

  return resolved;
};

const resolveAllWorkspaces = () => {
  return resolveWorkspacesFromManifest(readWorkspacePatterns());
};

const resolveExplicitWorkspaces = () => {
  if (workspacesFlagIndex === -1) return [];
  const workspaceArgs = [];
  for (let i = workspacesFlagIndex + 1; i < args.length; i += 1) {
    const value = args[i];
    if (value.startsWith('--')) break;
    workspaceArgs.push(value);
  }
  return workspaceArgs.map((workspace) => ({ name: workspace, id: workspace }));
};

const workspaces = hasAll ? resolveAllWorkspaces() : resolveExplicitWorkspaces();

// Filter out excluded workspaces (normalize to repo-relative paths)
const filteredWorkspaces =
  excludedPaths.length > 0
    ? workspaces.filter((ws) => {
        const relPath = path.relative(process.cwd(), ws.id);
        return !excludedPaths.includes(relPath);
      })
    : workspaces;

if (filteredWorkspaces.length === 0) {
  console.error('No workspaces resolved. Use --all or --workspaces <list>.');
  process.exit(1);
}

const createLineCollector = (maxLines) => {
  let buffer = '';
  const lines = [];

  const addChunk = (chunk) => {
    buffer += chunk;
    const split = buffer.split('\n');
    buffer = split.pop() ?? '';
    for (const line of split) {
      lines.push(line);
      if (lines.length > maxLines) lines.shift();
    }
  };

  const flush = () => {
    if (buffer) {
      lines.push(buffer);
      if (lines.length > maxLines) lines.shift();
      buffer = '';
    }
  };

  return { addChunk, flush, lines };
};

const failures = [];

for (const workspace of filteredWorkspaces) {
  const collector = createLineCollector(80);

  /** When stdout is piped (stdio pipe), Vitest/tinyrainbow disable ANSI; FORCE_COLOR restores colors in the parent terminal. */
  const spawnEnv = { ...process.env };
  if (
    scriptName === 'test' &&
    process.stdout.isTTY &&
    spawnEnv.FORCE_COLOR === undefined &&
    spawnEnv.NO_COLOR === undefined &&
    spawnEnv.NODE_DISABLE_COLORS === undefined
  ) {
    spawnEnv.FORCE_COLOR = '1';
  }

  const child = spawn('npm', ['run', scriptName, '--if-present', '-w', workspace.id], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: spawnEnv,
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    collector.addChunk(chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    collector.addChunk(chunk.toString());
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  collector.flush();

  if (exitCode !== 0) {
    failures.push({
      workspace: workspace.name,
      exitCode,
      tail: collector.lines,
    });
  }
}

const summaryTitle =
  scriptName === 'test'
    ? 'Test Summary'
    : scriptName === 'build' || scriptName === 'build:prod'
      ? 'Build Summary'
      : `${scriptName} summary`;

if (failures.length > 0) {
  console.error(`\n=== ${summaryTitle} ===`);
  for (const failure of failures) {
    console.error(`\n- ${failure.workspace} (exit ${failure.exitCode})`);
    for (const line of failure.tail) {
      console.error(line);
    }
  }
  process.exit(1);
}

console.log(`\nAll workspace "${scriptName}" runs completed successfully.`);
