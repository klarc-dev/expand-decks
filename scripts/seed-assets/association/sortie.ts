import { compare, section, table } from './layout';

const promesse =
  '[C. civ., art. 1124](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040818)';
const preference =
  '[C. civ., art. 1123](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040825)';
const exclusion =
  '[C. com., art. L. 227-16](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006227180)';

export const sortie = [
  section(
    '05',
    'Le départ et la vente',
    '**Départ ou vente ?** Objectif : prévoir dès le pacte ce qui se passe si un associé part ou si un acheteur se présente.',
  ),
  compare(
    'Départ · Trois mécanismes',
    'Quitter ses fonctions n’oblige pas à vendre ses actions',
    [
      [
        'Fin des fonctions',
        'Noé arrête de travailler pour la SAS. Sans clause, il **reste associé** avec ses 40 actions.',
      ],
      [
        'Promesse de vente · pacte',
        'Noé s’engage à l’avance à vendre si un motif prévu survient. Lina choisit d’acheter ou non[^1].',
      ],
      [
        'Exclusion · statuts',
        'Les statuts peuvent obliger Noé à céder, avec un motif, une procédure et un prix fixés à l’avance[^2].',
      ],
    ],
    [promesse, exclusion],
    'Retour au point de départ : Lina 60 actions, Noé 40, sans l’industriel.',
  ),
  table(
    'Départ · Mise en situation',
    'Noé part après deux ans : combien d’actions et à quel prix',
    'Clauses fictives : 10 actions libérées par année de présence, valeur de marché de 1 000 € par action.',
    ['Clause', 'Calcul', 'Résultat'],
    [
      [
        '**Reverse vesting** · acquisition progressive',
        '40 actions − 2 ans × 10 = 20 actions',
        'Lina peut racheter **20 actions**',
      ],
      ['**Good leaver** · départ pour motif légitime', '20 × 1 000 €', '**20 000 €**'],
      ['**Bad leaver** · faute grave, décote de 40 %', '20 × 600 €', '**12 000 €**'],
    ],
    [`Exemple contractuel, pas un barème légal · ${promesse}`],
  ),
  compare(
    'Vente · Trois clauses du pacte',
    'Un tiers offre 60 000 € à Lina pour ses 60 actions',
    [
      [
        'Préemption · acheter en priorité',
        'Noé peut acheter les 60 actions au même prix, s’il trouve 60 000 € dans le délai prévu[^1].',
      ],
      [
        'Sortie conjointe (tag along) · partir ensemble',
        'Noé peut exiger que le tiers rachète aussi ses 40 actions, au même prix. Sinon, Lina ne peut pas vendre.',
      ],
      [
        'Sortie forcée (drag along) · obliger à vendre',
        'Impossible ici : il faut 75 % des actions pour forcer Noé, Lina n’en a que 60 %.',
      ],
    ],
    [`Seuils propres au pacte fictif · ${preference}`],
  ),
  compare(
    'Vente · Contre-offre',
    'Le tiers rachète tout : 80 000 € tout de suite, 40 000 € plus tard',
    [
      [
        'Ce que reçoit chacun',
        '**Lina :** 48 000 € à la vente, jusqu’à 24 000 € ensuite. **Noé :** 32 000 €, jusqu’à 16 000 € ensuite.',
      ],
      [
        'Le complément de prix (earn-out)',
        'Il n’est versé que si l’objectif convenu est atteint. Écrire l’objectif, l’accès aux chiffres et la date de paiement.',
      ],
    ],
    ['Hypothèses de négociation · même prix par action pour tous'],
    '**À comparer :** 60 000 € comptant pour Lina dans la première offre, contre 48 000 € certains ici.',
  ),
];
