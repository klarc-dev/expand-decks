// S7 — Le socle contractuel (table 1/2). 6 lignes → scindé en 130 + 135.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie II — Les personnes',
  title: 'Les contrats qui font entrer la PI dans l’entreprise (1/2)',
  tableVariant: 'reference',
  columns: [
    { header: 'Relation' },
    { header: 'Document' },
    { header: 'Clauses essentielles' },
    { header: 'Moment de signature' },
  ],
  rows: [
    {
      cells: [
        { value: rt('Salarié') },
        { value: rt('Contrat de travail ou avenant') },
        {
          value: rt(
            "(1) missions inventives (2) barème de rémunération supplémentaire (3) cession de droits d'auteur L.131-3 CPI (4) confidentialité (5) renvoi à la politique PI annexée",
          ),
        },
        { value: rt('Avant prise de poste') },
      ],
    },
    {
      cells: [
        { value: rt('Stagiaire / doctorant') },
        { value: rt('Convention de stage ou contrat doctoral') },
        { value: rt('Clause PI + clause de cession + confidentialité') },
        { value: rt('Avant début de stage/thèse') },
      ],
    },
    {
      cells: [
        { value: rt('Dirigeant non-salarié') },
        { value: rt('Pacte d’associés ou acte de cession') },
        { value: rt('Cession de la PI créée dans le cadre du mandat') },
        { value: rt('Dès la constitution ou la nomination') },
      ],
    },
  ],
});

export default slide;
