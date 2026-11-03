/**
 * Seed du webinaire 10 « Propriété intellectuelle appliquée aux logiciels ».
 *
 *   pnpm deck:seed webinaire-pi-logiciels [--check] [--inspect] [--build]
 *   pnpm prod run scripts/seed-webinaire-pi-logiciels.ts --yes
 *
 * Upsert par (titre, organisation). Les intervenants de la couverture sont
 * conservés depuis la version en base. Fil rouge : la startup Nexa prépare
 * une levée de fonds ; l'investisseur demande la chaîne de droits sur un code
 * écrit par un freelance, un associé parti, deux salariés, avec un package GPL
 * et une part produite avec un assistant IA. Le fil directeur est la chaîne
 * de titularité, de licence et de preuve.
 *
 * Contenu issu du rapport de recherche du 27 octobre 2026
 * (~/Documents/PI_Logiciels_Webinaire10_Research_20261027). Les décisions
 * Cass. 28 janv. 2026, CA Colmar 9 avr. 2025 et CA Paris 14 févr. 2024
 * (Entr'Ouvert / Orange) n'ont été vérifiées que sur des commentaires
 * professionnels ; les notes citent ces commentaires, pas un texte officiel.
 */
import { isDeepStrictEqual, parseArgs } from 'node:util';

import { AI_SLIDE_SCHEMA, SPEC_BY_TYPE } from '../src/blocks/spec';
import { fieldsOf } from '../src/blocks/spec/dsl';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import type { Presentation } from '../src/payload-types';
import { slugFromTitle } from '../src/lib/slug';

const TITLE = 'Propriété intellectuelle appliquée aux logiciels : qui possède votre code ?';
const ORGANISATION = 'Klarc';
const TEMPLATE = resolveDocumentTemplate('presentation');

const LF = 'https://www.legifrance.gouv.fr/codes/article_lc/';
const ref = (label: string, url: string) => `[${label}](${url})`;
const S = {
  L111_1: ref(
    'CPI, art. L. 111-1 · Droit de l’auteur dès la création',
    `${LF}LEGIARTI000042814694`,
  ),
  L113_9: ref('CPI, art. L. 113-9 · Logiciel créé par un salarié', `${LF}LEGIARTI000039279818`),
  L113_9_1: ref(
    'CPI, art. L. 113-9-1 · Logiciel créé par un stagiaire ou un doctorant accueilli',
    `${LF}LEGIARTI000044502241`,
  ),
  L131_1: ref(
    'CPI, art. L. 131-1 · Nullité de la cession globale des œuvres futures',
    `${LF}LEGIARTI000006278955`,
  ),
  L113_5: ref('CPI, art. L. 113-2 et L. 113-5 · Œuvre collective', `${LF}LEGIARTI000006278885`),
  L121_7: ref('CPI, art. L. 121-7 · Droit moral sur le logiciel', `${LF}LEGIARTI000006278899/`),
  L122_6_1: ref(
    'CPI, art. L. 122-6-1 · Correction, copie de sauvegarde, décompilation',
    `${LF}LEGIARTI000044365559`,
  ),
  L131_2: ref('CPI, art. L. 131-2 · Écrit exigé', `${LF}LEGIARTI000032042977`),
  L151_1: ref('C. com., art. L. 151-1 · Secret des affaires', `${LF}LEGIARTI000037266553/`),
  L341_1: ref(
    'CPI, art. L. 341-1 · Droit sui generis du producteur de bases de données',
    `${LF}LEGIARTI000006279245`,
  ),
  L611_10: ref(
    'CPI, art. L. 611-10 · Programmes d’ordinateur en tant que tels',
    `${LF}LEGIARTI000019298703`,
  ),
  DIR2009: ref(
    'Directive 2009/24/CE · Protection juridique des programmes d’ordinateur',
    'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32009L0024',
  ),
  SAS: ref(
    'CJUE, 2 mai 2012, SAS Institute, C-406/10',
    'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62010CJ0406',
  ),
  BSA: ref(
    'CJUE, 22 déc. 2010, BSA, C-393/09',
    'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62009CJ0393',
  ),
  TOP: ref(
    'CJUE, 6 oct. 2021, Top System, C-13/20',
    'https://juricaf.org/arret/CJUE-COURDEJUSTICEDELUNIONEUROPEENNE-20211006-C1320',
  ),
  FREE: ref(
    'CJUE, 18 déc. 2019, IT Development c/ Free Mobile, C-666/18',
    'https://eur-lex.europa.eu/legal-content/FR/SUM/?uri=CELEX:62018CJ0666',
  ),
  TRIDIM: ref(
    'Cass. 1re civ., 15 janv. 2015, n° 13-23.566, Tridim',
    'https://www.courdecassation.fr/decision/6079813a9ba5988459c4a386',
  ),
  C2026: ref(
    'Cass. 1re civ., 28 janv. 2026, n° 24-11.394, Optima Brand Design c/ Maison Villevert',
    'https://www.courdecassation.fr/decision/6979b341cdc6046d47f27159',
  ),
  COLMAR: ref(
    'CA Colmar, 9 avr. 2025, n° 24/01625, Plus Que Pro Digital c/ Qwesta',
    'https://www.courdecassation.fr/decision/67f9f6fb190d73a10ce27db6',
  ),
  ORANGE: ref(
    'CA Paris, pôle 5 ch. 1, 14 févr. 2024, n° 22/18071, Entr’Ouvert c/ Orange',
    'https://www.courdecassation.fr/decision/65cdbcdf2425a70008258563',
  ),
  AGPL: ref('GNU AGPL v3, section 13', 'https://www.gnu.org/licenses/agpl-3.0.txt'),
  GPL3: ref('GNU GPL v3, sections 0, 5 et 6', 'https://www.gnu.org/licenses/gpl-3.0.txt'),
  SSPL: ref(
    'Server Side Public License v1, section 13',
    'https://www.mongodb.com/licensing/server-side-public-license',
  ),
  BSL: ref('Business Source License 1.1', 'https://mariadb.com/bsl11/'),
  LLAMA: ref(
    'Meta Llama 3 Community License, art. 1 et 2',
    'https://github.com/meta-llama/llama3/blob/main/LICENSE',
  ),
  DATAACT: ref(
    'Règlement (UE) 2023/2854, Data Act, chap. VI',
    'https://eur-lex.europa.eu/eli/reg/2023/2854/oj',
  ),
  APP: ref(
    'APP · Dépôt et séquestre de logiciels',
    'https://www.app.asso.fr/nos-solutions/deposer',
  ),
  SOLEAU: ref(
    'INPI · e-Soleau et entiercement',
    'https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/deposer-une-e-soleau-ou-un-entiercement',
  ),
  EIDAS: ref(
    'Règlement eIDAS, art. 41 · Horodatage qualifié',
    'https://eur-lex.europa.eu/legal-content/FR/TXT/PDF/?uri=CELEX:32014R0910',
  ),
  AIACT53: ref(
    'AI Act, art. 53 · Modèles à usage général',
    'https://artificialintelligenceact.eu/article/53/',
  ),
  GETTY: ref(
    'High Court (UK), 4 nov. 2025, Getty Images v Stability AI, EWHC 2863 (Ch)',
    'https://www.judiciary.uk/judgments/getty-images-v-stability-ai/',
  ),
  EPO: ref(
    'OEB, Directives G-II 3.3.1 · Intelligence artificielle',
    'https://www.epo.org/en/legal/guidelines-epc/2025/g_ii_3_3_1.html',
  ),
};

