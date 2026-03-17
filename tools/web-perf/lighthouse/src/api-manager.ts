import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import {
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_POLL_DELAY_MS,
  SERVER_READY_WAIT_MAX_ATTEMPTS_API,
  SHUTDOWN_DELAY_MS,
} from '@podverse/helpers';
import { fetchWithTimeout } from '@podverse/helpers-backend';
import { killProcessOnPort } from './port-killer.js';

const execAsync = promisify(exec);

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ApiManager {
  private apiProcess: ChildProcess | null = null;
  private podverseApiPath: string;

  constructor() {
    // Calculate path to apps/api
    const currentDir = __dirname;
    const monorepoRoot = path.resolve(currentDir, '../../../..');
    this.podverseApiPath = path.join(monorepoRoot, 'apps/api');
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port} || echo ""`);
      return stdout.trim() === '';
    } catch {
      return true;
    }
  }

  private async waitForServerReady(
    url: string,
    maxAttempts: number = SERVER_READY_WAIT_MAX_ATTEMPTS_API,
    delay: number = DEFAULT_POLL_DELAY_MS
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetchWithTimeout(url, { timeoutMs: DEFAULT_HTTP_TIMEOUT_MS });
        if (response.ok || response.status === 404 || response.status === 401) {
          // Server is responding (401 is OK, means auth is required but server is up)
          return true;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
  }

  async start(): Promise<string> {
    if (this.apiProcess) {
      console.log('⚠️  API is already running');
      return this.getApiUrl();
    }

    const apiPort = this.getApiPort();

    // Check if port is available, and kill any process using it
    const portAvailable = await this.checkPortAvailable(apiPort);
    if (!portAvailable) {
      console.log(`⚠️  Port ${apiPort} is in use, attempting to free it...`);
      await killProcessOnPort(apiPort);
    }

    console.log(`🚀 Starting podverse-api on port ${apiPort}...`);
    console.log(`   Working directory: ${this.podverseApiPath}`);

    // Set environment variables for test instance
    const env = {
      ...process.env,
      PODVERSE_SKIP_DOTENV: 'true',
      NODE_ENV: process.env.NODE_ENV,
      API_PORT: process.env.API_PORT,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_DATABASE: process.env.DB_DATABASE,
      DB_READ_USERNAME: process.env.DB_READ_USERNAME,
      DB_READ_PASSWORD: process.env.DB_READ_PASSWORD,
      DB_READ_WRITE_USERNAME: process.env.DB_READ_WRITE_USERNAME,
      DB_READ_WRITE_PASSWORD: process.env.DB_READ_WRITE_PASSWORD,
      DB_SSL_CONNECTION: process.env.DB_SSL_CONNECTION,
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
      API_PREFIX: process.env.API_PREFIX,
      API_VERSION: process.env.API_VERSION,
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
      MAILER_DISABLED: process.env.MAILER_DISABLED,
      MESSAGE_QUEUE_PROTOCOL: process.env.MESSAGE_QUEUE_PROTOCOL,
      MESSAGE_QUEUE_HOST: process.env.MESSAGE_QUEUE_HOST,
      MESSAGE_QUEUE_PORT: process.env.MESSAGE_QUEUE_PORT,
      MESSAGE_QUEUE_USERNAME: process.env.MESSAGE_QUEUE_USERNAME,
      MESSAGE_QUEUE_PASSWORD: process.env.MESSAGE_QUEUE_PASSWORD,
      KEYVALDB_HOST: process.env.KEYVALDB_HOST,
      KEYVALDB_PORT: process.env.KEYVALDB_PORT,
      KEYVALDB_PASSWORD: process.env.KEYVALDB_PASSWORD,
      LOG_LEVEL: process.env.LOG_LEVEL,
    };

    // Check if package.json exists
    const packageJsonPath = path.join(this.podverseApiPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`podverse-api not found at: ${this.podverseApiPath}`);
    }

    console.log('   → API DB config:');
    console.log(`     DB_HOST=${env.DB_HOST ?? ''}`);
    console.log(`     DB_PORT=${env.DB_PORT ?? ''}`);
    console.log(`     DB_DATABASE=${env.DB_DATABASE ?? ''}`);

    // Start API server
    this.apiProcess = spawn('npm', ['run', 'dev'], {
      cwd: this.podverseApiPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    // Capture stdout/stderr for debugging
    let output = '';
    let errorOutput = '';

    this.apiProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Only log important messages to avoid spam
      if (
        text.includes('running on port') ||
        text.includes('Connected to') ||
        text.includes('error') ||
        text.includes('Error')
      ) {
        console.log(`   [api] ${text.trim()}`);
      }
    });

    this.apiProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      // Only log errors
      if (
        text.includes('error') ||
        text.includes('Error') ||
        text.includes('EADDRINUSE') ||
        text.includes('FATAL')
      ) {
        console.error(`   [api error] ${text.trim()}`);
      }
    });

    // Track if process exited with error
    let processExitedWithError = false;
    let exitCode: number | null = null;

    // Handle process exit
    this.apiProcess.on('exit', (code, _signal) => {
      if (code !== null && code !== 0 && code !== 130) {
        // 130 is SIGINT (Ctrl+C), which is expected
        console.error(`⚠️  API process exited with code ${code}`);
        processExitedWithError = true;
        exitCode = code;
        this.apiProcess = null;
        // Exit immediately when API fails to start
        console.error('\n❌ API server failed to start. Exiting...\n');
        process.exit(code);
      }
      this.apiProcess = null;
    });

    // Wait for server to be ready
    console.log(`   → Waiting for API server to be ready...`);

    // Check if process exited during wait
    let checkInterval: NodeJS.Timeout | null = null;
    let checkTimeout: NodeJS.Timeout | null = null;
    const isReady = await Promise.race([
      this.waitForServerReady(
        `${this.getApiUrl()}/api/v2/`,
        SERVER_READY_WAIT_MAX_ATTEMPTS_API,
        DEFAULT_POLL_DELAY_MS
      ),
      new Promise<boolean>((resolve) => {
        checkInterval = setInterval(() => {
          if (processExitedWithError || !this.apiProcess || this.apiProcess.killed) {
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            if (checkTimeout) {
              clearTimeout(checkTimeout);
              checkTimeout = null;
            }
            resolve(false);
          }
        }, 500);
        // Clear interval after max wait time
        checkTimeout = setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        }, 180000);
      }),
    ]);
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    if (checkTimeout) {
      clearTimeout(checkTimeout);
      checkTimeout = null;
    }

    if (!isReady || processExitedWithError) {
      await this.stop();
      const errorMessage = processExitedWithError
        ? `API process exited with code ${exitCode} before server became ready.\n`
        : `API server failed to start on port ${apiPort} within 3 minutes.\n`;
      throw new Error(
        errorMessage +
          `Last output:\n${output.slice(-500)}\n` +
          `Last errors:\n${errorOutput.slice(-500)}`
      );
    }

    console.log(`✅ API server is ready at ${this.getApiUrl()}\n`);
    return this.getApiUrl();
  }

  async stop(): Promise<void> {
    const process = this.apiProcess;
    this.apiProcess = null; // Clear reference immediately to prevent double-stop

    if (!process) {
      // If we don't have a process reference, try killing by port
      await killProcessOnPort(this.getApiPort());
      return;
    }

    console.log(`🛑 Stopping API server...`);

    return new Promise((resolve) => {
      // Try graceful shutdown first
      const killed = process.kill('SIGTERM');

      if (!killed) {
        // Process might already be dead, try killing by port
        killProcessOnPort(this.getApiPort()).then(() => resolve());
        return;
      }

      // Wait for process to exit (with timeout)
      const timeout = setTimeout(async () => {
        try {
          process.kill('SIGKILL');
        } catch {
          // Process already gone
        }
        // Also try killing by port in case process reference is stale
        await killProcessOnPort(this.getApiPort());
        resolve();
      }, SHUTDOWN_DELAY_MS);

      process.on('exit', () => {
        clearTimeout(timeout);
        console.log('   ✅ API server stopped');
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.apiProcess !== null && !this.apiProcess.killed;
  }

  getUrl(): string {
    return this.getApiUrl();
  }

  private getApiUrl(): string {
    return `http://localhost:${this.getApiPort()}`;
  }

  private getApiPort(): number {
    const value = this.getRequiredEnv('API_PORT');
    const port = Number(value);
    if (!Number.isFinite(port)) {
      throw new Error(`API_PORT must be a number. Received: ${value}`);
    }
    return port;
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }
}
