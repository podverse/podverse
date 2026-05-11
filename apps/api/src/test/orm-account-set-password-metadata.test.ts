import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { startTestApp, stopTestApp } from './helpers/index.js';

/**
 * Regression guard for GitHub issue #190: AccountSetPassword must be registered on the ORM
 * DataSource or POST /account/set-password fails with "No metadata for AccountSetPassword".
 *
 * Assert by entity metadata name (not `getRepository(EntityClass)`): Vitest can instantiate
 * duplicate `@podverse/orm` modules so the imported entity class may not match DataSource metadata.
 */
describe('ORM AccountSetPassword entity registration', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;

  beforeAll(async () => {
    const result = await startTestApp();
    server = result.server;
    ormContext = result.ormContext;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('includes AccountSetPassword on initialized DataSources', () => {
    expect(ormContext).toBeDefined();
    const ds = ormContext?.dataSourceRead;
    expect(ds?.isInitialized).toBe(true);
    const hasAccountSetPassword = ds?.entityMetadatas.some((m) => m.name === 'AccountSetPassword');
    expect(hasAccountSetPassword).toBe(true);
  });
});
