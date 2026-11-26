import config from '@payload-config';
import { REST_GET, REST_OPTIONS } from '@payloadcms/next/routes';
import { getPayload } from 'payload';
import { documentLogin, isDocumentNavigation } from '@/lib/documentLogin';

const getFile = REST_GET(config);
const options = REST_OPTIONS(config);
type Context = { params: Promise<{ filename: string }> };
async function fileParams({ params }: Context) {
  return { slug: ['media', 'file', (await params).filename] };
}

export async function GET(request: Request, context: Context) {
  const response = await getFile(request, { params: fileParams(context) });
  if ((response.status === 403 || response.status === 401) && isDocumentNavigation(request)) {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) return documentLogin(request);
  }
  return response;
}

export function OPTIONS(request: Request, context: Context) {
  return options(request, { params: fileParams(context) });
}