type DraftSlide = {
  blockType: string;
  title: string;
  [field: string]: unknown;
};
type Card = [title: string, description: string];
const pages: DraftSlide[] = [];

function add(slide: DraftSlide, sources: string[] = []) {
  pages.push({
    ...slide,
    ...(sources.length ? { footnotes: sources.map((text) => ({ text })) } : {}),
  });
}

function grid(eyebrow: string, title: string, cards: Card[], sidebarText?: string): DraftSlide {
  return {
    blockType: 'cardGrid',
    eyebrow,
    title,
    columns: cards.length === 3 ? '3' : cards.length === 4 ? '4' : '2',
    ...(sidebarText ? { sidebarText } : {}),
    cards: cards.map(([cardTitle, description], i) => ({
      number: String(i + 1).padStart(2, '0'),
      title: cardTitle,
      description,
    })),
  };
}

function split(
  eyebrow: string,
  title: string,
  intro: string,
  cards: Card[],
  leftFooter: string,
): DraftSlide {
  return {
    blockType: 'twoCols',
    eyebrow,
    title,
    intro,
    leftFooter,
    rightCards: cards.map(([cardTitle, description]) => ({
      title: cardTitle,
      description,
    })),
  };
}

function section(number: string, title: string, subtitle: string): DraftSlide {
  return { blockType: 'section', number, title, subtitle };
}

/* ───────────────────────── Ouverture ───────────────────────── */

add({
  blockType: 'cover',
  pills: [{ text: 'Webinaire' }, { text: 'Logiciel et IA' }, { text: 'Dirigeants et fondateurs' }],
  title: 'Propriété intellectuelle appliquée aux logiciels',
  subtitle:
    'Périmètre de la protection, titularité des droits, code produit avec une IA, droits du client et preuves à réunir.',
});

add(
  grid(
    'Cas fictif · Vous dirigez la startup',
    'Chaîne de droits de Nexa avant une levée de fonds',
    [
      [
        'Produit',
        'Nexa vend une plateforme SaaS. Le premier prototype a été écrit par un freelance, repris par un cofondateur non salarié, puis industrialisé par deux développeurs salariés.',
      ],
      [
        'Dépendances',
        'Le dépôt contient un composant sous licence GPL. Depuis un an, une part importante du code est produite avec un assistant IA en abonnement grand public.',
      ],
      [
        'Question',
        'La data room demande : « Justifier que Nexa est titulaire de l’intégralité des droits sur sa plateforme ». Le cofondateur est parti il y a six mois, sans rien signer.',
      ],
    ],
    '**Nexa peut-elle signer la garantie de titularité ?** La réponse dépend de ce qui est protégé, de qui a créé quoi, et de ce qui a été transféré par écrit. Elle est traitée en conclusion.',
  ),
);

add({
  blockType: 'agenda',
  eyebrow: 'Panorama',
  title: 'Cinq sujets à vérifier avant de signer',
  lead: 'Chaque sujet ajoute une pièce à la chaîne de droits et de preuve.',
  items: [
    {
      label: 'Périmètre de la protection',
      description:
        'Code, documentation, interface : ce que le droit d’auteur couvre et ce qu’il laisse libre.',
    },
    {
      label: 'Titularité des droits',
      description:
        'Freelance, salarié, associé, stagiaire : à qui appartient chaque ligne de code.',
    },
    {
      label: 'Code produit avec une IA',
      description:
        'Code généré, fichiers de poids, données : le régime juridique de chaque élément.',
    },
    {
      label: 'Droits du client',
      description:
        'Licence on-premise, accès SaaS, open source : droits concédés et droits conservés.',
    },
    {
      label: 'Moyens de preuve',
      description:
        'Date certaine, chaîne de droits et méthode en dix étapes avant une levée ou une cession.',
    },
  ],
});

