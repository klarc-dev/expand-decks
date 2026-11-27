import { slugFromTitle } from '../../src/lib/slug';
import { apports, gouvernance } from './association/constitution';
import { financement } from './association/financement';
import type { Page } from './association/layout';
import { propriete } from './association/propriete';
import { sortie } from './association/sortie';

export const TITLE = 'S’associer dans un projet innovant';
export const slideId = (title: string) => 'association-' + slugFromTitle(title);

/** One entry per training module. `target` is resolved to a native agenda link at seed time. */
const modules = [
  {
    label: 'Statuts ou pacte ?',
    objective: 'Savoir quel document fixe une règle et à qui elle s’impose.',
    takeaway:
      'Les statuts s’imposent à tous. Le pacte n’oblige que ses signataires : faites-le signer à chaque nouvel associé.',
    target: gouvernance[0]!,
  },
  {
    label: 'Quels apports ?',
    objective: 'Distinguer capital et trésorerie, justifier un apport en nature.',
    takeaway:
      'Le capital n’est pas la trésorerie. Un apport en nature se justifie par une valeur documentée.',
    target: apports[0]!,
  },
  {
    label: 'À qui appartient le prototype ?',
    objective: 'Vérifier que la SAS détient les droits sur ce qu’elle vend.',
    takeaway:
      'On n’apporte que les droits qu’on détient. Une licence de recherche ne permet pas de vendre.',
    target: propriete[0]!,
  },
  {
    label: 'JEI et Bpifrance ?',
    objective: 'Lever des fonds sans perdre la JEI ni les aides.',
    takeaway:
      'Négociez le prix par action, pas le nombre d’actions. Le contrôle d’un investisseur peut fermer l’accès aux aides.',
    target: financement[0]!,
  },
  {
    label: 'Départ ou vente ?',
    objective: 'Prévoir dans le pacte le départ d’un associé et l’arrivée d’un acheteur.',
    takeaway:
      'Partir ne fait pas perdre ses actions. Préemption, tag et drag se négocient avant le premier acheteur.',
    target: sortie[0]!,
  },
];

const agenda = (
  eyebrow: string,
  title: string,
  lead: string,
  description: (module: (typeof modules)[number]) => string,
): Page => ({
  blockType: 'agenda',
  eyebrow,
  title,
  lead,
  items: modules.map((module) => ({
    label: module.label,
    description: description(module),
    target: module.target,
  })),
});

export const pages: Page[] = [
  {
    blockType: 'cover',
    title: TITLE,
    pills: [
      { text: 'Formation · Cycle Klarc 11/11' },
      { text: '1er décembre 2026' },
      { text: '11 h à 12 h · Paris' },
    ],
    subtitle:
      'Encadrer les relations entre associés pour assurer l’équilibre, de la création à la sortie.',
  },
  agenda(
    'Programme',
    'Au programme : cinq questions, un cas',
    'À la fin de cette heure, vous saurez répondre à ces cinq questions pour votre propre projet.',
    (module) => module.objective,
  ),
  {
    blockType: 'cardGrid',
    eyebrow: 'Le cas fil rouge',
    title: 'Lina et Noé créent une SAS pour vendre un logiciel',
    sidebarText:
      'Tous les chiffres sont fictifs. Ils servent à appliquer chaque règle au même cas, du premier jour à la sortie.',
    columns: '2',
    cards: [
      {
        title: 'Lina · 30 000 €',
        description: 'Elle apporte l’argent du lancement et devient présidente.',
      },
      {
        title: 'Noé · le code',
        description: 'Il apporte le prototype qu’il a développé, estimé à 20 000 €.',
      },
      {
        title: 'Le laboratoire · le moteur',
        description:
          'Il fournit le moteur de calcul intégré au logiciel, sous licence de recherche.',
      },
      {
        title: 'L’industriel · 100 000 €',
        description: 'Il propose plus tard d’investir dans la SAS.',
      },
    ],
  },
  ...gouvernance,
  ...apports,
  ...propriete,
  ...financement,
  ...sortie,
  agenda(
    'À retenir',
    'Ce qu’il faut retenir',
    'Cliquez sur une question pour revenir au module. Place à vos questions.',
    (module) => module.takeaway,
  ),
];
