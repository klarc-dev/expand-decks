import { cards, table } from './layout';

const jei =
  '[CGI, art. 44 sexies-0 A](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543750/2026-12-01/)';
const taille =
  '[Recommandation 2003/361/CE, ann. art. 2 à 6](https://publications.europa.eu/resource/cellar/6ca8d655-126b-4a42-ada4-e9058fa45155.0007.01/DOC_1)';
const bourse =
  '[Bpifrance · Bourse French Tech Émergence](https://www.bpifrance.fr/catalogue-offres/bourse-french-tech-emergence)';
const pret =
  '[Bpifrance · Prêt Innovation R&D classique](https://www.bpifrance.fr/catalogue-offres/pret-innovation-rd-classique-0)';

export const financement = [
  table(
    'Offre indicative · À vérifier avant signature',
    'Dans cette offre, l’émission apporte 100 000 € à la SAS, la cession 0 €',
    'On suppose la licence commerciale obtenue et la valeur de l’apport de Noé confirmée (20 000 €). Lina a 60 actions, Noé 40, de nominal 500 €.',
    ['Modalité', 'Qui reçoit les 100 000 € ?', 'Effet sur la SAS'],
    [
      [
        '**Émission de 100 actions**',
        'La SAS : 100 × 1 000 €, versés intégralement à la réalisation. 50 000 € de nominal + 50 000 € de prime.',
        'Capital libéré : 50 000 → 100 000 €. Trésorerie : +100 000 € hors frais. Lina / Noé / industriel : 30 / 20 / 50 %.',
      ],
      [
        '**Cession des 100 titres existants**',
        'À 1 000 € par titre, Lina reçoit 60 000 € et Noé 40 000 €, hors frais. Pas de prime d’émission.',
        'Capital inchangé : 50 000 €. Trésorerie : +0 €. L’industriel détient 100 %.',
      ],
      [
        '**Avant de signer**',
        'Vérifier le projet de décision et le bulletin de souscription, ou l’acte de cession.',
        'Retenir l’émission si l’objectif est de financer la SAS. Vérifier que sa licence survit à l’opération.',
      ],
    ],
    ['C. com., art. L. 227-1, L. 227-9, L. 225-128, L. 225-131 et L. 225-144'],
  ),
  table(
    'Jeune entreprise innovante · Cas ordinaire de R&D',
    'La JEI se vérifie sur cinq conditions cumulatives',
    'À la clôture de l’exercice 2026. Le seuil de détention doit être respecté en continu. Le prototype et sa licence ne prouvent pas le ratio de R&D.',
    ['Test', 'Seuil ou règle applicable', 'Pièce à demander'],
    [
      [
        '**Taille**',
        '< 250 salariés en moyenne et (CA < 50 M€ ou bilan < 43 M€).',
        'Comptes, effectif moyen.',
      ],
      ['**Âge**', 'Créée depuis moins de 8 ans.', 'Justificatif de création.'],
      [
        '**Recherche**',
        'Dépenses de recherche éligibles ≥ 20 % des charges déductibles retraitées.',
        'Dossier R&D et rapprochement comptable du ratio.',
      ],
      [
        '**Détention**',
        '≥ 50 % en continu par des détenteurs admis. Lina et Noé comptent en direct. Une holding (4° b) doit aussi remplir les conditions JEI et être détenue à ≥ 50 % par des personnes physiques.',
        'Registre des titres, historique des mouvements, organigramme.',
      ],
      [
        '**Création d’activité**',
        'Ni concentration, ni restructuration, ni extension ou reprise d’une activité préexistante.',
        'Historique de l’activité et de l’apport du code.',
      ],
    ],
    [jei],
  ),
  table(
    'Négociation · Seul le critère de détention JEI est testé',
    'Une action de plus suffit à passer sous les 50 %',
    'Les fondateurs gardent leurs 100 actions à nominal égal. L’industriel souscrit seul et, par hypothèse, ne compte pas comme détenteur admis.',
    ['Offre', 'Encaissement par la SAS', 'Part admise après émission'],
    [
      [
        '**100 titres à 1 000 €**',
        '100 000 € (dont 50 000 € de prime).',
        '**100 / 200 = 50 %** : seuil atteint sans marge.',
      ],
      [
        '**101 titres à 1 000 €**',
        '101 000 € (dont 50 500 € de prime).',
        '**100 / 201 ≈ 49,75 %** : seuil manqué.',
      ],
      [
        '**Contre-offre : 100 à 1 010 €**',
        '101 000 € (dont 51 000 € de prime).',
        '**50 %** : même financement, pas de titre en plus. Faire accepter le nouveau prix.',
      ],
      [
        '**Avant de signer**',
        'Modifier l’offre et la décision d’émission.',
        'Dater la table de capitalisation et prévoir une alerte avant toute nouvelle émission ou cession.',
      ],
    ],
    [jei],
  ),
  table(
    'Taille UE · Même émission de 100 actions',
    'À 50 % du capital, les droits de contrôle changent le résultat',
    'Simulation à l’entrée : 50 % des voix dans les deux cas. Petite entreprise : moins de 50 UTA et CA ou bilan ≤ 10 M€. UTA : unités de travail annuel.',
    ['Cas et droits convenus', 'UTA / CA / bilan', 'Qualification'],
    [
      [
        '**Données de départ**',
        'SAS : 8 / 1 M€ / 0,5 M€.\nIndustriel : 60 / 12 M€ / 8 M€.',
        'Chiffres fictifs. Aucun autre lien à agréger.',
      ],
      [
        '**Partenaire** · Aucun droit de contrôle',
        'SAS + 50 % de l’industriel : **38 / 7 M€ / 4,5 M€**.',
        '**Petite entreprise** dans ce calcul.',
      ],
      [
        '**Lié** · Nomme la majorité de l’organe de direction',
        'SAS + 100 % de l’industriel : **68 / 13 M€ / 8,5 M€**.',
        '**Non petite** : le seuil d’effectif bloque la bourse si cette taille est retenue.',
      ],
      [
        '**Pièces :** statuts, pacte, organigramme',
        'Comptes et effectifs du groupe.',
        'Vérifier le contrôle et recalculer la taille avant de compter sur la bourse.',
      ],
    ],
    [taille],
  ),
  cards(
    'Bpifrance · Deux dossiers à instruire',
    'La bourse finance la maturation deeptech, le prêt se rembourse',
    [
      [
        'Bourse French Tech Émergence',
        '**Subvention.** Petite entreprise immatriculée en France depuis moins d’un an. Projet qualifié deeptech.\n\n**Exemple :** 120 000 € éligibles à 50 % → 60 000 € (plafond du dispositif : 90 000 €).\n\n**Pièces :** budget de maturation et preuve de taille.',
      ],
      [
        'Prêt Innovation R&D classique',
        '**Dette à rembourser.** PME ou ETI (≤ 2 000 ETP), immatriculée en France. R&D avant lancement.\n\n**Exemple :** assiette retenue de 80 000 € → plafond de 160 000 € (≤ 3 M€).\n\n**Pièces :** comptes et plan de remboursement.',
      ],
    ],
    [bourse, pret],
    'L’assiette du prêt (fonds propres et quasi-fonds propres) est une hypothèse indépendante des 100 000 € versés dans l’offre. Aucun montant n’est acquis. Pour les deux dispositifs, déposer avant d’engager les dépenses à financer.',
  ),
];
