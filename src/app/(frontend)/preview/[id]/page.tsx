import { headers as nextHeaders } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';

import { COLLECTIONS } from '@/lib/collections';
import PreviewClient, { type PresentationData } from '../PreviewClient';

// The (frontend) layout owns the html/body shell; rendering another shell here
// nests them — invalid DOM + React hydration mismatches.

const messageStyles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#1a1a2e',
    margin: 0,
  },
  text: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1rem',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center' as const,
  },
};

/**
 * Document-aware live-preview route. Fetches the presentation server-side so
 * useLivePreview's `initialData` carries the real id (the native Payload
 * pattern — see docs/live-preview/client). The preview iframe always loads
 * inside the authenticated admin, so we read that user from the request
 * cookies and fetch under normal `read` access control (no overrideAccess).
 */
export default async function PreviewByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    return (
      <div style={messageStyles.wrapper}>
        <p style={messageStyles.text}>
          Connectez-vous à l&apos;administration pour afficher l&apos;aperçu.
        </p>
      </div>
    );
  }

  const doc = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id,
    user,
    depth: 2,
    disableErrors: true,
  });

  if (!doc) {
    return (
      <div style={messageStyles.wrapper}>
        <p style={messageStyles.text}>Présentation introuvable.</p>
      </div>
    );
  }

  return <PreviewClient initialData={doc as unknown as PresentationData} />;
}
