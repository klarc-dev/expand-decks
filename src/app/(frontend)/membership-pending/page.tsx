import Link from 'next/link';

type PendingPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function MembershipPendingPage({ searchParams }: PendingPageProps) {
  const { status } = await searchParams;
  const rejected = status === 'rejected';

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <div style={styles.mark} aria-hidden="true">
          {rejected ? '×' : '…'}
        </div>
        <p style={styles.eyebrow}>Klarc</p>
        <h1 style={styles.title}>{rejected ? 'Accès non approuvé' : 'Demande en attente'}</h1>
        <p style={styles.copy}>
          {rejected
            ? "Votre demande d'accès n'a pas été approuvée. Contactez un administrateur Klarc si vous pensez qu'il s'agit d'une erreur."
            : 'Votre compte Google a bien été enregistré. Un administrateur Klarc doit maintenant approuver votre accès.'}
        </p>
        {!rejected && (
          <p style={styles.note}>
            Vous pourrez vous connecter avec Google dès que votre compte sera actif.
          </p>
        )}
        <Link href="/admin/login" style={styles.link}>
          Retour à la connexion
        </Link>
      </section>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
    background: '#f3f1eb',
    color: '#171717',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  card: {
    width: 'min(100%, 520px)',
    padding: '48px',
    borderRadius: '20px',
    background: '#ffffff',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
    textAlign: 'center' as const,
  },
  mark: {
    width: '52px',
    height: '52px',
    margin: '0 auto 24px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: '#171717',
    color: '#ffffff',
    fontSize: '28px',
    lineHeight: 1,
  },
  eyebrow: {
    margin: '0 0 10px',
    color: '#6d6a63',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
  },
  title: {
    margin: '0 0 18px',
    fontSize: '36px',
    lineHeight: 1.1,
  },
  copy: {
    margin: '0 auto',
    maxWidth: '430px',
    color: '#4d4a44',
    fontSize: '17px',
    lineHeight: 1.6,
  },
  note: {
    margin: '18px auto 0',
    color: '#6d6a63',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  link: {
    display: 'inline-block',
    marginTop: '30px',
    padding: '12px 18px',
    borderRadius: '8px',
    background: '#171717',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
  },
};