/* ───────────────────────── 01 · Ce qui est protégé ───────────────────────── */

add(
  section(
    '01',
    'Éléments protégés',
    'Le logiciel est protégé par le droit d’auteur dès sa création, sans dépôt. **Pour Nexa** · le droit porte sur le code tel qu’écrit, pas sur l’idée du service ni sur ses fonctionnalités.',
  ),
);

add(
  {
    blockType: 'table',
    eyebrow: '01 · Éléments protégés',
    title: 'Périmètre de la protection du logiciel',
    lead: '**Règle** · la protection naît de la création d’une forme originale[^1]. Elle couvre le programme et son matériel de conception préparatoire[^2].',
    columns: [
      { header: 'Élément du logiciel' },
      { header: 'Droit d’auteur logiciel' },
      { header: 'Autre protection possible' },
    ],
    rows: [
      {
        cells: [
          { value: '**Code source et code objet**' },
          { value: 'Oui, si l’écriture traduit des choix propres à l’auteur.' },
          { value: 'Secret des affaires tant que le code n’est pas divulgué.' },
        ],
      },
      {
        cells: [
          { value: '**Documentation, travaux préparatoires**' },
          {
            value: 'Oui pour le matériel de conception qui conduit au programme.',
          },
          { value: 'Droit d’auteur ordinaire pour les manuels et textes.' },
        ],
      },
      {
        cells: [
          { value: '**Fonctionnalités, algorithmes, langage, formats**' },
          { value: 'Non : ce sont des idées et des principes[^2].' },
          {
            value:
              'Brevet seulement si l’invention produit un effet technique ; secret ; concurrence déloyale.',
          },
        ],
      },
      {
        cells: [
          { value: '**Interface graphique**' },
          {
            value: 'Non en tant que telle : ce n’est pas une forme d’expression du programme.',
          },
          {
            value: 'Droit d’auteur ordinaire si elle est originale, dessin ou modèle, marque.',
          },
        ],
      },
      {
        cells: [
          { value: '**Bases de données**' },
          {
            value:
              'Non pour le contenu ; oui pour la structure si le choix ou la disposition des données est original.',
          },
          {
            value:
              'Droit sui generis du producteur : protection du contenu si l’investissement est substantiel, 15 ans par version[^3].',
          },
        ],
      },
    ],
  },
  [S.L111_1, S.DIR2009, S.L341_1],
);

add(
  grid(
    '01 · Éléments protégés',
    'Recours contre un concurrent qui copie le service sans copier le code',
    [
      [
        'Contrefaçon : non',
        'Réécrire un programme qui offre les mêmes fonctions, après observation, ne contrefait pas le code[^1]. Agir en contrefaçon suppose une reprise du code, de sa structure ou de la documentation.',
      ],
      [
        'Interface et marque',
        'L’interface n’est pas une expression du programme[^2], mais une interface originale reste protégeable comme œuvre ordinaire ou dessin et modèle. Le nom et le logo se défendent par la marque.',
      ],
      [
        'Concurrence déloyale et parasitisme',
        'Action distincte de la contrefaçon : reprise de l’apparence globale, confusion, captation du travail et des investissements. Preuve à constituer : captures datées, chronologie, investissements.',
      ],
      [
        'Brevet et secret',
        'Les programmes « en tant que tels » sont exclus du brevet[^3] ; une invention mise en œuvre par logiciel à effet technique reste brevetable. Le reste relève du secret, à condition de le protéger.',
      ],
    ],
    '**Piège Nexa** · « notre algorithme est protégé » est faux dans la plupart des cas. Face à un clone, les fondements utiles sont la marque, l’interface originale, le parasitisme et le secret, pas le droit d’auteur sur le code.',
  ),
  [S.SAS, S.BSA, S.L611_10],
);

add(
  split(
    '01 · Éléments protégés',
    'Actes autorisés à l’utilisateur légitime',
    '**La règle.** La loi réserve à l’utilisateur autorisé des actes que le contrat ne peut pas lui retirer entièrement : corriger les erreurs, faire une copie de sauvegarde, observer et tester le programme, et décompiler pour obtenir l’interopérabilité[^1].\n\n**La limite.** La CJUE admet la décompilation pour corriger une erreur qui affecte le fonctionnement, mais le résultat ne peut servir à d’autres fins[^2].',
    [
      [
        'Correction des erreurs',
        'Possible par l’utilisateur légitime, sauf stipulation contractuelle qui réserve ce droit à l’éditeur et organise la maintenance.',
      ],
      [
        'Interopérabilité',
        'Décompilation limitée aux parties nécessaires, si les informations ne sont pas déjà accessibles.',
      ],
      ['Copie de sauvegarde', 'Une copie lorsqu’elle est nécessaire pour préserver l’utilisation.'],
    ],
    '**Réflexe Nexa** · le contrat de licence doit organiser la maintenance et la correction. Une clause qui interdit toute décompilation est inopposable dans la mesure de la loi.',
  ),
  [S.L122_6_1, S.TOP],
);

/* ───────────────────────── 02 · Qui est titulaire ───────────────────────── */

add(
  section(
    '02',
    'Titularité des droits',
    '**Fait nouveau** · la data room révèle que le prototype du freelance représente encore 30 % du code en production, et que le cofondateur parti a écrit le moteur de facturation sans être salarié. Aucun des deux n’a signé de cession.',
  ),
);

