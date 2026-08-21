import { getPayload, type Payload, type TypedUser } from 'payload';
import config from '@payload-config';

export async function authenticateRequest(headers: Headers): Promise<{
  payload: Payload;
  user: TypedUser | null;
}> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers });
  return { payload, user };
}
