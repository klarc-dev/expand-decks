// S6 — Régime de titularité par statut (table 2/2). En-têtes répétés.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie II — Les personnes',
  title: 'Le statut du créateur détermine le régime (2/2)',
  tableVariant: 'reference',
  columns: [
    { header: 'Statut' },
    { header: 'Régime des inventions' },
    { header: 'Droit d’auteur / logiciel' },
    { header: 'Action requise' },
  ],
  rows: [
    {
      cells: [
        { value: rt('**Dirigeant non-salarié** (mandataire social)') },
        { value: rt("Aucune dévolution — l'invention appartient au dirigeant") },
        { value: rt('Aucune dévolution — le dirigeant est auteur') },
        { value: rt('Cession expresse dans le pacte d’associés ou par acte séparé') },
      ],
    },
    {
      cells: [
        { value: rt('**Prestataire / freelance**') },
        { value: rt('Aucune dévolution sauf stipulation contractuelle') },
        {
          value: rt(
            'Aucune cession automatique — L.131-3 CPI exige un écrit détaillant droits cédés, durée, territoire, destination, supports',
          ),
        },
        { value: rt('Contrat de prestation avec clause de cession complète + confidentialité') },
      ],
    },
  ],
});

export default slide;
