import Link from 'next/link';

import './membership-pending.scss';

type PendingPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function MembershipPendingPage({ searchParams }: PendingPageProps) {
  const { status } = await searchParams;
  const rejected = status === 'rejected';

  return (
    <main className="membership-pending">
      <section className="membership-pending__card">
        <div className="membership-pending__mark" aria-hidden="true">
          {rejected ? '×' : '…'}
        </div>
        <p className="membership-pending__eyebrow">Klarc</p>
        <h1 className="membership-pending__title">
          {rejected ? 'Accès non approuvé' : 'Demande en attente'}
        </h1>
        <p className="membership-pending__copy">
          {rejected
            ? "Votre demande d'accès n'a pas été approuvée. Contactez un administrateur Klarc si vous pensez qu'il s'agit d'une erreur."
            : 'Votre compte Google a bien été enregistré. Un administrateur Klarc doit maintenant approuver votre accès.'}
        </p>
        {!rejected && (
          <p className="membership-pending__note">
            Vous pourrez vous connecter avec Google dès que votre compte sera actif.
          </p>
        )}
        <Link className="membership-pending__link" href="/admin/login">
          Retour à la connexion
        </Link>
      </section>
    </main>
  );
}
