import { eq } from 'drizzle-orm';

import { getDb, initializeDatabase, schema } from '../db';
import { normalizeSignupMergeEmail } from './subscriptionsSignupPlan';

/**
 * Marks that this device created an account whose subscription merge has not completed yet.
 *
 * Kept in its own module because two things need it and they cannot import each other:
 * `subscriptionsSignupMerge` performs the merge, and `subscriptionsRepository` consults it to know
 * whether an account sync is allowed to overwrite local rows.
 */
const SIGNUP_MERGE_EMAIL_KEY = 'subscriptions.signup_merge_email';

export const writeSignupMergeEmail = async (email: string): Promise<void> => {
  await initializeDatabase();
  const value = normalizeSignupMergeEmail(email);
  const updatedAt = Date.now();
  await getDb()
    .insert(schema.kvMeta)
    .values({ key: SIGNUP_MERGE_EMAIL_KEY, value, updatedAt })
    .onConflictDoUpdate({
      target: schema.kvMeta.key,
      set: { value, updatedAt },
    });
};

export const readSignupMergeEmail = async (): Promise<string | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ value: schema.kvMeta.value })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, SIGNUP_MERGE_EMAIL_KEY))
    .limit(1);
  return rows[0]?.value ?? null;
};

export const clearSignupMergeEmail = async (): Promise<void> => {
  await initializeDatabase();
  await getDb().delete(schema.kvMeta).where(eq(schema.kvMeta.key, SIGNUP_MERGE_EMAIL_KEY));
};

export const hasPendingSignupMerge = async (): Promise<boolean> => {
  return (await readSignupMergeEmail()) !== null;
};