add(
  split(
    '02 · Titularité des droits',
    'Cession des droits du freelance',
    '**La règle.** L’auteur est titulaire dès la création[^1]. Une société ne détient des droits que par dévolution légale, cession écrite ou œuvre collective. Payer la facture achète la prestation, pas les droits.\n\n**Le formalisme.** Cession écrite, précisant les droits cédés, leur étendue, leur destination, le lieu et la durée. Une clause générale sur « toute la propriété intellectuelle future » est fragile : la cession globale des œuvres futures est nulle.',
    [
      [
        'Cession implicite : incertitudes',
        'En 2026, la Cour de cassation a approuvé une cour d’appel d’avoir déclaré irrecevable l’action de l’agence qui avait implicitement cédé ses droits sur des créations graphiques[^2]. Une cession implicite se plaide dans les deux sens : ne pas compter dessus.',
      ],
      [
        'Preuve par le dépôt Git',
        'La cour d’appel de Colmar a examiné l’historique GitLab d’un logiciel codéveloppé : 76 % du travail pour le prestataire, 21 % pour le client, limité à l’interface. Le prestataire a été jugé titulaire des codes sources[^3].',
      ],
      [
        'Sous-traitant du prestataire',
        'Si l’agence a elle-même fait appel à un indépendant, la chaîne se rompt à ce maillon : exiger la garantie et les cessions amont.',
      ],
    ],
    '**Réflexe Nexa** · faire signer au freelance un acte de cession confirmatif, daté, listant les dépôts et versions déjà livrés, avant l’ouverture de la data room.',
  ),
  [S.L111_1, S.C2026, S.COLMAR],
);

add(
  grid(
    '02 · Titularité des droits',
    'Titularité selon le statut du contributeur',
    [
      [
        'Salarié',
        'Les droits patrimoniaux sur le logiciel créé dans l’exercice des fonctions ou d’après les instructions de l’employeur sont dévolus à l’employeur[^1]. Sans clause, sans prime. Hors fonctions ou hors instructions, le salarié reste titulaire.',
      ],
      [
        'Stagiaire',
        'Depuis l’ordonnance de 2021, la dévolution s’étend aux personnes accueillies par convention dans une structure de recherche, sous conditions cumulatives[^2]. Hors ce cadre, le stagiaire est un auteur ordinaire : cession écrite nécessaire.',
      ],
      [
        'Associé non salarié',
        'Le cofondateur qui code sans contrat de travail est un auteur indépendant. Son départ n’emporte aucun transfert. Solution : cession ou apport en nature dans le pacte, avant la sortie.',
      ],
    ],
    '**Le droit moral reste.** Même après cession, l’auteur de logiciel garde un droit moral réduit : il ne peut s’opposer aux modifications non préjudiciables à son honneur ni exercer un droit de retrait[^3]. Il conserve la paternité.',
  ),
  [S.L113_9, S.L113_9_1, S.L121_7],
);

add(
  grid(
    '02 · Titularité des droits',
    'Code des fondateurs : deux trous fréquents dans la chaîne de droits',
    [
      [
        'Code écrit avant l’immatriculation',
        'Le prototype codé par les fondateurs avant la création de la société leur appartient à titre personnel. L’immatriculation ne transfère rien : il faut un apport en nature ou une cession écrite à la société.',
      ],
      [
        'Président ou directeur général qui code',
        'Le mandataire social n’est pas un salarié : la dévolution légale au profit de l’employeur[^1] ne joue pas pour lui. Le CTO président qui écrit le produit reste titulaire tant qu’il n’a pas cédé.',
      ],
      [
        'Pièces à produire',
        'Acte d’apport ou de cession visant les dépôts et versions existants, pacte d’associés organisant la cession des développements au fil de l’eau (une cession globale des œuvres futures est nulle[^2]), contrat de travail distinct du mandat.',
      ],
    ],
    '**Fait Nexa** · le cofondateur parti avait écrit le moteur de facturation sans contrat de travail. Rien ne l’oblige à céder après son départ : la négociation se fait contre solde, et elle aurait dû être réglée dans le pacte.',
  ),
  [S.L113_9, S.L131_1],
);

add(
  grid(
    '02 · Titularité des droits',
    'Pièces de la data room sur la titularité',
    [
      [
        'Liste des auteurs',
        'Export des contributeurs de chaque dépôt, avec leur statut : salarié, freelance, associé, stagiaire, agence, sous-traitant.',
      ],
      [
        'Titre par contributeur',
        'Contrat de travail et fiche de poste, cession signée, pacte d’associés, convention de stage, ou acte confirmatif pour les trous.',
      ],
      [
        'Nomenclature des composants',
        'SBOM listant chaque dépendance et sa licence, avec les obligations copyleft identifiées et respectées.',
      ],
      [
        'Preuve de version et de date',
        'Dépôt APP, séquestre, horodatage des versions majeures, et politique d’usage des assistants IA.',
      ],
    ],
    '**Règle** · la question n’est pas « avons-nous payé ? » mais « pouvons-nous démontrer une chaîne continue de droits, des auteurs jusqu’à la société, sans composant tiers incompatible ? ». L’œuvre collective[^1] ne remplace pas cette chaîne : ses conditions sont strictes et se plaident.',
  ),
  [S.L113_5],
);

/* ───────────────────────── 03 · Ce que change l’IA ───────────────────────── */

add(
  section(
    '03',
    'Code produit avec une IA',
    '**Fait nouveau** · l’audit technique estime que 40 % du code écrit cette année l’a été avec un assistant IA, sur des comptes personnels. Le CTO affirme : « c’est notre modèle, nous l’avons affiné sur nos données ».',
  ),
);

