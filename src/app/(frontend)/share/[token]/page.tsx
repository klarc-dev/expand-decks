import { getPayload } from 'payload';
import config from '@payload-config';

import { resolveShareLink, isLive } from '@/lib/shareLinks';
import { COLLECTIONS } from '@/lib/collections';

// The (frontend) layout owns the html/body shell; rendering another shell
// here nests them — invalid DOM + React hydration mismatches.

const messageStyles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
    margin: 0,
    background: '#f5f5f5',
  },
  inner: { textAlign: 'center' as const },
  title: { fontSize: '1.5rem', color: '#333' },
  body: { color: '#666' },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await getPayload({ config });

  const link = await resolveShareLink(payload, token);

  if (!link) {
    return (
      <div style={messageStyles.wrapper}>
        <div style={messageStyles.inner}>
          <h1 style={messageStyles.title}>Lien invalide</h1>
          <p style={messageStyles.body}>Ce lien de partage n&apos;existe pas.</p>
        </div>
      </div>
    );
  }

  if (!isLive(link)) {
    return (
      <div style={messageStyles.wrapper}>
        <div style={messageStyles.inner}>
          <h1 style={messageStyles.title}>Lien expiré</h1>
          <p style={messageStyles.body}>
            Ce lien de partage a expiré. Veuillez en demander un nouveau.
          </p>
        </div>
      </div>
    );
  }

  // Increment viewCount and update lastViewedAt
  await payload.update({
    collection: COLLECTIONS.shareLinks,
    id: link.id,
    data: {
      viewCount: (link.viewCount ?? 0) + 1,
      lastViewedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  return (
    <iframe
      src={`/share/${token}/spa/index.html`}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
      }}
      title="Presentation"
      allow="fullscreen"
    />
  );
}
