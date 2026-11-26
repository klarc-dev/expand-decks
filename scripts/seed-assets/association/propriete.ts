import { workedCase, table } from './layout';

export const propriete = [
  workedCase(
    'Apport de Noé · Chaîne des droits',
    'Noé ne peut apporter que les droits qu’il détient',
    [
      [
        'Si le code a été écrit comme salarié',
        'Dans ses fonctions ou sur instruction, les droits patrimoniaux sur le logiciel et sa documentation reviennent à l’employeur, sauf clause ou statut contraire. Vérifier contrat, missions et dates. Sans cession de l’employeur, exclure ces droits.',
      ],
      [
        'Si le code vient d’un dirigeant ou d’un prestataire',
        'Le mandat, la commande et le paiement ne transfèrent pas les droits à eux seuls. Pour chaque contribution non détenue par Noé, remonter à l’auteur, vérifier les cessions signées et régulariser les droits manquants avant l’apport.',
      ],
      [
        'Dans tous les cas · Annexer le périmètre',
        'Figer la version, lister les auteurs et les composants tiers. Joindre les titres et licences. Distinguer ce qui est cédé à la SAS de ce qui reste sous licence. Dans l’acte, détailler les droits, la destination, le territoire et la durée.',
      ],
    ],
    ['CPI, art. L. 111-1, L. 113-9, L. 131-2 et L. 131-3'],
    'Le statut de Noé au moment de l’écriture n’est pas précisé. Un dépôt Git aide à dater les contributions, mais ne prouve pas leur cession.',
  ),
  workedCase(
    'Moteur du laboratoire · Négociation',
    'La licence de recherche ne couvre pas la livraison au client',
    [
      [
        'Droits à obtenir du laboratoire',
        'Licence directe à la SAS : reproduire, intégrer et distribuer le moteur compilé avec le produit. Préciser versions, mises à jour, territoire, durée et usage client (sous-licence si nécessaire). Prévoir la continuité à l’entrée de l’industriel.',
      ],
      [
        'Prix à comparer · Exemple fictif',
        'À périmètre égal sur un an : 6 000 € fixes ou 5 % du CA HT net du produit, sans minimum. Équilibre à 120 000 € de ventes. Sous ce seuil, le variable coûte moins cher et préserve la trésorerie au lancement.',
      ],
      [
        'Si le laboratoire refuse la distribution',
        'Licence directe laboratoire-client si le produit peut être livré sans embarquer le moteur. Sinon, chiffrer le remplacement (intégration, tests et retard) ou différer la vente. Revoir la valeur de l’apport sans les ventes non autorisées.',
      ],
    ],
    ['CPI, art. L. 122-6 · C. civ., art. 1304'],
    'Avant de réaliser l’apport : vérifier qui peut engager le laboratoire, obtenir la licence signée et effective pour la SAS et justifier séparément les 20 000 € estimés.',
  ),
  table(
    'Propriété intellectuelle · Trois vérifications distinctes',
    'Logiciel, brevet, savoir-faire : les pièces à demander',
    'Seul le logiciel est en jeu chez Lina et Noé. Les deux autres lignes sont des cas de comparaison, pas des actifs du prototype.',
    ['Objet', 'Effet et décision', 'Pièces à demander'],
    [
      [
        '**Logiciel** · Code livré avec un moteur tiers',
        'Céder les droits de Noé sur son code et obtenir séparément la licence du moteur.',
        'Inventaire, actes de cession et licence',
      ],
      [
        '**Brevet** · Procédé technique breveté',
        'Sans écrit, cession nulle. Inscrire l’acte au registre pour l’opposer aux tiers.',
        'Titre, extrait du registre et acte écrit',
      ],
      [
        '**Savoir-faire** · Réglages non publics',
        'Pas de monopole contre une découverte indépendante. Encadrer l’usage et protéger le secret.',
        'Annexe, accord de confidentialité et traces d’accès',
      ],
    ],
    ['CPI, art. L. 131-3, L. 613-8 et L. 613-9 · C. com., art. L. 151-1 et L. 151-3'],
  ),
];
