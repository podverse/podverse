import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ContainerStatus {
  name: string;
  isRunning: boolean;
  port?: number;
}

export class ContainerChecker {
  private requiredContainers = [
    {
      name: 'podverse_lighthouse_mq',
      port: 5673,
      description: 'Message Queue (ActiveMQ Artemis)',
    },
    { name: 'podverse_lighthouse_keyvaldb', port: 6381, description: 'Key-Value DB (Valkey)' },
  ];

  async checkContainerRunning(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${containerName}" --format "{{.Names}}" | grep -q "^${containerName}$" && echo "running" || echo "not_running"`
      );
      return stdout.trim() === 'running';
    } catch {
      return false;
    }
  }

  async checkContainerPort(containerName: string, port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker port ${containerName} 2>/dev/null | grep ":${port}" || echo ""`
      );
      return stdout.trim() !== '';
    } catch {
      return false;
    }
  }

  async checkAllContainers(): Promise<{ allRunning: boolean; statuses: ContainerStatus[] }> {
    const statuses: ContainerStatus[] = [];

    for (const container of this.requiredContainers) {
      const isRunning = await this.checkContainerRunning(container.name);
      let portOk = false;

      if (isRunning) {
        portOk = await this.checkContainerPort(container.name, container.port);
      }

      statuses.push({
        name: container.name,
        isRunning,
        port: portOk ? container.port : undefined,
      });
    }

    const allRunning = statuses.every((s) => s.isRunning);

    return { allRunning, statuses };
  }

  async validateRequiredContainers(): Promise<void> {
    console.log('🔍 Checking required Docker containers...\n');

    const { allRunning, statuses } = await this.checkAllContainers();

    for (const status of statuses) {
      const container = this.requiredContainers.find((c) => c.name === status.name)!;
      if (status.isRunning) {
        if (status.port) {
          console.log(`   ✅ ${container.name} is running on port ${status.port}`);
        } else {
          console.log(
            `   ⚠️  ${container.name} is running but port ${container.port} may not be exposed`
          );
        }
      } else {
        console.log(`   ❌ ${container.name} is not running`);
      }
    }

    console.log(); // Empty line

    if (!allRunning) {
      const missingContainers = statuses
        .filter((s) => !s.isRunning)
        .map((s) => {
          const container = this.requiredContainers.find((c) => c.name === s.name)!;
          return `   - ${container.name} (${container.description}) on port ${container.port}`;
        })
        .join('\n');

      throw new Error(
        `Required Lighthouse Docker containers are not running. Please start the following containers:\n\n${missingContainers}\n\n` +
          `You can start them using the Lighthouse compose file from the monorepo root:\n` +
          `  docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml up -d\n`
      );
    }
  }
}
