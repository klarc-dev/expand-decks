// S9 — L'entrée du collaborateur (checklist table 1/2). 7 lignes → 160 + 165.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 1 — Embauche',
  title: 'Cadrer avant le premier jour (1/2)',
  surface: 'light',
  tableVariant: 'reference',
  columns: [{ header: 'Action' }, { header: 'Livrable' }, { header: 'Référence' }],
  rows: [
    {
      cells: [
        {
          value: rt(
            'Vérifier les obligations du candidat envers son ancien employeur (non-concurrence, PI, confidentialité)',
          ),
        },
        { value: rt('Note de vérification au dossier RH') },
        {
          value: rt(
            "Risque de responsabilité civile de l'employeur en cas d'embauche d'un salarié lié",
          ),
        },
      ],
    },
    {
      cells: [
        { value: rt('Insérer la clause de missions inventives') },
        { value: rt('Contrat de travail signé') },
        { value: rt('L.611-7 CPI — définit le périmètre des inventions de mission') },
      ],
    },
    {
      cells: [
        { value: rt("Insérer la clause de cession de droits d'auteur") },
        { value: rt('Contrat de travail signé') },
        {
          value: rt(
            'L.131-3 CPI — avec détail des droits, supports, durée, territoire, destination',
          ),
        },
      ],
    },
    {
      cells: [
        { value: rt('Fixer le barème de rémunération supplémentaire') },
        {
          value: rt(
            "Barème défini par l'entreprise — gardé au niveau de la direction, publié, ou annexé au contrat selon le choix de la société",
          ),
        },
        { value: rt("L.611-7, 1° CPI — obligation d'ordre public") },
      ],
    },
  ],
});

export default slide;
