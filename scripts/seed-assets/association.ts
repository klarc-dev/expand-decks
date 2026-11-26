import { constitution } from './association/constitution';
import { financement } from './association/financement';
import type { Page } from './association/layout';
import { propriete } from './association/propriete';
import { sortie } from './association/sortie';

export const TITLE = 'S’associer dans un projet innovant';
export const pages: Page[] = [
  {
    blockType: 'cover',
    title: TITLE,
    pills: [
      { text: 'Cycle Klarc · 11/11' },
      { text: '1er décembre 2026' },
      { text: '11 h à 12 h · Paris' },
    ],
    subtitle:
      'Encadrer les relations pour assurer l’équilibre\n\nLina apporte 30 000 €. Noé apporte le code. Qui pourra décider de vendre le logiciel et à quel prix chacun pourra-t-il sortir ?\n\nJoachim Brindeau, avocat · Benjamin Visser, avocat fiscaliste',
  },
  ...constitution,
  ...propriete,
  ...financement,
  ...sortie,
  {
    blockType: 'timeline',
    eyebrow: 'Avant de signer · Questions',
    title: 'Trois rendez-vous pour éprouver votre accord',
    lead: 'À chaque rendez-vous, demandez une pièce et faites jouer un scénario défavorable. Si le résultat vous surprend, renégociez avant la signature.',
    steps: [
      {
        label: 'Constitution',
        description:
          'Relire statuts, pacte et acte d’apport ensemble. Si le laboratoire refuse la distribution, que reçoit encore la SAS et combien de titres rémunèrent ces droits ?',
      },
      {
        label: 'Entrée au capital',
        description:
          'Joindre la table après opération et les droits de vote. Si l’industriel demande une action de plus ou le contrôle, quels critères faut-il recalculer ?',
      },
      {
        label: 'Départ ou vente',
        description:
          'Simuler deux dossiers distincts : départ de Noé, puis offre pour Lina. Noter pour chacun le bénéficiaire, le prix, les fonds disponibles et la date limite.',
      },
    ],
    footer: 'Quelle pièce manque aujourd’hui pour savoir si vous signeriez ?',
  },
];
