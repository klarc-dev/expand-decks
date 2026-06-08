/**
 * Seed: "Optimiser et sécuriser ses contrats R&D" — Bloom Formation, 12/12/2025.
 *
 * Idempotent: upserts the presentation by slug `partenariats-r-d-bloom`. Verbatim
 * text from the source PDF (extraction via mineru); the orthographic quirks of
 * the source ("Certains notions" slide 7, missing accent on "défintions" 4.3.2)
 * are preserved on purpose.
 *
 * Run from the slides/ repo root with the prod-or-dev DATABASE_URL exported:
 *   pnpm dlx tsx scripts/seed-partenariats-rd.ts
 *   pnpm dlx tsx scripts/seed-partenariats-rd.ts --force   # required if DATABASE_URL contains "prod"
 *
 * Photos are intentionally NOT seeded; upload them via the admin UI then add
 * the resulting media id manually to the relevant slide block. The
 * Cover/Section/TwoCols extension supports `image` + `imagePosition`.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPayload } from 'payload';
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical';
import config from '@payload-config';
import type { Presentation } from '../src/payload-types';

const SLUG = 'partenariats-r-d-bloom';
const TITLE = 'Optimiser et sécuriser ses contrats R&D';

const __filename = fileURLToPath(import.meta.url);
const ASSETS_DIR = join(dirname(__filename), 'seed-assets', 'partenariats-rd');

// Images extracted from the source PDF via mineru. Each entry uploads once
// (idempotent by filename) and the resulting media ID is patched into the
// slide blocks below.
const ASSETS = [
  {
    key: 'handshake',
    filename: 'sommaire-handshake.jpg',
    alt: "Poignée de main entre deux personnes lors d'une discussion contractuelle",
  },
  {
    key: 'presenter',
    filename: 'exemple-rd-presenter.jpg',
    alt: "Présentateur Klarc devant un écran montrant un exemple de projet R&D",
  },
  {
    key: 'keyboard',
    filename: 'securiser-optimiser-keyboard.jpg',
    alt: "Mains tapant sur un clavier d'ordinateur, avec un carnet et un stylo posés à côté",
  },
] as const;

type AssetKey = (typeof ASSETS)[number]['key'];

// Production safety: refuse to seed prod without --force.
if (
  process.env.DATABASE_URL?.toLowerCase().includes('prod') &&
  !process.argv.includes('--force')
) {
  console.error(
    'Refusing to seed: DATABASE_URL appears to point to production. Re-run with --force to override.',
  );
  process.exit(1);
}

type Slide = NonNullable<Presentation['slides']>[number];
type RichTextConverter = (markdown: string) => never;

function buildSlides(media: Record<AssetKey, number>, rt: RichTextConverter): Slide[] {
  return [
  // PDF page 1 — cover
  {
    blockType: 'cover',
    eyebrow: 'BLOOM FORMATION',
    title: 'Optimiser et sécuriser ses contrats R&D',
    footerLeft: rt('Joachim BRINDEAU'),
    footerRight: rt('Document actualisé le 1er décembre 2025.'),
    surface: 'light',
  },

  // PDF page 2 — sommaire (image-right, photo poignée de main)
  {
    blockType: 'twoCols',
    title: 'Sommaire',
    intro: rt(`1. Introduction — 3
2. Notions indispensables — 7
3. Sécurisation des échanges — 10
4. Cadrage du projet — 15
5. Négociation d'un contrat — 24
6. Points particuliers — 30
7. Questions & réponses — 37`),
    image: media.handshake,
    imagePosition: 'right',
  },

  // PDF page 3 — section divider Introduction
  {
    blockType: 'section',
    title: 'Introduction',
    subtitle: rt(
      "Un **projet R&D** est une initiative structurée caractérisée par son incertitude scientifique ou technique, et son potentiel à générer de la valeur à travers des avancées dans un domaine spécifique.",
    ),
    surface: 'dark',
  },

  // PDF page 4 — Exemple de projets R&D (image-right, photo presenter)
  {
    blockType: 'twoCols',
    title: 'Exemple de projets R&D',
    intro: rt(`**Bibliothèque d'actifs** — Développement en interne d'une bibliothèque de molécules.

**10 candidats** — Screening de la bibliothèque par une université.

**1 candidat (PoC)** — Confirmation du candidat grâce au modèle d'une CRO.

**Composition (PoF)** — Formulation d'une composition en interne.

**Produit commercialisable** — Industrialisation en collaboration avec un partenaire industriel.`),
    image: media.presenter,
    imagePosition: 'right',
  },

  // PDF page 5 — Chronologie d'un partenariat (process flow → markdown)
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Chronologie d'un partenariat

**Étape préalable :** Horodater ses connaissances propres.

**Phases principales :**

1. Sécurisation des échanges (d'informations · de matériels)
2. Cadrage technique
3. Négociation
4. Contractualisation
5. Exécution du projet R&D
6. Exploitation des livrables
7. Révision du projet → Amélioration continue

**Branches d'arrêt :** Négociation → Abandon des négociations · Abandon du projet`,
  },

  // PDF page 6 — Sécuriser et Optimiser
  {
    blockType: 'twoCols',
    title: 'Sécuriser et optimiser',
    intro: rt(`**Sécuriser**

- Apports des parties
- Confidentialité
- Propriété industrielle
  - Propriété
  - Liberté d'exploitation
  - Exclusivité d'exploitation
- Concurrence
- Aspects financiers
- Prise de décision`),
    rightCards: [
      {
        title: 'Optimisation opérationnelle',
        description: rt(`- Accélérer la négociation
- Fluidifier le déroulement du projet
- Prévoir le changement et l'échec`),
      },
      {
        title: 'Optimisation financière',
        description: rt(`- Financements publics
- Aspects fiscaux`),
      },
    ],
  },

  // PDF page 7 — section divider Notions indispensables
  // NB: PDF verbatim — "Certains notions" (faute conservée).
  {
    blockType: 'section',
    title: 'Notions indispensables',
    subtitle: rt(
      "Certains notions indispensables permettent d'**encadrer la gestion de la propriété intellectuelle** : différents types de droits, définitions intégrant les notions de pré-existence ou de propriété, modalités d'exploitation, etc.",
    ),
    surface: 'dark',
  },

  // PDF page 8 — Notions à maîtriser (4 sections de définitions → markdown)
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Notions à maîtriser

<div class="text-sm opacity-60 mb-6">Notions indispensables</div>

**Connaissances Propres**

Actifs de propriété intellectuelle (cf. slide précédente) qui sont :

- Déjà la propriété d'une partie à la signature avec le client ; ou
- Déjà sous le contrôle d'une partie à la signature avec le client ; ou
- Développé indépendamment par une partie au cours du contrat (e.g. autre projet, initiative propre, etc.).

**Connaissances Nouvelles**

Actifs de propriété intellectuelle (cf. slide précédente) qui sont générés dans le cadre du projet.

**Dépendance**

Sauf stipulation contraire, la propriété des Connaissances Nouvelles n'entraîne pas le droit d'exploiter les Connaissances Propres nécessaires à l'exploitation des Connaissances Nouvelles.

**Droits à prendre en compte**

- Droit de propriété (en totalité ou quote-part)
- Droit d'exploitation (gratuit ou onéreux, exclusif ou non, périmètre géographique / sectoriel / temporel)
- Désignation comme inventeur (impact la notoriété et la rémunération des salariés)`,
  },

  // PDF page 9 — Droits de propriété intellectuelle (table)
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Droits de propriété intellectuelle

<div class="text-sm opacity-60 mb-6">Notions indispensables</div>

| Type | Critères |
|------|----------|
| **Secret des affaires** | Pas "évident" + Secret + valeur commerciale (L151-1 CC). Protégeable si des moyens ont été mis en œuvre pour protéger ce secret. Équivalent juridique du "savoir-faire". |
| **Inventions** | Nouveauté + Caractère inventif + Application industrielle. Protégeable à partir de la date du dépôt de la demande de brevet ou du certificat d'utilité (avant cela : secret des affaires). |
| **Droits d'auteurs** | Originalité. Protégé dès sa création sans formalités. Ne protège pas les informations techniques contenues dans le document (cas du rapport, poster, etc.). |
| **Droit sui generis des bases de données** | Prise d'initiative + risque des investissements (L341-1 CPI). Protège le contenu de la base de données. Se cumule avec le droit d'auteurs. |
| **Autres droits selon prestation** | Selon les prestations, une partie peut être amenée à générer d'autres actifs PI. Exemples : topographies de semi-conducteurs, COV, dessins & modèles, marques, noms de domaine… |`,
  },

  // PDF page 10 — section divider Sécurisation des échanges
  {
    blockType: 'section',
    title: 'Sécurisation des échanges',
    subtitle: rt(
      "La **sécurisation des échanges** est un préalable indispensable à toute divulgation d'information confidentielle et à tout envoi de matériel propriétaire.",
    ),
    surface: 'dark',
  },

  // PDF page 11 — Mettre en place un accord de confidentialité — Pourquoi ?
  {
    blockType: 'twoCols',
    eyebrow: 'Sécurisation des échanges',
    title: 'Mettre en place un accord de confidentialité',
    intro: rt(`**Pourquoi ?**

Sans contrat, *les informations obtenues dans le cadre des négociations sont confidentielles* mais risque de litige sur :

- L'identification de l'information communiquée
- Le caractère confidentiel de l'information communiquée
- La durée de l'obligation
- Le droit d'utilisation de l'information communiquée (y compris le droit de breveter)
- Etc.`),
  },

  // PDF page 12 — Mettre en place un accord de confidentialité — Que définir ?
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Mettre en place un accord de confidentialité

<div class="text-sm opacity-60 mb-6">Sécurisation des échanges</div>

**Que définir ?**

1. **Objet des discussions**
   - **OUI** "Discuter de la réalisation d'essais à évaluer la performance d'un nouveau modèle d'étude du microbiome cutané, confidentiel et développé par la société A grâce à sa plateforme propriétaire".
   - **NON** "Discuter de la faisabilité d'un projet de recherche entre la société A et l'université B".
2. **Deux périodes :**
   - a. La période d'échange d'informations confidentielles (en général un an). Possibilité de fixer une date de départ rétroactive.
   - b. La période de secret (en général 5 à 10 ans) à compter de la fin de la période d'échange, ou jusqu'à ce que l'information tombe dans le champ de l'une des exceptions au contrat (e.g. divulgation publique sans défaillance).
3. **Divulgateur(s) et bénéficiaire(s).** Exemple : un contrat de sous-traitance aura rarement le sous-traitant comme divulgateur.
4. **Utilisation autorisée.**`,
  },

  // PDF page 13 — Mettre en place un accord de transfert de matériel
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Mettre en place un accord de transfert de matériel

<div class="text-sm opacity-60 mb-6">Sécurisation des échanges</div>

**Pourquoi ?**

Sans contrat, le destinataire est entièrement libre de faire du reverse-engineering sur votre matériel.
Or, est détenteur légitime d'un secret des affaires celui qui le contrôle de façon licite.

> **Sans contrat, celui qui découvre des informations sur votre matériel est propriétaire de ces informations.**

**Que définir en plus des points sécurisant l'information ?**

1. Matériel et quantité transférés
2. Utilisation autorisée
3. Durée de l'évaluation du matériel
4. Livrables attendus (rapport d'évaluation du matériel)
5. Modalités de retour / destruction du matériel
6. Régime de propriété industrielle des données afférentes au matériel (modifications, améliorations, applications)`,
  },

  // PDF page 14 — Focus L151-1 et suivants
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Focus L151-1 et suivants

> **Article L151-1** — Création LOI n° 2018-670 du 30 juillet 2018 - art. 1
>
> Est protégée au titre du secret des affaires toute information répondant aux critères suivants :
>
> 1° Elle n'est pas, en elle-même ou dans la configuration et l'assemblage exacts de ses éléments, généralement connue ou aisément accessible pour les personnes familières de ce type d'informations en raison de leur secteur d'activité ;
>
> 2° Elle revêt une valeur commerciale, effective ou potentielle, du fait de son caractère secret ;
>
> 3° Elle fait l'objet de la part de son détenteur légitime de mesures de protection raisonnables, compte tenu des circonstances, pour en conserver le caractère secret.

> **Article L151-2** — Création LOI n° 2018-670 du 30 juillet 2018 - art. 1
>
> Est détenteur légitime d'un secret des affaires celui qui en a le contrôle de façon licite.

> **Article L151-3** — Création LOI n° 2018-670 du 30 juillet 2018 - art. 1
>
> Constituent des modes d'obtention licite d'un secret des affaires :
>
> 1° Une découverte ou une création indépendante ;
>
> 2° L'observation, l'étude, le démontage ou le test d'un produit ou d'un objet qui a été mis à la disposition du public ou qui est de façon licite en possession de la personne qui obtient l'information, sauf stipulation contractuelle interdisant ou limitant l'obtention du secret.`,
  },

  // PDF page 15 — section divider Cadrage du projet
  {
    blockType: 'section',
    title: 'Cadrage du projet',
    subtitle: rt('Le **cadrage du projet** est aussi important que le contenu du contrat.'),
    surface: 'dark',
  },

  // PDF page 16 — Raisons du cadrage
  {
    blockType: 'twoCols',
    eyebrow: 'Cadrage du projet',
    title: 'Raisons du cadrage',
    intro: rt(`**Sécuriser**

- Rappeler ses connaissances propres ;
- Révéler des connaissances propres tierces ;
- Identifier et éviter les concurrents potentiels ;
- Maîtriser le flux d'informations ;
- Engager les moyens des parties.`),
    rightCards: [
      {
        title: 'Optimiser',
        description: rt(`- Identifier et justifier les demandes de fonds ;
- Optimiser sa fiscalité ;
- Clarifier le pilotage ;
- Permettre la sortie du projet.`),
      },
    ],
  },

  // PDF page 17 — Thématiques à encadrer (table)
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Thématiques à encadrer

<div class="text-sm opacity-60 mb-6">Cadrage du projet</div>

| | |
|--|--|
| **Contexte** | Stratégique \\| Technique |
| **Parties** | Signataires \\| Statuts \\| Filiales \\| Sous-traitants \\| Agréments |
| **Phases** | Tâches \\| Milestones \\| go ou no-go \\| Livrables |
| **Tâches** | Travaux \\| Date \\| Durée \\| Ressources \\| Lieux \\| Entité responsable \\| Tiers impliqués |
| **Pilotage** | Comité technique \\| comité stratégique \\| coordinateur \\| mandataire commun |
| **Moyens** | Financiers \\| humains \\| matériels \\| connaissances propres |`,
  },

  // PDF page 18 — Définir le contexte
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Définir le contexte

<div class="text-sm opacity-60 mb-6">Cadrage du projet</div>

**Que définir ?**

1. Contexte stratégique
2. Contexte technique
3. Objectif final

**Pourquoi ?**

- Contextualiser les clauses du contrat pour mitiger les divergences d'interprétation par :
  - Préambule reprenant les éléments ;
  - Note de cadrage en annexe.
- Appuyer le recours à l'imprévision ;
- Annexe du contrat permettant de contextualiser les clauses ;
- Appui aux demandes de financements (EIC, PIA, BFT, ect.) ;
- Justification des dispositifs fiscaux (CICO, CIR, CII, IP BOX, etc.).`,
  },

  // PDF page 19 — Définir les parties
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Définir les parties

<div class="text-sm opacity-60 mb-6">Cadrage du projet</div>

**Que définir ?**

1. Parties signataires (identifiées par un numéro de SIREN, pas un nom commercial) ;
2. Statut juridique du partenaire (ORDC, fondation, société privée, porteur de projet, etc.) ;
3. Filiales pouvant être impliquées ;
4. Sous-traitants pouvant être impliqués ;
5. Existence d'agréments (agrément CIR, CII).

**Pourquoi ?**

- Maîtriser la confidentialité :
  - Éviter de contractualiser avec la société-mère d'une société concurrente ;
  - Éviter que votre partenaire ne sous-traite à votre concurrent.
- Estimer les chances de réparation d'une défaillance du partenaire (e.g divulgation d'un brevet avant dépôt) ;
- Assurer l'optimisation de vos financements (éligibilité CICo, sous-traitants déclarés dans les demandes, etc.) ;
- Éviter la découverte d'un agrément expiré sans moyen de recours (30% de manque à gagner).`,
  },

  // PDF page 20 — Définir les tâches
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Définir les tâches

<div class="text-sm opacity-60 mb-6">Cadrage du projet</div>

**Que définir ?**

1. Tâche à réaliser ;
2. Date et durée estimée ;
3. Entité juridique exécutant (cosignataire, filiale, sous-traitant, …) ;
4. Ressources nécessaire ;
5. Lieu d'exécution.

**Pourquoi ?**

- Assurer la fluidité du pilotage (délais, prévisionnel, acquisitions, mobilisation d'ETP, etc.) ;
- Maîtriser le flux de vos connaissances propres (quel tiers à accès à quelles informations) ;
- Définir clairement les responsabilités (et donc les éventuelles défaillances) ;
- Définir clairement les apports (si défini comme critère de la propriété des résultats) ;
- Anticiper les problématiques de transport / d'export de matériel.`,
  },

  // PDF page 21 — Définir les comités de pilotage
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Définir les comités de pilotage

<div class="text-sm opacity-60 mb-6">Cadrage du projet</div>

**Que définir ?**

1. Coordinateur (Personne physique) ;
2. Comité technique (Groupe de personnes physiques) ;
3. Comité stratégique (Groupe de personnes physiques) ;
4. Mandataire commun ou mandataire unique (Personne morale).

**Pourquoi ?**

- Le coordinateur assure :
  - La convocation des comités ;
  - La réception et la communication des notifications ;
  - La coordination interne des parties.
- Le mandataire commun assure la gestion de la procédure de dépôt des titres de PI en coordination avec le cabinet.
- Le comité technique définit les (ré)orientations techniques du projet et les travaux à réaliser.
- Le comité stratégique prend les décisions majeures :
  - Poursuite ou arrêt du projet ;
  - Titres de propriété industrielle & publication ;
  - Exclusion d'une partie défaillante ;
  - Remplacement d'un sous-traitant ;
  - etc.`,
  },

  // PDF page 22 — Définir les moyens (Que définir, deux colonnes)
  {
    blockType: 'twoCols',
    eyebrow: 'Cadrage du projet',
    title: 'Définir les moyens',
    intro: rt(`**Que définir pour chaque Partie ?**

1. **Moyens financiers**
   - a. Montant ;
   - b. Objet ;
   - c. Destinataire des paiements.
2. **Moyens humains**
   - Nombre et qualification des ETP ;
   - Identification du principal investigator souhaité sur le projet (optionnel).`),
    rightCards: [
      {
        title: 'Moyens matériels',
        description: rt(`- a. Achat / location de matériel ;
- b. Budget consommables ;`),
      },
      {
        title: 'Connaissances propres',
        description: rt(`- Technologie (brevet, certificat d'utilité, COV, etc. ou secret d'affaires) ;
- Matériel propriétaire (idem technologie) ;
- Logiciels (droit d'auteur et éventuellement brevet) ;
- Bases de données (droit sui generis des DB + savoir-faire).`),
      },
    ],
  },

  // PDF page 23 — Définir les moyens (Pourquoi, encart)
  {
    blockType: 'statement',
    eyebrow: 'Cadrage du projet',
    title: 'Définir les moyens',
    body: rt(`**Pourquoi ?**

- Rappeler les restrictions (e.g informer de l'existence d'un brevet)
- Éviter les restrictions (e.g découvrir l'existence d'un brevet)
- Définir les engagements des parties
- Définir la propriété des résultats (si les apports sont un critère)`),
  },

  // PDF page 24 — section divider Négociation d'un contrat
  {
    blockType: 'section',
    title: "Négociation d'un contrat",
    surface: 'dark',
  },

  // PDF page 25 — Term-sheet (intro + tableau exemple)
  {
    blockType: 'twoCols',
    eyebrow: 'Négociation du contrat',
    title: 'Moyen le plus efficace : établir une term-sheet',
    intro: rt(`**Qu'est-ce qu'une term-sheet ?**

Un document non-contraignant récapitulant les principaux termes du partenariat, le plus souvent sous forme de tableau.

**Pourquoi ?**

- Rédaction du contrat principal grandement facilitée
- Accélération drastique de la négociation du contrat
- Révélation des deal-breakers le plus tôt possible`),
    rightCards: [
      {
        title: 'Exemple — Term-sheet ANONYME · ALPHA × BETA',
        description: rt(`Cette term-sheet récapitule les discussions relatives au projet ANONYME entre ALPHA et BETA. *Il ne s'agit pas d'un accord contraignant ni de clauses formulées* mais simplement d'un support aux discussions pour faciliter la contractualisation.

1. Parties
2. Principales définitions
3. Objet du Contrat
4. Projet Collaboratif
   - 4.1. Objet du Projet Collaboratif
   - 4.2. Pilotage (Coordinateur · Pilotage administratif · Pilotage technique)
   - 4.3. Propriété Industrielle (Connaissances Propres · Connaissances Nouvelles)
   - 4.4. Amélioration continue
5. Partenariat d'Exploitation
   - 5.1. Objet du Partenariat d'Exploitation (Rôles conjoint · Rôles spécifiques à ALPHA · Rôles spécifiques à BETA)
   - 5.2. Exclusivité`),
      },
    ],
  },

  // PDF page 26 — Choisir le type de contrat (intro)
  {
    blockType: 'statement',
    eyebrow: 'Négociation du contrat',
    title: 'Choisir le type de contrat',
    body: rt(`Le titre du contrat n'a aucun impact sur son effet juridique.

Cependant, connaître la typologie de contrat permet d'harmoniser la nomenclature pour :

- **faciliter la compréhension des personnes impliquées**
- **Répondre aux critères des guichets de financement, et de l'administration fiscale.**`),
  },

  // PDF page 27 — Tableau types de contrats
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Types de contrats R&D

<div class="text-sm opacity-60 mb-6">Négociation du contrat</div>

| Type de contrat | Principal cas d'usage |
|---|---|
| **Contrat de collaboration R&D** | Mise en commun classique de moyens pour mener des travaux de R&D |
| **Contrat de recherche sponsorisé (SRA) / Award** | Une partie effectue les travaux et l'autre fournit les moyens financiers (le plus souvent personne privée finançant une personne publique) |
| **Consortium** | Encadrer un projet R&D avec plus de deux parties, souvent dans le cadre de projets financés (e.g. PIA, EIC, etc.) |
| **Contrat de sous-traitance de travaux R&D** | Faire appel à un sous-traitant qui réalise les travaux et transfère la propriété des résultats |
| **Accord-cadre de fourniture de services R&D** | Encadrer les conditions globales qui seront appliquées à des "contrats d'applications" (e.g. pour faire appel de manière récurrente à une CRO) |
| **Contrat de co-traitance de travaux R&D** | Mutualisation des moyens nécessaires aux travaux R&D à réaliser pour le compte d'un tiers (e.g se grouper pour répondre à un appel d'offre). |
| **Convention CIFRE** | Contrat spécifique permettant le financement d'un doctorant en partenariat avec l'école doctorale sous le contrôle de l'ANRT. |`,
  },

  // PDF page 28 — Autres outils de négociation
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Autres outils de négociations

<div class="text-sm opacity-60 mb-6">Négociation du contrat</div>

| Outil | Effet |
|---|---|
| **Pacte de préférence** | Une partie s'engage à proposer prioritairement à une autre de traiter avec elle si elle décide de mener le projet. |
| **Lettre d'intention (LoI)** / **Memorandum d'entente (MoU)** | Les parties s'engagent à entrer en négociation. |
| **Accord partiel / provisoire** | Les parties s'engagent sur certains points déterminants dans le contrat définitif. |
| **Promesse de contrat** | Une partie s'engage à contracter avec une autre selon des éléments essentiels déterminés si cette autre partie donne son consentement dans une certaine période fixée. |`,
  },

  // PDF page 29 — Principaux points de négociation
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Principaux points de négociation

<div class="text-sm opacity-60 mb-6">Négociation du contrat</div>

- **Pilotage**
  - Rôles des comités, coordinateurs, mandataires
  - Prise de décision
- **Régime de propriété industrielle**
  - Connaissances propres & connaissances nouvelles
  - Propriété → Utilisation → Exploitation
  - Dépôt de titres
- **Confidentialité & publication**
- **Effets des milestones**
  - Sur les paiements
  - Sur la résiliation`,
  },

  // PDF page 30 — section divider Points particuliers
  {
    blockType: 'section',
    title: 'Points particuliers',
    surface: 'dark',
  },

  // PDF page 31 — Gestion des résultats
  {
    blockType: 'twoCols',
    eyebrow: 'Points particuliers',
    title: 'Gestion des résultats',
    intro: rt(`- **Imbriquer ses définitions**
- **Utiliser le cadre contractuel pour anticiper :**
  - Restreindre les Résultats pour que tout ce qui n'est pas demandé par le partenaire soit une Connaissance Propre
  - Corréler la cession avec les paiements (ou ajouter une clause de réserve de propriété)
  - Divulguer le code-source une fois payé (si nécessaire avec clause de séquestre)`),
    rightCards: [
      {
        title: 'Hiérarchie des objets',
        description: rt(`Informations
→ Informations Confidentielles
→ Résultats
  → Connaissances Nouvelles
    → Résultats Propres
    → Résultats Conjoints
  → Connaissances Propres
→ Propriété Intellectuelle`),
      },
    ],
  },

  // PDF page 32 — Pilotage (négociation du contrat)
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Pilotage

<div class="text-sm opacity-60 mb-6">Négociation du contrat</div>

**Pour chaque comité :**

- Rôles et pouvoirs
- Fréquence de réunion des comités
- Prise de décision
- Quorum
- Modalités de prise de décision (majorité, unanimité, etc.)

**Rôles et pouvoir du mandataire commun** (ou "unique" si implication du public)

**Rôles du coordinateur**`,
  },

  // PDF page 33 — Résultats non-brevetables
  {
    blockType: 'markdown',
    layout: 'default',
    frontmatter: 'class: relative',
    content: `# Résultats non-brevetables

<div class="text-sm opacity-60 mb-6">Points particuliers</div>

**Les résultats non-brevetés se gèrent avec la même liberté que les résultats brevetés. Ils peuvent être :**

- Cédés en totalité
- Cédés en copropriété
- Octroyés en licence
  - Avec ou sans sous-licence
  - Pour tous les domaines / marchés / typologies clients / territoires, ou non
- Nantis
- Apportés en nature
- Valorisés aux actifs de l'entreprise et immobilisés`,
  },

  // PDF page 34 — section divider Q&R
  {
    blockType: 'section',
    title: 'Questions & réponses',
    surface: 'dark',
  },

  // PDF page 35 — Contact
  {
    blockType: 'cta',
    eyebrow: 'Contact',
    title: 'Joachim BRINDEAU',
    subtitle: rt('Avocat'),
    primaryAction: '(+33) 7 87 87 60 83',
    secondaryAction: 'joachim.brindeau@bloom-legal.com',
  },
];
}

async function upsertMedia(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<Record<AssetKey, number>> {
  const ids = {} as Record<AssetKey, number>;
  for (const asset of ASSETS) {
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: asset.filename } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      ids[asset.key] = existing.docs[0].id;
      console.log(`Reusing media ${asset.filename} (id ${ids[asset.key]}).`);
      continue;
    }
    const created = await payload.create({
      collection: 'media',
      data: { alt: asset.alt },
      filePath: join(ASSETS_DIR, asset.filename),
      overrideAccess: true,
    });
    ids[asset.key] = created.id;
    console.log(`Uploaded ${asset.filename} → media id ${created.id}.`);
  }
  return ids;
}

async function main() {
  const payload = await getPayload({ config });
  const editorConfig = await editorConfigFactory.default({ config: payload.config });
  const rt = (markdown: string) => convertMarkdownToLexical({ editorConfig, markdown }) as never;

  const mediaIds = await upsertMedia(payload);
  const slides = buildSlides(mediaIds, rt);

  const existing = await payload.find({
    collection: 'presentations',
    where: { slug: { equals: SLUG } },
    limit: 1,
    overrideAccess: true,
  });

  const data = {
    slug: SLUG,
    title: TITLE,
    status: 'published' as const,
    slides,
  };

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id;
    await payload.update({
      collection: 'presentations',
      id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      overrideAccess: true,
    });
    console.log(`Updated presentation ${SLUG} (id ${id}) with ${slides.length} slides.`);
  } else {
    const created = await payload.create({
      collection: 'presentations',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      overrideAccess: true,
    });
    console.log(`Created presentation ${SLUG} (id ${created.id}) with ${slides.length} slides.`);
  }

  console.log(
    'A buildSlides job has been queued via afterPresentationChange. Run `pnpm jobs:run` to process it now.',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
