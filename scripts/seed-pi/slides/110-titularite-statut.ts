// S6 — Régime de titularité par statut (table 1/2). Cellules denses → scindé.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Partie II — Les personnes',
  title: 'Le statut du créateur détermine le régime (1/2)',
  surface: 'light',
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
        { value: rt('**Salarié**') },
        {
          value: rt(
            "Invention de mission : titularité employeur, contrepartie = rémunération supplémentaire d'ordre public *(L.611-7, 1° CPI)*. Invention hors mission attribuable : droit d'attribution de l'employeur contre juste prix *(L.611-7, 2° CPI)*",
          ),
        },
        {
          value: rt(
            "Logiciel : dévolution automatique à l'employeur *(L.113-9 CPI)*. Autres œuvres : pas de cession automatique — clause nécessaire *(L.111-1 CPI)*",
          ),
        },
        {
          value: rt(
            "Clause de missions inventives + barème de rémunération + clause de cession de droits d'auteur conforme à L.131-3 CPI",
          ),
        },
      ],
    },
    {
      cells: [
        { value: rt('**Stagiaire / doctorant**') },
        {
          value: rt(
            'Assimilé au salarié uniquement si la structure « réalise de la recherche » *(L.611-7-1 CPI)* — qualification incertaine pour une PME hors recherche',
          ),
        },
        {
          value: rt(
            'Logiciel : assimilation *(L.113-9-1 CPI)*. Autres œuvres : pas de dévolution automatique',
          ),
        },
        { value: rt('Convention de stage/thèse avec clause PI et clause de cession expresses') },
      ],
    },
  ],
});

export default slide;
