import { getPayload } from 'payload';
import config from '@payload-config';

import { resolveShareLink, isLive } from '@/lib/shareLinks';

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getPayload({ config });

  const link = await resolveShareLink(payload, token);

  if (!link) {
    return (
      <html lang="fr">
        <body style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f5f5f5' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', color: '#333' }}>Lien invalide</h1>
            <p style={{ color: '#666' }}>Ce lien de partage n&apos;existe pas.</p>
          </div>
        </body>
      </html>
    );
  }

  if (!isLive(link)) {
    return (
      <html lang="fr">
        <body style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f5f5f5' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', color: '#333' }}>Lien expire</h1>
            <p style={{ color: '#666' }}>Ce lien de partage a expire. Veuillez en demander un nouveau.</p>
          </div>
        </body>
      </html>
    );
  }

  // Increment viewCount and update lastViewedAt
  await payload.update({
    collection: 'share-links',
    id: link.id,
    data: {
      viewCount: (link.viewCount ?? 0) + 1,
      lastViewedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  return (
    <html lang="fr">
      <body style={{ margin: 0, overflow: 'hidden' }}>
        <iframe
          src={`/share/${token}/spa/index.html`}
          style={{ width: '100vw', height: '100vh', border: 'none' }}
          title="Presentation"
          allow="fullscreen"
        />
      </body>
    </html>
  );
}