add(
  split(
    '03 · Code produit avec une IA',
    'Part humaine dans le code produit avec une IA',
    '**La règle.** Le droit d’auteur protège une création intellectuelle propre à son auteur, personne physique[^1] ; une société ne peut pas être auteur[^2]. Une sortie entièrement automatique, sans choix créatifs humains, n’est protégée par personne.\n\n**La conséquence.** Un composant généré sans intervention documentée est librement copiable. Le code assisté, relu, restructuré et intégré par un développeur reste protégeable au titre de sa contribution.',
    [
      [
        'Qui est titulaire du code assisté',
        'Le développeur humain qui apporte la contribution originale ; donc retour aux règles de la partie 02 : salarié, freelance, associé.',
      ],
      [
        'Ce que disent les conditions des fournisseurs',
        'Elles attribuent en général les sorties à l’utilisateur. Un contrat ne crée pas un droit d’auteur que la loi refuse ; il règle seulement les rapports entre les parties.',
      ],
      [
        'Risque en sortie',
        'Un assistant peut reproduire du code sous licence copyleft ou propriétaire. Filtres de correspondance, revue de licence et SBOM incluant les extraits générés.',
      ],
    ],
    '**Réflexe Nexa** · documenter l’apport humain : prompts, revues, commits distinguant le code généré du code écrit. La règle de titularité reste la même ; la preuve porte sur la contribution humaine.',
  ),
  [S.L111_1, S.TRIDIM],
);

add(
  {
    blockType: 'table',
    eyebrow: '03 · Code produit avec une IA',
    title: 'Droits applicables aux éléments d’un système d’IA',
    lead: '**Règle** · quand un dirigeant dit « notre modèle », identifier précisément l’objet concerné.',
    columns: [
      { header: 'Objet' },
      { header: 'Droit d’auteur' },
      { header: 'Régime réellement utile' },
      { header: 'Vigilance' },
    ],
    rows: [
      {
        cells: [
          { value: '**Code du modèle** : entraînement, inférence, API' },
          { value: 'Oui, logiciel classique.' },
          {
            value: 'Titularité comme en 02. Brevet si application technique[^1].',
          },
          { value: 'Vérifier les licences des bibliothèques tierces.' },
        ],
      },
      {
        cells: [
          { value: '**Architecture, hyperparamètres**' },
          { value: 'Non : idées et méthodes.' },
          { value: 'Secret des affaires[^2].' },
          { value: 'L’article scientifique protège le texte, pas la méthode.' },
        ],
      },
      {
        cells: [
          { value: '**Données d’entraînement**' },
          { value: 'Les contenus restent à leurs auteurs.' },
          { value: 'Base de données, fouille avec opt-out, RGPD, contrats.' },
          {
            value: 'Là naissent les contentieux. Fiche de provenance par source.',
          },
        ],
      },
      {
        cells: [
          { value: '**Fichiers de poids, adaptateurs**' },
          {
            value:
              'Très douteux : aucun choix humain dans les valeurs ; ils ne stockent pas les œuvres[^3].',
          },
          {
            value:
              'Secret des affaires, licence, contrôle d’accès. La licence du modèle de base suit les dérivés.',
          },
          {
            value: 'Valeur économique élevée, protection par la PI incertaine.',
          },
        ],
      },
      {
        cells: [
          { value: '**Sorties** : code, textes, images' },
          { value: 'Non si 100 % automatique ; oui pour la part humaine.' },
          { value: 'Conditions du fournisseur, sans garantie.' },
          { value: 'Documenter l’apport humain ; filtrer les reproductions.' },
        ],
      },
    ],
  },
  [S.EPO, S.L151_1, S.GETTY],
);

add(
  grid(
    '03 · Code produit avec une IA',
    'Données, licences et obligations du projet IA',
    [
      [
        'Risque en entrée',
        'Un code source soumis à un assistant grand public sans garantie contractuelle peut perdre la protection du secret des affaires. Vérifier les clauses d’entraînement, le mode entreprise et l’opt-out.',
      ],
      [
        'Obligations du fournisseur de modèle',
        'Depuis le 2 août 2025, le fournisseur d’un modèle à usage général tient une politique de respect du droit d’auteur, respecte l’opt-out de la fouille de textes et publie un résumé des données d’entraînement[^1]. Exemption partielle pour les modèles libres.',
      ],
      [
        'Livrables d’un projet IA',
        'Écrire ligne par ligne : code applicatif, données du client, données tierces, poids résultants, modèle de base, prompts et jeux de tests, savoir-faire. « Le client est propriétaire du modèle » sans ce détail ne protège personne.',
      ],
    ],
    '**Piège Nexa** · aucune juridiction française n’a tranché le statut des poids en droit d’auteur. Le contrat et le secret sont les seuls leviers certains : les poids se licencient, ils ne se cèdent pas comme une œuvre.',
  ),
  [S.AIACT53],
);

/* ───────────────────────── 04 · Ce que le client obtient ───────────────────────── */

add(
  section(
    '04',
    'Droits du client',
    '**Fait nouveau** · un grand compte exige « la propriété du logiciel » dans le contrat SaaS, et l’auditeur open source signale que le composant GPL est modifié et exposé aux utilisateurs via l’API.',
  ),
);

