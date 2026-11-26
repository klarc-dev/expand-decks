import { compare, workedCase, table } from './layout';

const promesse =
  '[C. civ., art. 1124](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040818)';
const preference =
  '[C. civ., art. 1123](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040825)';
const exclusion =
  '[C. com., art. L. 227-16](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006227180)';

export const sortie = [
  compare(
    'Sortie · Retour avant la levée',
    'Quitter ses fonctions n’oblige pas à céder ses actions',
    [
      [
        'Fin des fonctions · mandat, contrat de travail ou contrat de prestation',
        'Noé reste associé. Identifier le rôle qui prend fin et la preuve du départ qui déclenchera, ou non, une clause sur les titres.',
      ],
      [
        'Promesse de vente · pacte signé et annexes',
        'Lina peut acheter si le départ entre dans la clause et si elle lève l’option. Fixer les motifs, les titres visés et la formule de prix.',
      ],
      [
        'Exclusion · statuts et décision de l’organe compétent',
        'Si les statuts le prévoient, Noé peut être tenu de céder. Écrire qui décide, pour quels motifs, selon quelle procédure et à quel prix.',
      ],
    ],
    [promesse, exclusion],
    'Sans l’industriel : Lina a 60 actions, Noé 40. L’offre d’un tiers sera testée séparément, avec la même répartition.',
  ),
  table(
    'Cas 1 · Départ après deux ans',
    'Lina peut acheter 20 des 40 actions de Noé',
    'Hypothèses négociées : 1 000 € de valeur de marché par action au départ et 40 % de décote si un manquement grave est établi.',
    ['Clause et pièce à lire', 'Effet et décision'],
    [
      [
        '**Reverse vesting** · calendrier annexé à la promesse',
        '40 titres sous option à la création, moins 10 par année entière : **20 encore visés**. Aucun transfert automatique.',
      ],
      [
        '**Good leaver** · justificatif de l’incapacité durable prévue au pacte',
        'Valeur de marché : **20 × 1 000 € = 20 000 €**. Vérifier la méthode et la date d’évaluation.',
      ],
      [
        '**Bad leaver** · dossier établissant le manquement grave prévu au pacte',
        'Décote convenue : **20 × 600 € = 12 000 €**. Si le motif est contesté, suivre la procédure prévue.',
      ],
      [
        '**Exercice** · notification datée et financement de Lina',
        '30 jours après notification pour exercer. Vérifier les fonds, puis conserver les preuves du paiement et du transfert. Si cession : Lina 80, Noé 20 ; sans exercice à temps : 60/40.',
      ],
    ],
    [`Exemple contractuel, pas un barème légal · ${promesse}`],
  ),
  compare(
    'Cas 2 · Offre sur 60 actions',
    'Le tiers offre 60 000 € comptant à Lina',
    [
      [
        'Préemption · acheter en priorité',
        'Noé peut acheter les 60 titres aux conditions notifiées, s’il réunit 60 000 € et exerce dans le délai convenu.',
      ],
      [
        'Sortie conjointe intégrale (tag) · vendre avec Lina',
        'Si Noé exerce, il demande 40 000 € pour ses titres. Si le tiers refuse d’acheter les 100 pour 100 000 €, Lina ne peut pas vendre seule sans violer le pacte.',
      ],
      [
        'Sortie forcée (drag) · obliger à vendre',
        'Impossible : Lina a 60 %, en deçà des 75 % requis, et l’offre ne porte que sur 60 des 100 actions.',
      ],
    ],
    [`Seuil et modalités propres au pacte fictif · ${preference}`],
    'Noé détient toujours 40 actions. À 1 000 € par action, que donne chaque clause si on la teste séparément ?',
  ),
  workedCase(
    'Cas 2 · Contre-offre sur 100 actions',
    '120 000 € au maximum, 80 000 € à la cession',
    [
      [
        'Comparer les montants',
        'Pour Lina : **48 000 € à la cession + 24 000 € au maximum**, contre 60 000 € comptant dans la première offre. Pour Noé : **32 000 € + 16 000 € au maximum**. Le montant maximal n’est pas garanti.',
      ],
      [
        'Écrire l’ordre des clauses',
        'Renotifier l’offre modifiée. Négocier : préemption d’abord, puis tag si le tiers reste acheteur. Dire si un drag valide prime ou non sur ces droits. L’offre vise 100 titres, mais Lina seule reste sous 75 %.',
      ],
      [
        'Encadrer ce que chacun signe',
        'Dans le projet de cession : définir la cible de l’earn-out, l’accès aux chiffres et la date de paiement. Pour Noé, négocier des garanties sans solidarité, plafonnées et limitées dans le temps.',
      ],
    ],
    ['Hypothèses de négociation · mêmes conditions économiques par action'],
    'Nouvelle offre écrite : 80 000 € à la cession, plus 40 000 € au maximum si la cible convenue est atteinte (earn-out).',
  ),
];
