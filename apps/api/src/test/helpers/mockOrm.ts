/**
 * Orphan `CategoryService` used in `vi.mock('@podverse/orm', …)`: the app import path
 * can touch category cache on startup, so every integration mock set provides this.
 */
export class IntegrationTestNoopCategoryService {
  async setCategoryCache(): Promise<void> {}
}
