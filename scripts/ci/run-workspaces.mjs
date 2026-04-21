import { execFileSync, spawn } from 'node:child_process';
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

const resolveWorkspacesFromPatterns = (patterns) => {
  const resolved = [];
  for (const pattern of patterns) {
    if (!pattern.endsWith('/*')) {
      continue;
    }
    const baseDir = path.resolve(process.cwd(), pattern.slice(0, -2));
    if (!fs.existsSync(baseDir)) {
      continue;
    }
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const workspacePath = path.join(baseDir, entry.name);
      const packageJsonPath = path.join(workspacePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        continue;
      }
      const raw = fs.readFileSync(packageJsonPath, 'utf8');
      const pkg = JSON.parse(raw);
      resolved.push({
        name: pkg.name ?? workspacePath,
        id: workspacePath,
      });
    }
  }
  return resolved;
};

const resolveAllWorkspaces = () => {
  try {
    const json = execFileSync('npm', ['workspaces', 'list', '--json'], {
      encoding: 'utf8',
    });
    return JSON.parse(json).map((workspace) => ({
      name: workspace.name,
      id: workspace.location,
    }));
  } catch {
    const patterns = readWorkspacePatterns();
    return resolveWorkspacesFromPatterns(patterns);
  }
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

if (workspaces.length === 0) {
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

for (const workspace of workspaces) {
  const collector = createLineCollector(80);

  const child = spawn('npm', ['run', scriptName, '--if-present', '-w', workspace.id], {
    stdio: ['inherit', 'pipe', 'pipe'],
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
