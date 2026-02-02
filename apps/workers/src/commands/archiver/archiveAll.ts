import { ArchiverService } from '@podverse/orm';
import { getLoggerService } from '@workers/factories/loggerService.js';

export default async function archiveAll(): Promise<void> {
  const archiverService = new ArchiverService();

  try {
    getLoggerService().info('Starting archiveAll process...');
    await archiverService.archiveAll();
    getLoggerService().info('archiveAll process completed successfully.');
  } catch (error) {
    getLoggerService().error('Error occurred during archiveAll process:', error);
  }
}
