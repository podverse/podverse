import { AppDataSourceRead } from '@orm/db/index.js';
import { Medium } from '@orm/entities/medium.js';

export class MediumService {
  private repositoryRead = AppDataSourceRead.getRepository(Medium);

  async getAll(): Promise<Medium[]> {
    return await this.repositoryRead.find();
  }
}
