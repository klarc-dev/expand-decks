// Only top-level document navigation should receive HTML login UI. Fetches,
// embedded media and clients of the REST API retain their native response.
export function isDocumentNavigation(request: Request): boolean {
  const mode = request.headers.get('sec-fetch-mode');
  if (mode)
    return (
      mode === 'navigate' && (request.headers.get('sec-fetch-dest') ?? 'document') === 'document'
    );
  return /(?:^|,)\s*text\/html(?:\s*[,;]|$)/i.test(request.headers.get('accept') ?? '');
}

export function documentLogin(request: Request): Response {
  const { pathname, search } = new URL(request.url);
  // A relative Location keeps the public origin behind the reverse proxy.
  return new Response(null, {
    status: 307,
    headers: {
      Location: `/admin/login?${new URLSearchParams({ redirect: pathname + search })}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
