import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown(): Promise<void> {
  console.log('Global teardown: Stopping containers...');

  // Stop containers using docker directly since we're in a new process
  const configPath = path.join(process.cwd(), '.integration-test-config.json');

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      postgresContainerId?: string;
      rabbitmqContainerId?: string;
    };

    // Use dynamic import for execSync to avoid top-level issues
    const { execSync } = await import('child_process');

    if (config.postgresContainerId) {
      try {
        execSync(`docker stop ${config.postgresContainerId}`, { stdio: 'pipe' });
        execSync(`docker rm ${config.postgresContainerId}`, { stdio: 'pipe' });
        console.log('Postgres container stopped');
      } catch {
        // Container might already be stopped
      }
    }

    if (config.rabbitmqContainerId) {
      try {
        execSync(`docker stop ${config.rabbitmqContainerId}`, { stdio: 'pipe' });
        execSync(`docker rm ${config.rabbitmqContainerId}`, { stdio: 'pipe' });
        console.log('RabbitMQ container stopped');
      } catch {
        // Container might already be stopped
      }
    }

    // Clean up config file
    fs.unlinkSync(configPath);
  }

  console.log('Global teardown complete');
}
