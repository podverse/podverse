import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

export class DatabaseSetup {
  private monorepoRoot: string;
  private dockerComposeFile: string;
  private containerName = 'podverse_lighthouse_test_db';
  private networkName = 'podverse_lighthouse_network';

  constructor() {
    // Monorepo is at: /path/to/podverse
    const currentDir = __dirname;
    const monorepoRoot = path.resolve(currentDir, '../../../..');
    this.monorepoRoot = monorepoRoot;
    this.dockerComposeFile = path.join(
      monorepoRoot,
      'tools/web-perf/lighthouse/docker/docker-compose.yml'
    );
  }

  async checkContainerRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps -a --filter "name=${this.containerName}" --format "{{.Names}}"`
      );
      return stdout.trim() === this.containerName;
    } catch {
      return false;
    }
  }

  async checkContainerUp(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${this.containerName}" --format "{{.Names}}"`
      );
      return stdout.trim() === this.containerName;
    } catch {
      return false;
    }
  }

  async startLighthouseServices(): Promise<void> {
    await this.cleanupExistingServices();

    console.log('📦 Starting Lighthouse Docker services...');
    await this.runDockerComposeCommand('up -d');
    await this.waitForContainer();
    await this.waitForPostgresReady();
  }

  async teardownLighthouseServices(): Promise<void> {
    try {
      console.log('🧹 Tearing down Lighthouse Docker services...');
      await this.runDockerComposeCommand('down -v --remove-orphans');
      await execAsync(`docker network rm ${this.networkName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const networkAlreadyGone =
        errorMessage.includes('No such network') || errorMessage.includes('not found');
      if (!networkAlreadyGone) {
        console.warn('   ⚠️  Failed to remove Lighthouse network:', errorMessage);
      }
    }
  }

  async cleanupExistingServices(): Promise<void> {
    console.log('🧹 Removing any existing Lighthouse Docker services...');
    await this.runDockerComposeCommand('down -v --remove-orphans');
  }

  private async waitForContainer(): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 1000;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const isUp = await this.checkContainerUp();
      if (isUp) {
        console.log(`   ✅ ${this.containerName} is running`);
        return;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(`${this.containerName} did not start in time`);
  }

  private async waitForPostgresReady(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 1000;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await execAsync(`docker exec -i ${this.containerName} pg_isready -U postgres -d postgres`);
        console.log(`   ✅ Postgres is accepting connections`);
        return;
      } catch {
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw new Error(
      `Postgres did not become ready in time. Check logs with: docker logs ${this.containerName}`
    );
  }

  async resetTestDatabase(): Promise<void> {
    console.log('🔄 Resetting test database...');
    try {
      await this.runPsqlCommand('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
      await this.runLinearMigrations();
      await this.runInitScript();
      await this.verifyCategoryTable();
      console.log('✅ Test database reset and initialized');
    } catch (error: unknown) {
      console.error('❌ Failed to reset test database:', error);
      throw new Error(
        'Failed to reset test database. Please ensure:\n' +
          '1. Docker is running\n' +
          `2. The compose file exists at ${this.dockerComposeFile}\n` +
          '3. You can run the reset manually (see tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md)\n' +
          '4. The test database container is accessible',
        { cause: error }
      );
    }
  }

  private async ensureComposeFileExists(): Promise<void> {
    if (!fs.existsSync(this.dockerComposeFile)) {
      throw new Error(`Docker compose file not found at: ${this.dockerComposeFile}`);
    }
  }

  private async runDockerComposeCommand(args: string): Promise<void> {
    await this.ensureComposeFileExists();
    const command = `docker compose -f "${this.dockerComposeFile}" ${args}`;
    console.log(`   → Running: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.monorepoRoot,
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      });

      // Output stdout if present
      if (stdout && stdout.trim()) {
        const lines = stdout.trim().split('\n');
        lines.forEach((line) => {
          if (line.trim()) {
            console.log(`      ${line}`);
          }
        });
      }

      if (stderr && !stderr.includes('WARNING')) {
        // Some docker compose commands output to stderr but are successful
        // Only treat as error if it's not a warning
        if (
          !stderr.includes('Creating') &&
          !stderr.includes('Starting') &&
          !stderr.includes('Up')
        ) {
          console.warn('   ⚠️  Docker compose stderr:', stderr);
        } else if (
          stderr.includes('Creating') ||
          stderr.includes('Starting') ||
          stderr.includes('Up')
        ) {
          console.log(`      ${stderr.trim()}`);
        }
      }
    } catch (error: unknown) {
      throw new Error('Docker compose command failed', { cause: error });
    }
  }

  private async runPsqlCommand(sql: string): Promise<void> {
    const command = `docker exec -i ${this.containerName} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "${sql}"`;
    await execAsync(command, {
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  private async runLinearMigrations(): Promise<void> {
    const command =
      'DB_HOST="127.0.0.1" DB_PORT="5111" DB_APP_ADMIN_USER="postgres" DB_APP_ADMIN_PASSWORD="mysecretpw" DB_APP_NAME="postgres" bash scripts/database/run-linear-migrations.sh --database app';
    await execAsync(command, {
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024,
      cwd: this.monorepoRoot,
    });
  }

  private async verifyCategoryTable(): Promise<void> {
    const command = `docker exec -i ${this.containerName} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -t -A -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='category')"`;
    const { stdout } = await execAsync(command, {
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stdout.trim() !== 't') {
      throw new Error('Category table missing after schema reset.');
    }
  }

  private async runInitScript(): Promise<void> {
    const command = `docker exec -i ${this.containerName} bash /docker-entrypoint-initdb.d/0001_create_app_db_users.sh`;
    await execAsync(command, {
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024,
    });
  }
}
