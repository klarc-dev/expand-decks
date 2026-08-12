// S26 — Points particuliers (annuités, déchéance) → statement.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'statement',
  eyebrow: 'Étape 6 — Piloter',
  title: 'La déchéance pour non-paiement est irréversible',
  body: rt(
    "L'échéancier d'annuités doit être géré par un système avec alertes automatiques — la déchéance pour non-paiement est irréversible *(L.612-19 CPI)*, sous réserve du recours en restauration dans les conditions de L.612-16 CPI (6 mois, excuse légitime).",
  ),
});

export default slide;
