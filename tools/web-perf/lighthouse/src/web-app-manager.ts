import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { killProcessOnPort } from './port-killer.js';

const execAsync = promisify(exec);

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WebAppManager {
  private webAppProcess: ChildProcess | null = null;
  private podverseWebPath: string;

  constructor() {
    // Calculate path to apps/web
    const currentDir = __dirname;
    const monorepoRoot = path.resolve(currentDir, '../../../..');
    this.podverseWebPath = path.join(monorepoRoot, 'apps/web');
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
    maxAttempts: number = 60,
    delay: number = 1000
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) {
          // Server is responding (404 is OK, means server is up)
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
    if (this.webAppProcess) {
      console.log('⚠️  Web app is already running');
      return this.getWebUrl();
    }

    const webPort = this.getWebPort();

    // Check if port is available, and kill any process using it
    const portAvailable = await this.checkPortAvailable(webPort);
    if (!portAvailable) {
      console.log(`⚠️  Port ${webPort} is in use, attempting to free it...`);
      await killProcessOnPort(webPort);
    }

    console.log(`🚀 Starting podverse-web on port ${webPort}...`);
    console.log(`   Working directory: ${this.podverseWebPath}`);

    // Set environment variables for test instance
    // Pass WEB_PORT as PORT for Next.js
    const env = {
      ...process.env,
      PORT: process.env.WEB_PORT,
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_DATABASE: process.env.DB_DATABASE,
      DB_READ_USERNAME: process.env.DB_READ_USERNAME,
      DB_READ_PASSWORD: process.env.DB_READ_PASSWORD,
      DB_READ_WRITE_USERNAME: process.env.DB_READ_WRITE_USERNAME,
      DB_READ_WRITE_PASSWORD: process.env.DB_READ_WRITE_PASSWORD,
      DB_SSL_CONNECTION: process.env.DB_SSL_CONNECTION,
      NEXT_PUBLIC_WEB_DOMAIN: process.env.NEXT_PUBLIC_WEB_DOMAIN,
      NEXT_PUBLIC_WEB_PROTOCOL: process.env.NEXT_PUBLIC_WEB_PROTOCOL,
      NEXT_PUBLIC_SSR_API_PROTOCOL: process.env.NEXT_PUBLIC_SSR_API_PROTOCOL,
      NEXT_PUBLIC_SSR_API_HOST: process.env.NEXT_PUBLIC_SSR_API_HOST,
      NEXT_PUBLIC_SSR_API_PORT: process.env.NEXT_PUBLIC_SSR_API_PORT,
      NEXT_PUBLIC_API_PROTOCOL: process.env.NEXT_PUBLIC_API_PROTOCOL,
      NEXT_PUBLIC_API_HOST: process.env.NEXT_PUBLIC_API_HOST,
      NEXT_PUBLIC_API_PORT: process.env.NEXT_PUBLIC_API_PORT,
      NEXT_PUBLIC_API_PREFIX: process.env.NEXT_PUBLIC_API_PREFIX,
      NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION,
      NEXT_PUBLIC_SERVER_ENV: process.env.NEXT_PUBLIC_SERVER_ENV,
      SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
      ALLOW_LOCALHOST_PROXY: process.env.ALLOW_LOCALHOST_PROXY,
    };

    // Check if package.json exists
    const packageJsonPath = path.join(this.podverseWebPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`podverse-web not found at: ${this.podverseWebPath}`);
    }

    console.log('   → Web app DB config:');
    console.log(`     DB_HOST=${env.DB_HOST ?? ''}`);
    console.log(`     DB_PORT=${env.DB_PORT ?? ''}`);
    console.log(`     DB_DATABASE=${env.DB_DATABASE ?? ''}`);

    // Build the Next.js app (production) before starting
    console.log('   → Building web app (next build)...');
    const buildResult = await execAsync('npm run build', {
      cwd: this.podverseWebPath,
      env,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (buildResult.stderr && buildResult.stderr.trim()) {
      console.warn(`   ⚠️  Build stderr: ${buildResult.stderr.trim()}`);
    }
    console.log('   ✅ Build complete');

    // Start Next.js production server
    // PORT environment variable will be used by Next.js
    this.webAppProcess = spawn('npm', ['run', 'start'], {
      cwd: this.podverseWebPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    // Capture stdout/stderr for debugging
    let output = '';
    let errorOutput = '';

    this.webAppProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Only log important messages to avoid spam
      if (text.includes('Ready') || text.includes('started') || text.includes('error')) {
        console.log(`   [web] ${text.trim()}`);
      }
    });

    this.webAppProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      // Only log errors
      if (text.includes('error') || text.includes('Error') || text.includes('EADDRINUSE')) {
        console.error(`   [web error] ${text.trim()}`);
      }
    });

    // Handle process exit
    this.webAppProcess.on('exit', (code, _signal) => {
      if (code !== null && code !== 0 && code !== 130) {
        // 130 is SIGINT (Ctrl+C), which is expected
        console.error(`⚠️  Web app process exited with code ${code}`);
      }
      this.webAppProcess = null;
    });

    // Wait for server to be ready
    console.log(`   → Waiting for server to be ready...`);
    const isReady = await this.waitForServerReady(this.getWebUrl(), 120, 1000); // Wait up to 2 minutes

    if (!isReady) {
      await this.stop();
      throw new Error(
        `Web app failed to start on port ${webPort} within 2 minutes.\n` +
          `Last output:\n${output.slice(-500)}\n` +
          `Last errors:\n${errorOutput.slice(-500)}`
      );
    }

    console.log(`✅ Web app is ready at ${this.getWebUrl()}\n`);
    return this.getWebUrl();
  }

  async stop(): Promise<void> {
    const process = this.webAppProcess;
    this.webAppProcess = null; // Clear reference immediately to prevent double-stop

    if (!process) {
      // If we don't have a process reference, try killing by port
      await killProcessOnPort(this.getWebPort());
      return;
    }

    console.log(`🛑 Stopping web app...`);

    return new Promise((resolve) => {
      // Try graceful shutdown first
      const killed = process.kill('SIGTERM');

      if (!killed) {
        // Process might already be dead, try killing by port
        killProcessOnPort(this.getWebPort()).then(() => resolve());
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
        await killProcessOnPort(this.getWebPort());
        resolve();
      }, 5000);

      process.on('exit', () => {
        clearTimeout(timeout);
        console.log('   ✅ Web app stopped');
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.webAppProcess !== null && !this.webAppProcess.killed;
  }

  getUrl(): string {
    return this.getWebUrl();
  }

  private getWebUrl(): string {
    return `http://localhost:${this.getWebPort()}`;
  }

  private getWebPort(): number {
    const value = this.getRequiredEnv('WEB_PORT');
    const port = Number(value);
    if (!Number.isFinite(port)) {
      throw new Error(`WEB_PORT must be a number. Received: ${value}`);
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