add({
  blockType: 'table',
  eyebrow: '04 · Droits du client',
  title: 'Droits du client selon le mode de fourniture',
  lead: '**Règle** · le modèle commercial change la question juridique. L’on-premise concède une copie ; le SaaS concède un accès.',
  columns: [
    { header: 'Modèle' },
    { header: 'Ce que le client reçoit' },
    { header: 'Ce qui reste à l’éditeur' },
    { header: 'À traiter séparément' },
  ],
  rows: [
    {
      cells: [
        { value: '**On-premise**' },
        {
          value: 'Une licence d’utilisation sur une copie installée chez lui.',
        },
        { value: 'La propriété du code, le code source sauf séquestre.' },
        {
          value: 'Maintenance, correction des erreurs, nombre de copies, audit.',
        },
      ],
    },
    {
      cells: [
        { value: '**SaaS**' },
        { value: 'Un droit d’accès à un service, pour une durée.' },
        { value: 'Le code, l’infrastructure, les paramétrages génériques.' },
        {
          value: 'Données, développements spécifiques, niveaux de service, réversibilité, sortie.',
        },
      ],
    },
    {
      cells: [
        { value: '**Développements spécifiques**' },
        {
          value: 'Ce que le contrat dit : licence élargie, cession limitée au spécifique, ou rien.',
        },
        {
          value: 'Le socle et tout ce qui est réutilisable, sauf cession écrite.',
        },
        {
          value:
            'Périmètre précis du spécifique, prix distinct, droit de réutiliser le savoir-faire.',
        },
      ],
    },
    {
      cells: [
        { value: '**Marque blanche et revente**' },
        {
          value: 'Un droit de sous-licencier ou de distribuer sous sa marque.',
        },
        { value: 'Le code, la marque de l’éditeur sur le produit d’origine.' },
        {
          value: 'Territoire, exclusivité, redevances, responsabilité envers les clients finaux.',
        },
      ],
    },
  ],
});

add(
  split(
    '04 · Droits du client',
    'Réversibilité et cession du code',
    '**La règle.** Depuis le 12 septembre 2025, le fournisseur de services de traitement de données doit permettre le changement : préavis de deux mois au plus, transition de trente jours, prolongeable en cas d’impossibilité technique motivée, et au moins trente jours pour récupérer les données exportables[^1].\n\n**La limite.** Le règlement porte sur les données et les actifs numériques du client. Il ne transforme pas un abonnement en cession du code source.',
    [
      [
        'Frais de changement',
        'Réduits pendant la période transitoire, puis supprimés à compter du 12 janvier 2027 pour le changement de fournisseur[^1].',
      ],
      [
        'Contrats antérieurs',
        'La plupart des règles s’appliquent aussi aux contrats conclus avant septembre 2025.',
      ],
      [
        'Ce que le contrat doit encore dire',
        'Format des exports, sort des paramétrages et des spécifiques, assistance à la migration, continuité pendant la transition.',
      ],
    ],
    '**Réflexe Nexa** · répondre au grand compte par une licence d’accès, une clause de réversibilité conforme au Data Act, et une cession limitée aux seuls développements spécifiques payés à part.',
  ),
  [S.DATAACT],
);

add(
  grid(
    '04 · Droits du client',
    'Obligations open source selon la licence et le mode de fourniture',
    [
      [
        'Permissives',
        'MIT, BSD, Apache 2.0 : usage propriétaire possible. À la distribution, conserver avis et licence ; Apache exige aussi le signalement des fichiers modifiés et le fichier NOTICE, et encadre les brevets.',
      ],
      [
        'Copyleft limité',
        'LGPL : à la livraison d’un logiciel lié, permettre le remplacement de la bibliothèque et fournir les éléments requis. MPL : publier le source des fichiers couverts distribués, pas des fichiers indépendants.',
      ],
      [
        'Copyleft fort',
        'GPL : si l’ensemble distribué dérive du code GPL, il passe sous GPL avec son source. Un service en ligne sans copie transmise n’est pas une distribution[^1] : le SaaS pur n’active pas l’obligation.',
      ],
      [
        'Copyleft réseau',
        'AGPL : si vous modifiez le composant et l’exposez en ligne, offrir à tout utilisateur distant le source correspondant[^2]. Un composant AGPL non modifié n’impose pas la publication de votre code.',
      ],
    ],
    '**La sanction** · le non-respect d’une licence libre expose à la contrefaçon, pas seulement au contrat. La cour d’appel de Paris a condamné Orange pour violation de la GPL v2 : 500 000 euros de pertes, 150 000 euros de préjudice moral, 150 000 euros de bénéfices[^3].',
  ),
  [S.GPL3, S.AGPL, S.ORANGE],
);

add(
  grid(
    '04 · Droits du client',
    'Licences « source available » et « open weights » : pas open source',
    [
      [
        'BSL (MariaDB, Terraform)',
        'Usage en production interdit par défaut, sauf autorisation complémentaire propre au logiciel, souvent limitée aux offres qui ne concurrencent pas l’éditeur. Bascule vers une licence libre après quatre ans[^1].',
      ],
      [
        'SSPL (MongoDB) et Elastic 2.0',
        'SSPL : fournir le logiciel comme service, même non modifié, oblige à publier le code de tout le service, bien au delà de l’AGPL[^2]. Elastic 2.0 : interdiction de l’offrir en service hébergé ou géré.',
      ],
      [
        'Llama 3 et Gemma',
        'Llama 3 : mention « Built with Meta Llama 3 », politique d’usage acceptable, interdiction d’entraîner un modèle concurrent avec ses sorties, licence spéciale au delà de 700 M d’utilisateurs[^3]. Gemma 1 à 3 : usages interdits à répercuter dans vos contrats.',
      ],
    ],
    '**Réflexe Nexa** · le mot « open » sur la page d’accueil ne dit rien du droit d’usage. Pour chaque composant et chaque modèle de la SBOM : version exacte de la licence, usage en production autorisé, hébergement en service autorisé, obligations de mention.',
  ),
  [S.BSL, S.SSPL, S.LLAMA],
);

/* ───────────────────────── 05 · Comment le prouver ───────────────────────── */

