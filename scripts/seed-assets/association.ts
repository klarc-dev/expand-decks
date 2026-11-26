import { slugFromTitle } from '../../src/lib/slug';
import { constitution } from './association/constitution';
import { financement } from './association/financement';
import type { Page } from './association/layout';
import { propriete } from './association/propriete';
import { sortie } from './association/sortie';

export const TITLE = 'S’associer dans un projet innovant';
export const slideId = (title: string) => 'association-' + slugFromTitle(title);
export const questions = [
  {
    label: 'Statuts ou pacte ?',
    description:
      'Noé refuse de vendre le logiciel. Qui peut signer et quelle décision reste bloquée ?',
    target: constitution[0]!,
  },
  {
    label: 'Quels apports ?',
    description:
      'Si les droits de Noé valent moins de 20 000 €, combien de titres peut-on encore justifier ?',
    target: constitution[3]!,
  },
  {
    label: 'À qui appartient le prototype ?',
    description:
      'Si le laboratoire refuse la distribution, que peut livrer la SAS avec les droits dont elle dispose ?',
    target: propriete[1]!,
  },
  {
    label: 'JEI et Bpifrance ?',
    description:
      'Une action de plus ou un droit de contrôle : faut-il recalculer la détention, la taille du groupe ou les deux ?',
    target: financement[2]!,
  },
  {
    label: 'Départ ou vente ?',
    description:
      'Qui doit acheter, qui peut refuser et quelles sommes sont payables à la cession ?',
    target: sortie[0]!,
  },
];
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
      'Encadrer les relations pour assurer l’équilibre\n\nLina apporte 30 000 €. Noé apporte le code. Qui pourra décider de vendre le logiciel et à quel prix chacun pourra-t-il sortir ?',
  },
  ...constitution,
  ...propriete,
  ...financement,
  ...sortie,
  {
    blockType: 'agenda',
    eyebrow: 'Questions · Revenir au cas',
    title: 'Les cinq questions à trancher avant de signer',
    lead: 'Choisissez une question pour revenir au cas de Lina et Noé. Quelle hypothèse vous ferait renégocier ?',
    items: questions.map(({ label, description }) => ({ label, description })),
  },
];
