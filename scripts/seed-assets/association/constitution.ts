import { compare, section, table } from './layout';

const pouvoirs = 'C. com., art. L. 227-5, L. 227-6 et L. 227-9';

export const gouvernance = [
  section(
    '01',
    'Statuts et pacte d’associés',
    '**Statuts ou pacte ?** Objectif : savoir quel document fixe une règle, à qui elle s’impose et ce qui se passe en cas de désaccord.',
  ),
  compare(
    'Statuts ou pacte · Deux documents, deux portées',
    'Les statuts s’imposent à tous, le pacte seulement à ses signataires',
    [
      [
        'Statuts · Les règles de la SAS',
        'Pouvoirs du président, décisions des associés, agrément des nouveaux associés. Une vente d’actions faite sans l’agrément prévu est nulle[^2].',
      ],
      [
        'Pacte d’associés · Un contrat entre associés',
        'Il n’oblige que ceux qui l’ont signé[^3]. Acheter des actions ne suffit pas : un nouvel associé doit adhérer au pacte par écrit.',
      ],
    ],
    [pouvoirs, 'C. com., art. L. 227-14 et L. 227-15', 'C. civ., art. 1199'],
    '**Attention :** si les statuts exigent l’accord des deux fondateurs pour vendre le logiciel, mais que Lina, présidente, signe seule, l’acheteur reste protégé[^1].',
  ),
  table(
    'Statuts ou pacte · Mise en situation',
    'Noé refuse de vendre le logiciel : ce qui reste possible',
    'Hypothèse : les statuts exigent l’accord de Lina et de Noé pour vendre le logiciel[^1].',
    ['Décision', 'Qui décide ?', 'Résultat'],
    [
      [
        '**Renouveler l’hébergement**',
        'Lina seule, comme présidente',
        'Possible : l’activité courante continue.',
      ],
      ['**Vendre le logiciel**', 'Lina et Noé ensemble', 'Bloqué tant que Noé refuse.'],
      [
        '**Sortir du blocage**',
        'Les deux fondateurs',
        'Renégocier le prix, puis tenter une médiation. Sans accord, pas de vente.',
      ],
    ],
    [`${pouvoirs} · Cas fictif`],
  ),
];

export const apports = [
  section(
    '02',
    'Les apports au capital',
    '**Quels apports ?** Objectif : distinguer ce qui entre au capital de ce qui entre en banque, et savoir justifier la valeur d’un apport en nature.',
  ),
  table(
    'Apports · Les quatre formes',
    'Quatre façons d’apporter, quatre effets différents',
    'Lina apporte de l’argent, Noé ses droits sur le code. Son travail futur relève d’un accord séparé.',
    ['Apport', 'Donne des actions ?', 'Argent en banque ?', 'Preuve'],
    [
      [
        '**Argent** · numéraire',
        'Oui[^1]',
        'Oui, la somme versée',
        'Certificat du dépositaire des fonds',
      ],
      ['**Bien** · droits sur le code', 'Oui, à la valeur retenue[^1]', 'Non', 'Acte d’apport'],
      [
        '**Travail** · industrie',
        'Actions hors capital, non cessibles[^2]',
        'Non',
        'Statuts : droits à définir',
      ],
      [
        '**Avance** · compte courant',
        'Non : c’est un prêt',
        'Oui, à rembourser',
        'Convention d’avance',
      ],
    ],
    ['C. civ., art. 1843-2 et 1843-3', 'C. com., art. L. 227-1'],
  ),
  {
    blockType: 'stats',
    eyebrow: 'Apports · Le cas de Lina et Noé',
    title: 'Le capital ne dit pas ce qu’il y a en banque',
    lead: '100 actions de 500 € : 60 pour Lina, 40 pour Noé.',
    stats: [
      {
        value: '50 000 €',
        label: 'de capital : 30 000 € versés par Lina et 20 000 € de droits apportés par Noé.',
      },
      { value: '30 000 €', label: 'en banque : seul l’apport de Lina est de l’argent.' },
      {
        value: '20 000 €',
        label: 'valeur des droits de Noé, à justifier avant de lui attribuer 40 actions.',
      },
    ],
    footnotes: [
      {
        text: 'Chiffrage fictif : devis de 25 000 € moins 5 000 € de mise à niveau. Si l’audit chiffre 12 000 € de travaux, la valeur tombe à 13 000 € et le 60/40 est à revoir.',
      },
    ],
  },
  compare(
    'Apports · Commissaire aux apports',
    'Commissaire aux apports : deux plafonds à respecter ensemble',
    [
      [
        'Cas de Noé · 20 000 €',
        'Moins de 30 000 € pour cet apport, et moins de la moitié du capital (25 000 €). Les associés peuvent se dispenser de commissaire, à l’unanimité[^1].',
      ],
      [
        'Variante · 28 000 €',
        'Moins de 30 000 €, mais plus de la moitié du capital de 50 000 €. Le commissaire est **obligatoire**, même si tous sont d’accord[^1].',
      ],
    ],
    ['C. com., art. L. 227-1 et D. 227-3'],
    'Sans commissaire, les associés garantissent ensemble, pendant cinq ans, la valeur retenue envers les tiers[^1].',
  ),
];
