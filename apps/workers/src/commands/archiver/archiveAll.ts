import { ArchiverService } from '@podverse/orm';
import { loggerService } from '@workers/factories/loggerService';

export default async function archiveAll(): Promise<void> {
  const archiverService = new ArchiverService();

  try {
    loggerService.info('Starting archiveAll process...');
    await archiverService.archiveAll();
    loggerService.info('archiveAll process completed successfully.');
  } catch (error) {
    loggerService.error('Error occurred during archiveAll process:', error);
  }
}
