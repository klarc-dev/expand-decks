import { compare, section, table } from './layout';

const jei =
  '[CGI, art. 44 sexies-0 A](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543750/2026-12-01/)';
const taille =
  '[Recommandation 2003/361/CE, ann. art. 2 à 6](https://publications.europa.eu/resource/cellar/6ca8d655-126b-4a42-ada4-e9058fa45155.0007.01/DOC_1)';
const bourse =
  '[Bpifrance · Bourse French Tech Émergence](https://www.bpifrance.fr/catalogue-offres/bourse-french-tech-emergence)';
const pret =
  '[Bpifrance · Prêt Innovation R&D classique](https://www.bpifrance.fr/catalogue-offres/pret-innovation-rd-classique-0)';

export const financement = [
  section(
    '04',
    'Lever des fonds : JEI et Bpifrance',
    '**JEI et Bpifrance ?** Objectif : faire entrer un investisseur sans perdre le statut JEI ni l’accès aux aides Bpifrance.',
  ),
  compare(
    'JEI et Bpifrance · L’offre de l’industriel',
    'Un industriel propose 100 000 € : à qui va l’argent',
    [
      [
        'Augmentation de capital · la SAS reçoit',
        'La SAS crée 100 actions nouvelles à 1 000 €. **+100 000 € en banque.** Lina 30 %, Noé 20 %, industriel 50 %.',
      ],
      [
        'Achat d’actions · les fondateurs reçoivent',
        'L’industriel rachète les 100 actions existantes. Lina touche 60 000 €, Noé 40 000 €. **La SAS ne reçoit rien.**',
      ],
    ],
    ['C. com., art. L. 225-128 et L. 225-144'],
    'Pour financer le projet, c’est l’augmentation de capital qui convient. Hypothèse : licence commerciale obtenue et apport de Noé confirmé.',
  ),
  table(
    'JEI · Jeune entreprise innovante',
    'Cinq conditions à remplir en même temps',
    'Appréciées à la clôture de l’exercice. La détention doit être respectée en continu.',
    ['Condition', 'Seuil', 'Preuve'],
    [
      [
        '**Taille**',
        'Moins de 250 salariés, et CA < 50 M€ ou bilan < 43 M€',
        'Comptes, effectif moyen',
      ],
      ['**Âge**', 'Moins de 8 ans', 'Extrait Kbis'],
      ['**Recherche**', 'Dépenses de R&D ≥ 20 % des charges', 'Dossier R&D rapproché des comptes'],
      [
        '**Détention**',
        '≥ 50 % par des personnes physiques ou détenteurs admis',
        'Registre des mouvements de titres',
      ],
      [
        '**Activité nouvelle**',
        'Pas une reprise ni une restructuration',
        'Historique de l’activité',
      ],
    ],
    [jei],
  ),
  {
    blockType: 'stats',
    eyebrow: 'JEI · Le piège de la détention',
    title: 'Une action de trop et la SAS perd la JEI',
    lead: 'Lina et Noé gardent 100 actions. L’industriel n’est pas un détenteur admis (hypothèse).',
    stats: [
      {
        value: '50 %',
        label: '100 actions nouvelles à 1 000 € : 100 000 € levés. Seuil atteint, sans marge.',
      },
      { value: '49,75 %', label: '101 actions au même prix : 101 000 € levés. Seuil manqué.' },
      { value: '50 %', label: '100 actions à 1 010 € : mêmes 101 000 € levés. Seuil préservé.' },
    ],
    footnotes: [
      { text: jei },
      {
        text: 'Bon réflexe : négocier le prix par action plutôt que le nombre d’actions, et tenir à jour la table de capitalisation.',
      },
    ],
  },
  table(
    'Bpifrance · Taille de l’entreprise',
    'Si l’industriel contrôle la SAS, ses effectifs comptent aussi',
    'La bourse est réservée aux petites entreprises : moins de 50 salariés et CA ou bilan ≤ 10 M€.',
    ['Situation', 'Effectifs retenus', 'Petite entreprise ?'],
    [
      ['**SAS seule**', '8 salariés', 'Oui'],
      ['**Industriel partenaire** · 50 % du capital, sans contrôle', '8 + 50 % de 60 = 38', 'Oui'],
      [
        '**Industriel lié** · nomme la majorité des dirigeants',
        '8 + 60 = 68',
        '**Non : bourse perdue**',
      ],
    ],
    [`${taille} · Chiffres fictifs`],
  ),
  compare(
    'Bpifrance · Deux aides à ne pas confondre',
    'La bourse ne se rembourse pas, le prêt oui',
    [
      [
        'Bourse French Tech Émergence · subvention',
        'Petite entreprise de moins d’un an, projet deeptech. Jusqu’à 50 % des dépenses, plafond 90 000 €. Exemple : 120 000 € de dépenses → 60 000 €.',
      ],
      [
        'Prêt Innovation R&D · dette',
        'PME ou ETI, projet de R&D avant lancement. Montant plafonné à deux fois les fonds propres. Exemple : 80 000 € de fonds propres → 160 000 € au plus.',
      ],
    ],
    [bourse, pret],
    '**Règle commune :** déposer le dossier avant d’engager les dépenses. Aucun montant n’est acquis d’avance.',
  ),
];
