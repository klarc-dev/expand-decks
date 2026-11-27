import type { PostgresAdapter } from '@payloadcms/db-postgres';
import type { Payload, PayloadRequest } from 'payload';

export class PayloadTransactionUnavailable extends Error {}

export async function withPayloadTransaction<T>(
  payload: Payload,
  request: Partial<PayloadRequest>,
  callback: (req: PayloadRequest, db: PostgresAdapter['drizzle']) => Promise<T>,
): Promise<T> {
  // READ COMMITTED permits a waiting lock holder to see the first request's
  // committed writes instead of applying a stale snapshot or retrying a write.
  const transactionID = await payload.db.beginTransaction({ isolationLevel: 'read committed' });
  if (transactionID == null) throw new PayloadTransactionUnavailable();
  const req = { context: {}, ...request, payload, transactionID } as PayloadRequest;
  try {
    const db = payload.db.sessions?.[String(transactionID)]?.db;
    if (payload.db.name !== 'postgres' || !db) throw new PayloadTransactionUnavailable();
    const result = await callback(req, db as PostgresAdapter['drizzle']);
    await payload.db.commitTransaction(transactionID);
    return result;
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }
}