add(
  section(
    '05',
    'Moyens de preuve',
    '**Fait nouveau** · un ancien prestataire affirme avoir écrit le moteur de recherche de Nexa avant la version déposée par les salariés. Nexa n’a aucune version datée antérieure à son serveur Git, administré par ce même prestataire.',
  ),
);

add(
  grid(
    '05 · Moyens de preuve',
    'Dispositif de preuve recommandé pour un éditeur de logiciel',
    [
      [
        'Socle : Git signé chez un tiers',
        'Commits signés, dépôt hébergé chez un tiers que le prestataire n’administre pas, archives de chaque version taguée. C’est la preuve quotidienne, gratuite, de qui a écrit quoi et quand.',
      ],
      [
        'Versions majeures : dépôt APP',
        'Le code source est conservé sous scellés avec attestation de dépôt ; le séquestre organise la remise au client si l’éditeur défaille[^1]. Un dépôt par version majeure suffit.',
      ],
      [
        'Horodatage qualifié des archives',
        'L’horodatage électronique qualifié bénéficie d’une présomption d’exactitude de la date et d’intégrité[^3]. À appliquer au hash de chaque archive de version.',
      ],
      [
        'Peu adaptés au code',
        'e-Soleau INPI : date certaine sur un contenu limité, utile pour un cahier des charges, pas pour un dépôt entier[^2]. Ancrage blockchain : preuve de date sans présomption légale, laissée à l’appréciation du juge.',
      ],
    ],
    '**Règle** · aucun dépôt ne crée le droit ; il fixe la date et le contenu. Par version majeure : hash, code source, documentation, SBOM, liste des contributeurs, part du code produite avec un assistant.',
  ),
  [S.APP, S.SOLEAU, S.EIDAS],
);

add({
  blockType: 'timeline',
  eyebrow: '05 · Moyens de preuve',
  title: 'Dix vérifications avant une levée, un audit ou une cession',
  steps: [
    {
      label: '1 · Cartographier',
      description: 'Code, documentation, interface, bases, modèles et poids, marques, API.',
    },
    {
      label: '2 et 3 · Lister et classer',
      description: 'Contributeurs de chaque dépôt : salarié, prestataire, associé, stagiaire.',
    },
    {
      label: '4 et 5 · Rattacher et corriger',
      description: 'Un titre par contribution ; faire signer ce qui manque.',
    },
    {
      label: '6 et 7 · Composants et politiques',
      description: 'SBOM avec licences ; politiques open source et assistants IA.',
    },
    {
      label: '8 et 9 · Protéger et dater',
      description: 'NDA, accès minimaux ; horodater et séquestrer chaque version.',
    },
    {
      label: '10 · Contrats clients',
      description: 'Licence ou accès, données, spécifiques, réversibilité, sortie.',
    },
  ],
  footer:
    'Auteurs identifiés, droits transférés, composants compatibles, version datée, contrat distinguant code, données et accès.',
});

add(
  grid(
    'Cas Nexa · Conclusion',
    'Garantie de titularité et plan d’action sur trente jours',
    [
      [
        'Semaine 1',
        'Exporter les contributeurs des dépôts. Faire signer au freelance un acte de cession confirmatif listant versions et dépôts. Ouvrir la négociation avec le cofondateur parti : cession contre solde.',
      ],
      [
        'Semaine 2',
        'Produire la SBOM. Traiter le composant GPL : remplacer, isoler, ou publier le code correspondant. Vérifier que les contrats de travail des salariés décrivent les fonctions de développement.',
      ],
      [
        'Semaine 3',
        'Basculer les assistants IA en mode entreprise sans entraînement. Marquer le code généré, documenter les revues humaines. Lister ce que recouvre vraiment « notre modèle ».',
      ],
      [
        'Semaine 4',
        'Déposer la version courante à l’APP avec hash, SBOM et liste des auteurs. Rédiger la garantie de titularité avec des exceptions déclarées plutôt qu’une affirmation générale.',
      ],
    ],
    '**Conditions d’une garantie sans réserve** · une cession de chaque contributeur externe, des contrats de travail couvrant les fonctions, une SBOM sans copyleft non traité, et une version datée. Nexa n’en a aucun aujourd’hui ; elle peut les avoir en trente jours.',
  ),
);

add({
  blockType: 'cta',
  eyebrow: 'Merci',
  title: 'Merci',
  subtitle:
    'Nous vous offrons un premier échange de 30 minutes pour faire le point sur la chaîne de droits de votre logiciel.',
  primaryAction: 'Prendre rendez-vous',
  primaryActionUrl: '{org.bookingUrl}',
  footerNote:
    'Panorama principalement français et européen · Cas fictif · Les situations individuelles appellent une analyse de leur dossier',
});

/* ───────────────────────── Validation et écriture ───────────────────────── */

function validatedSlides() {
  const ids = new Set<string>();
  return pages.map((slide, index) => {
    const parsed = AI_SLIDE_SCHEMA.safeParse(slide);
    if (!parsed.success) {
      throw new Error(
        `Slide ${index + 1} « ${slide.title} » : ${JSON.stringify(parsed.error.issues)}`,
      );
    }
    const id = `webinaire-pi-logiciels-${slugFromTitle(slide.title)}`;
    if (ids.has(id)) throw new Error(`Identifiant de diapositive en doublon : ${id}`);
    ids.add(id);
    const spec = SPEC_BY_TYPE.get(slide.blockType)!;
    const defaults = Object.fromEntries(
      fieldsOf(spec)
        .filter((field) => field.factory !== 'preview')
        .map((field) => [
          field.name,
          field.payload?.defaultValue ?? (field.payload?.type === 'array' ? [] : null),
        ]),
    );
    return {
      ...defaults,
      ...parsed.data,
      blockType: slide.blockType,
      layoutContent: null,
      id,
    };
  });
}

function comparableContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparableContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, child]) => key !== 'id' && key !== 'blockName' && child != null)
        .map(([key, child]) => [key, comparableContent(child)]),
    );
  }
  return value;
}

const { values } = parseArgs({
  // run-seed.ts forwards the seed name as a positional argument.
  allowPositionals: true,
  options: {
    check: { type: 'boolean', default: false },
    inspect: { type: 'boolean', default: false },
    build: { type: 'boolean', default: false },
  },
});
const authored = validatedSlides();
if (values.check) {
  console.log(
    JSON.stringify(
      {
        title: TITLE,
        slides: authored.length,
        schema: 'valid',
        layouts: [...new Set(authored.map((slide) => slide.blockType))],
      },
      null,
      2,
    ),
  );
} else {
  process.env.PAYLOAD_DB_PUSH = '0';
  process.env.MASTRA_DISABLE_INIT = '1';
  const [{ getPayload }, { default: config }, { closeScriptPayload }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('./lib/payloadScript'),
  ]);
  const payload = await getPayload({
    config,
    disableOnInit: true,
    cron: false,
  });
  try {
    const organisations = await payload.find({
      collection: 'organisations',
      where: { name: { equals: ORGANISATION } },
      limit: 2,
      depth: 0,
      overrideAccess: true,
    });
    if (organisations.totalDocs !== 1)
      throw new Error(`Organisation ${ORGANISATION} introuvable ou ambiguë`);
    const organisation = organisations.docs[0]!;
    const existing = await payload.find({
      collection: 'presentations',
      where: {
        and: [{ title: { equals: TITLE } }, { organisation: { equals: organisation.id } }],
      },
      limit: 2,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.totalDocs > 1)
      throw new Error('Plusieurs présentations portent ce titre dans cette organisation');
    let presentation = existing.docs[0];
    if (!values.inspect) {
      // Keep the cover speakers configured in the admin: they are not authored here.
      const previousCover = presentation?.slides?.find((slide) => slide.blockType === 'cover') as
        | { intervenants?: unknown }
        | undefined;
      const { convertSlidesMarkdownToLexical } = await import('../src/lib/richTextWrite');
      const richSlides = await convertSlidesMarkdownToLexical(structuredClone(authored), payload);
      const cover = richSlides.find((slide) => slide.blockType === 'cover') as
        | { intervenants?: unknown }
        | undefined;
      if (cover && previousCover?.intervenants) cover.intervenants = previousCover.intervenants;
      parseDocumentRenderPages(TEMPLATE, richSlides);
      const data = {
        title: TITLE,
        slug: slugFromTitle(TITLE),
        organisation: organisation.id,
        documentTemplate: 'presentation' as const,
        language: 'fr' as const,
        agentBrief:
          'Webinaire panorama en droit français et européen pour dirigeants et fondateurs de startups. Cinq parties : les éléments protégés, la titularité des droits, le code produit avec une IA, les droits du client, les moyens de preuve. Cas fictif startup Nexa en levée de fonds, avec un fait nouveau à chaque section. Chaque slide porte un sujet juridique explicite et énonce une règle, un risque et une action. Sources Légifrance, EUR-Lex et commentaires professionnels vérifiés le 27 octobre 2026.',
        slides: richSlides as Presentation['slides'],
      };
      presentation = presentation
        ? await payload.update({
            collection: 'presentations',
            id: presentation.id,
            data,
            context: { skipBuildQueue: true },
            overrideAccess: true,
            depth: 0,
          })
        : await payload.create({
            collection: 'presentations',
            data,
            context: { skipBuildQueue: true },
            overrideAccess: true,
            depth: 0,
          });
      const saved = await payload.findByID({
        collection: 'presentations',
        id: presentation.id,
        depth: 0,
        overrideAccess: true,
      });
      if (
        saved.organisation !== organisation.id ||
        saved.slides?.length !== pages.length ||
        saved.slides.some(
          (slide, index) => !('title' in slide) || slide.title !== pages[index]?.title,
        )
      ) {
        throw new Error('La relecture Payload ne correspond pas aux diapositives enregistrées');
      }
      if (
        !isDeepStrictEqual(
          comparableContent(parseDocumentRenderPages(TEMPLATE, saved.slides)),
          comparableContent(parseDocumentRenderPages(TEMPLATE, richSlides)),
        )
      ) {
        throw new Error('Le contenu relu contient des champs absents ou différents de la source');
      }
      console.log(
        `Présentation enregistrée et relue intégralement : ${presentation.id} (${pages.length} slides)`,
      );
      if (values.build) {
        const { runBuildSlidesTask } = await import('../src/jobs/buildSlidesRunner');
        const result = await runBuildSlidesTask({
          input: { presentationId: String(presentation.id) },
          req: { payload },
        });
        if (!result.output.success)
          throw new Error(`Échec du build : ${JSON.stringify(result.output)}`);
      }
    }
    if (!presentation) throw new Error('La présentation n’existe pas encore');
    const result = await payload.findByID({
      collection: 'presentations',
      id: presentation.id,
      depth: 1,
      overrideAccess: true,
    });
    console.log(
      JSON.stringify(
        {
          id: result.id,
          title: result.title,
          slug: result.slug,
          slides: result.slides?.length,
          lastBuildStatus: result.lastBuildStatus,
          lastBuildError: result.lastBuildError,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closeScriptPayload(payload);
  }
  process.exit(process.exitCode ?? 0);
}
