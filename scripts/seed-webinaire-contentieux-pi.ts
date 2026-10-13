/**
 * Seed du webinaire « Conflits de propriété industrielle » (présentation 33).
 *
 *   pnpm deck:seed webinaire-contentieux-pi [--check] [--inspect] [--build]
 *   pnpm prod run scripts/seed-webinaire-contentieux-pi.ts --yes
 *
 * Upsert par (titre, organisation). Les intervenants de la couverture sont
 * conservés depuis la version en base. Fil rouge : la PME Axéa reçoit une mise
 * en demeure de son partenaire technique ; chaque partie se termine sur un
 * fait nouveau qui impose la décision suivante. La section 01 qualifie l'objet
 * produit (brevet, logiciel, dessin, secret) avant tout raisonnement en droit
 * des brevets ; le dépôt du partenaire n'est traité qu'une fois révélé (02).
 * Toutes les références ont été relues sur Légifrance le 13 octobre 2026 (CPC
 * dans la numérotation du décret 2025-660 en vigueur depuis le 1er septembre 2025).
 */
import { isDeepStrictEqual, parseArgs } from 'node:util';

import { AI_SLIDE_SCHEMA, SPEC_BY_TYPE } from '../src/blocks/spec';
import { fieldsOf } from '../src/blocks/spec/dsl';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import type { Presentation } from '../src/payload-types';
import { slugFromTitle } from '../src/lib/slug';

const TITLE = 'Conflits de propriété industrielle : de la mise en demeure au règlement du litige';
const ORGANISATION = 'Klarc';
const TEMPLATE = resolveDocumentTemplate('presentation');

const LF = 'https://www.legifrance.gouv.fr/codes/article_lc/';
const ref = (label: string, id: string) => `[${label}](${LF}${id})`;
const S = {
  L113_9: ref('CPI, art. L. 113-9 · Logiciel créé par un salarié', 'LEGIARTI000039279818'),
  L511_1: ref('CPI, art. L. 511-1 · Dessins et modèles', 'LEGIARTI000006279306'),
  L611_7: ref('CPI, art. L. 611-7 · Inventions de salariés', 'LEGIARTI000039279789'),
  L611_10: ref('CPI, art. L. 611-10 · Inventions brevetables', 'LEGIARTI000019298703'),
  L611_8: ref('CPI, art. L. 611-8 · Revendication de propriété', 'LEGIARTI000028717115'),
  L611_11: ref('CPI, art. L. 611-11 · Nouveauté', 'LEGIARTI000019298700'),
  L612_13: ref('CPI, art. L. 612-13 · Observations de tiers', 'LEGIARTI000006279443'),
  L613_7: ref('CPI, art. L. 613-7 · Possession personnelle antérieure', 'LEGIARTI000006279474'),
  L613_9: ref('CPI, art. L. 613-9 · Registre national des brevets', 'LEGIARTI000019298708'),
  R613_44: ref('CPI, art. R. 613-44 · Opposition, neuf mois', 'LEGIARTI000041703923'),
  L615_1: ref('CPI, art. L. 615-1 · Contrefaçon et connaissance de cause', 'LEGIARTI000036891091'),
  L615_2: ref('CPI, art. L. 615-2 · Qualité pour agir', 'LEGIARTI000036891114'),
  L615_3: ref('CPI, art. L. 615-3 · Mesures provisoires', 'LEGIARTI000028717051'),
  L615_4: ref('CPI, art. L. 615-4 · Action fondée sur une demande', 'LEGIARTI000006279565'),
  L615_5: ref('CPI, art. L. 615-5 · Saisie-contrefaçon', 'LEGIARTI000028716713'),
  L615_8: ref('CPI, art. L. 615-8 · Prescription', 'LEGIARTI000038613109'),
  L615_9: ref(
    'CPI, art. L. 615-9 · Action en déclaration de non-contrefaçon',
    'LEGIARTI000006279575',
  ),
  L151_1: ref('C. com., art. L. 151-1 · Secret des affaires', 'LEGIARTI000037266553'),
  L151_3: ref(
    'C. com., art. L. 151-3 · Obtention licite, ingénierie inverse',
    'LEGIARTI000037266559',
  ),
  C2224: ref('C. civ., art. 2224 · Prescription de droit commun', 'LEGIARTI000019017112'),
  C1240: ref('C. civ., art. 1240 · Responsabilité du fait personnel', 'LEGIARTI000032041571'),
  C1344: ref('C. civ., art. 1344 · Mise en demeure', 'LEGIARTI000032042162'),
  C2238: ref('C. civ., art. 2238 · Suspension par la médiation', 'LEGIARTI000006447470'),
  C2240: ref('C. civ., art. 2240 · Interruption par reconnaissance', 'LEGIARTI000019017366'),
  C2052: ref('C. civ., art. 2052 · Effet de la transaction', 'LEGIARTI000033458761'),
  CPC750_1: ref('CPC, art. 750-1 · Amiable préalable obligatoire', 'LEGIARTI000047539064'),
  CPC480: ref('CPC, art. 480 · Autorité de la chose jugée', 'LEGIARTI000039725797'),
  CPC1528_3: ref('CPC, art. 1528-3 · Confidentialité des modes amiables', 'LEGIARTI000051930598'),
  CPC1532_1: ref('CPC, art. 1532-1 · Audience de règlement amiable', 'LEGIARTI000051930581'),
  CPC1537: ref('CPC, art. 1537 · Mesures malgré l’amiable', 'LEGIARTI000051930524'),
  CPC1546: ref('CPC, art. 1546 · Formule exécutoire', 'LEGIARTI000051930483'),
  D211_6: ref('COJ, art. D. 211-6 · Tribunal judiciaire de Paris', 'LEGIARTI000039066848'),
};

type DraftSlide = { blockType: string; title: string; [field: string]: unknown };
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
    rightCards: cards.map(([cardTitle, description]) => ({ title: cardTitle, description })),
  };
}

function section(number: string, title: string, subtitle: string): DraftSlide {
  return { blockType: 'section', number, title, subtitle };
}

/* ───────────────────────── Ouverture ───────────────────────── */

add({
  blockType: 'cover',
  pills: [
    { text: 'Webinaire' },
    { text: 'Projet innovant' },
    { text: 'Précontentieux et contentieux' },
  ],
  title: 'Conflits de propriété industrielle',
  subtitle:
    'De la mise en demeure au règlement du litige : titularité, preuve, délais, mesures provisoires, transaction.',
});

add(
  grid(
    'Cas fictif · Vous dirigez la PME',
    'J-15 avant le lancement d’Axéa, votre partenaire vous met en demeure',
    [
      [
        'Le projet',
        'Axéa a été développé avec un partenaire technique. Les stocks sont fabriqués, les distributeurs attendent, le lancement est dans quinze jours.',
      ],
      [
        'Le désaccord',
        'Le partenaire vend un produit proche. Il affirme détenir des droits sur les résultats du projet et conteste votre droit de les exploiter sans le rétribuer.',
      ],
      [
        'La lettre',
        'Son avocat vous met en demeure de suspendre la commercialisation sous huit jours. Aucune pièce jointe, aucun numéro de titre.',
      ],
    ],
    '**La lettre impose-t-elle de suspendre le lancement ?** La réponse dépend de la titularité des résultats, de la portée du titre invoqué et des preuves de date. Elle est traitée en conclusion.',
  ),
);

add({
  blockType: 'agenda',
  eyebrow: 'Le panorama',
  title: 'Cinq fonctions, pas cinq étapes',
  lead: 'Elles se combinent : une saisie-contrefaçon peut précéder le premier courrier, une médiation se tenir pendant le procès.',
  items: [
    {
      label: 'Comprendre le différend',
      description:
        'Ce qui a été produit, sous quel régime, à qui cela appartient, ce qui court déjà.',
    },
    {
      label: 'Écrire et répondre',
      description:
        'Ce que vaut le dépôt du partenaire, ce que vaut sa lettre, répondre sans reconnaître.',
    },
    {
      label: 'Chercher un accord avec un tiers',
      description:
        'Clause de médiation préalable, confidentialité, protection judiciaire simultanée.',
    },
    {
      label: 'Obtenir une décision',
      description: 'Contester le titre dans l’ordre du temps ; référé, fond ou arbitre.',
    },
    {
      label: 'Mettre en œuvre l’issue',
      description: 'Effet de la transaction, clauses de licence, force exécutoire.',
    },
  ],
});

/* ───────────────────────── 01 · Comprendre ───────────────────────── */

add(
  section(
    '01',
    'Comprendre le différend',
    'Avant de répondre, qualifier : ce qui a été produit, sous quel régime, à qui cela appartient, ce qui court déjà. **Pour Axéa** · tout se joue sur la nature des résultats, le contrat de R&D et une date.',
  ),
);

add(
  {
    blockType: 'table',
    eyebrow: '01 · Comprendre',
    title: 'Qualifier l’objet avant d’invoquer un droit',
    lead: '**Règle** · « des résultats » ne désigne aucun droit. Chaque objet produit relève d’un régime, avec sa condition d’existence et sa preuve.',
    columns: [
      { header: 'Ce que le projet a produit' },
      { header: 'Régime possible' },
      { header: 'Condition d’existence' },
      { header: 'À défaut' },
    ],
    rows: [
      {
        cells: [
          { value: '**Procédé ou produit technique**' },
          { value: 'Brevet, après dépôt et délivrance[^1].' },
          {
            value:
              'Nouveauté, activité inventive, application industrielle. Portée limitée aux revendications.',
          },
          { value: 'Secret des affaires s’il a été gardé ; sinon, libre.' },
        ],
      },
      {
        cells: [
          { value: '**Logiciel**' },
          { value: 'Droit d’auteur, sans dépôt.' },
          {
            value:
              'Originalité du code. Les fonctionnalités et les algorithmes ne sont pas protégés en tant que tels.',
          },
          { value: 'Réécriture indépendante licite.' },
        ],
      },
      {
        cells: [
          { value: '**Forme, apparence**' },
          { value: 'Dessin ou modèle enregistré[^2].' },
          {
            value:
              'Nouveauté et caractère propre. Modèle communautaire non enregistré : trois ans.',
          },
          { value: 'Concurrence déloyale seulement.' },
        ],
      },
      {
        cells: [
          { value: '**Savoir-faire, données, essais**' },
          { value: 'Secret des affaires.' },
          {
            value:
              'Non connue, valeur commerciale, mesures de protection raisonnables. Aucun titre, aucune date.',
          },
          { value: 'Le produit vendu peut être démonté et étudié[^3].' },
        ],
      },
    ],
  },
  [S.L611_10, S.L511_1, S.L151_3],
);

add(
  grid(
    '01 · Comprendre',
    'Quatre fondements, quatre régimes de preuve',
    [
      [
        'Contrefaçon',
        'Un acte reproduit les caractéristiques revendiquées d’un titre. Le non-fabricant (distributeur, utilisateur) ne répond qu’en connaissance de cause : c’est à cela que sert la mise en demeure[^1].',
      ],
      [
        'Violation du contrat',
        'Exclusivité, périmètre d’usage, confidentialité : la faute est contractuelle, la preuve est le contrat et son exécution.',
      ],
      [
        'Concurrence déloyale',
        'Faute, dommage, causalité, sans titre[^2]. La jurisprudence exige des faits distincts de ceux invoqués au titre de la contrefaçon.',
      ],
      [
        'Secret des affaires',
        'Information non connue, à valeur commerciale, protégée par des mesures raisonnables[^3]. Sans NDA ni marquage, le savoir-faire transmis au partenaire n’est pas un secret.',
      ],
    ],
    '**Piège Axéa** · la lettre invoque des « droits sur les résultats » sans dire lesquels ni sur quel fondement. La proximité des produits n’établit ni contrefaçon ni faute ; chaque fondement a ses conditions et sa preuve.',
  ),
  [S.L615_1, S.C1240, S.L151_1],
);

add(
  split(
    '01 · Comprendre',
    'À qui appartient ce qui a été produit',
    '**La règle.** Le créateur est une personne physique : l’invention de mission appartient à l’employeur[^1], le logiciel écrit par un salarié dans ses fonctions aussi[^2]. Entre deux entreprises, rien ne se transfère sans écrit : le prestataire garde ce que ses salariés ont produit, sauf cession.\n\n**Le piège.** « C’est moi qui ai payé » ne vaut rien sans clause de cession. Et un savoir-faire transmis sans NDA est détenu par les deux.',
    [
      [
        'Connaissances antérieures',
        'Ce que chacun apportait avant le projet reste à lui. Sans inventaire annexé, la frontière avec les résultats se plaide.',
      ],
      [
        'Résultats',
        'La clause doit dire ce que le mot couvre : titres, code, données, documentation, améliorations.',
      ],
      [
        'Cession et licence',
        'Transfert de propriété ou simple droit d’usage ? Pour quels territoires, quelle durée, quels produits ?',
      ],
    ],
    '**Réflexe Axéa** · si le contrat de R&D ne définit pas « résultats », chaque objet retombe dans son régime légal : celui qui a créé garde.',
  ),
  [S.L611_7, S.L113_9],
);

add(
  grid(
    '01 · Comprendre',
    'Être titulaire, pouvoir exploiter, pouvoir interdire : trois questions distinctes',
    [
      [
        'Être titulaire',
        'Détenir le droit, par création, dépôt ou cession inscrite. Seul le titulaire ou le licencié exclusif agit en contrefaçon, sauf clause contraire[^1].',
      ],
      [
        'Pouvoir exploiter',
        'Un titre n’est pas une autorisation d’exploiter. Un brevet valable peut dépendre d’un titre antérieur détenu par un tiers.',
      ],
      [
        'Pouvoir interdire',
        'Territoire, vigueur, annuités payées et portée : la portée se lit dans les revendications, non dans l’abrégé.',
      ],
    ],
    '**Piège Axéa** · le partenaire peut détenir un titre valable sans qu’Axéa le contrefasse ; la PME peut être libre d’exploiter sans rien pouvoir lui interdire. Les deux situations sont indépendantes.',
  ),
  [S.L615_2],
);

add(
  split(
    '01 · Comprendre',
    'Ce qui court déjà, indépendamment de la lettre',
    '**Figer la preuve.** Enveloppe e-Soleau, constat de commissaire de justice, horodatage : un dossier technique non daté ne prouve ni l’antériorité ni la possession personnelle.\n\n**La saisie-contrefaçon** s’obtient sur requête, sans débat[^1], mais oblige à assigner au fond sous vingt jours ouvrables ou trente et un jours civils, sinon nullité et responsabilité du saisissant.',
    [
      [
        'Prescription de la contrefaçon',
        'Cinq ans depuis le jour où le titulaire a connu ou aurait dû connaître le dernier fait[^2].',
      ],
      [
        'Contrat, concurrence déloyale, secret',
        'Cinq ans de droit commun depuis la connaissance des faits[^3].',
      ],
      [
        'Ce qui interrompt contre vous',
        'La reconnaissance du droit de l’autre interrompt la prescription à son profit. Une suspension « par courtoisie » écrite peut valoir reconnaissance.',
      ],
    ],
    '**Réflexe Axéa** · avant toute réponse, donner date certaine aux développements et aux démonstrations clients.',
  ),
  [S.L615_5, S.L615_8, S.C2224],
);

/* ───────────────────────── 02 · Écrire et répondre ───────────────────────── */

add(
  section(
    '02',
    'Écrire et répondre',
    '**Fait nouveau** · le contrat attribue les résultats « à la partie qui les a développés », sans définir le mot. Une demande de brevet sur le procédé a été déposée au nom du partenaire seul il y a quatorze mois. Vous aviez montré Axéa à trois clients deux mois avant ce dépôt.',
  ),
);

add(
  grid(
    '02 · Écrire et répondre',
    'Le partenaire a déposé seul, ou s’apprête à le faire : trois leviers',
    [
      [
        'Revendiquer la propriété',
        'Un titre déposé en violation d’une obligation conventionnelle se transfère au vrai titulaire. Cinq ans après publication de la délivrance ; jusqu’à expiration si mauvaise foi[^1].',
      ],
      [
        'Détruire la brevetabilité',
        'Tout ce qui est accessible au public avant le dépôt entre dans l’état de la technique[^2] : publication défensive avant son dépôt, démonstrations antérieures, observations de tiers après publication[^3]. Sauf abus évident dans les six mois avant le dépôt.',
      ],
      [
        'Invoquer la possession antérieure',
        'Qui détenait l’invention de bonne foi avant la date de dépôt peut continuer de l’exploiter malgré le brevet. Droit personnel, transmissible seulement avec l’entreprise.',
      ],
    ],
    '**Réflexe Axéa** · établir la date de vos premières démonstrations et de vos fichiers techniques. Les trois leviers supposent une date certaine ; la publication défensive ne vaut que si elle précède son dépôt.',
  ),
  [S.L611_8, S.L611_11, S.L612_13],
);

add(
  grid(
    '02 · Écrire et répondre',
    'Ce qu’une lettre vaut : nature, auteur, délivrance',
    [
      [
        'La nature',
        'Une mise en demeure est une interpellation suffisante[^1] : un objet, une mesure, un délai. Le mot ne suffit pas, l’intitulé ne crée rien.',
      ],
      [
        'L’auteur',
        'La signature d’un avocat ou d’un CPI annonce une position, elle ne la juge pas. Elle engage sa cliente, pas vous.',
      ],
      [
        'La délivrance',
        'LRAR : preuve de l’envoi et de la date, pas du contenu. Signification par commissaire de justice : acte faisant foi du contenu.',
      ],
    ],
    '**Règle** · ni la signature d’un avocat, ni le recommandé, ni l’intitulé « mise en demeure » ne créent une obligation. Ils établissent une date et la connaissance de cause.',
  ),
  [S.C1344],
);

add(
  split(
    '02 · Cas fictif · Lecture annotée',
    'La lettre reçue, ligne par ligne',
    '*Lettre recommandée AR · Objet : mise en demeure*\n\n« Notre cliente détient des droits sur les résultats du projet mené avec votre société, que votre produit **Axéa** reproduit. Nous vous mettons en demeure de **suspendre la commercialisation sous huit jours**. À défaut, nous saisirons le juge aux fins d’interdiction et de réparation. »\n\n*Maître [nom], avocat au barreau de [ville]*',
    [
      [
        'Ce qui est fait correctement',
        'Un objet, une mesure, un délai : la lettre est une mise en demeure. Elle établit la connaissance de cause à compter de sa réception.',
      ],
      [
        'Ce qui est affirmé sans preuve',
        '« Détient des droits » : aucun numéro de titre. « Reproduit » : aucune revendication citée. Invérifiable, donc inopposable en l’état.',
      ],
      [
        'Ce qui est inventé',
        'Le délai de huit jours est choisi par l’expéditeur ; aucun texte ne l’impose. Il ne crée aucune échéance légale.',
      ],
    ],
    '**Préalable** · aucun texte n’impose une mise en demeure ni un amiable avant d’assigner en contrefaçon ; l’amiable obligatoire s’arrête à 5 000 €[^1]. Seule une clause de médiation préalable l’impose.',
  ),
  [S.CPC750_1],
);

add(
  grid(
    '02 · Écrire et répondre',
    'Les risques pour l’auteur du courrier',
    [
      [
        'Le dénigrement',
        'Écrire aux clients ou distributeurs de l’adversaire qu’il contrefait, sans jugement, est une concurrence déloyale si l’affirmation manque de base factuelle suffisante ou de mesure. Si le partenaire a écrit à vos distributeurs, c’est lui qui s’expose.',
      ],
      [
        'La menace sans suite',
        'Annoncer une assignation sous huit jours puis laisser passer trois mois affaiblit toute demande d’urgence ultérieure : le juge apprécie aussi la diligence du demandeur.',
      ],
    ],
    '**Règle** · un courrier engage son auteur autant que son destinataire. Avant d’écrire : à qui, avec quelle base factuelle, et serez-vous capable de tenir ce que vous annoncez ?',
  ),
);

add(
  grid(
    '02 · Écrire et répondre',
    'Répondre sans reconnaître, et reprendre l’initiative',
    [
      [
        'Exiger les pièces',
        'Numéro du titre, revendications, rapport de recherche de l’INPI (public, avec l’opinion sur la brevetabilité). Le registre indique le statut du titre et le paiement des annuités.',
      ],
      [
        'Sommer de prendre parti',
        'Qui exploite ou prépare sérieusement une exploitation peut inviter le titulaire à dire si son brevet s’y oppose. Silence de trois mois ou réponse contestée : action en déclaration de non-contrefaçon[^1].',
      ],
      [
        'Ne rien reconnaître',
        'Une phrase de courtoisie qui admet un droit interrompt la prescription à votre détriment. Demander un délai ne suspend rien, contrairement à une médiation engagée[^2].',
      ],
      [
        'Cadrer l’échange',
        'Interlocuteurs, pouvoir de signature, sort des échanges en cas d’échec. La procédure participative, un avocat par partie, fournit ce cadre.',
      ],
    ],
    '**Réflexe Axéa** · l’article L. 615-9 permet de ne pas attendre l’assignation : c’est au titulaire de prendre parti sur l’opposabilité de son brevet à l’exploitation décrite.',
  ),
  [S.L615_9, S.C2238],
);

/* ───────────────────────── 03 · Accord avec un tiers ───────────────────────── */

add(
  section(
    '03',
    'Chercher un accord avec un tiers',
    '**Fait nouveau** · le partenaire joint sa demande de brevet. La revendication 1 est large ; le rapport de recherche cite deux antériorités « X ». Il propose une rencontre.',
  ),
);

add(
  grid(
    '03 · Accord avec un tiers',
    'Médiation : ce que le contrat impose, ce que la loi protège',
    [
      [
        'La clause préalable',
        'Une clause de médiation ou de conciliation préalable dans le contrat de R&D rend irrecevable l’assignation directe : fin de non-recevoir, jurisprudence constante. À vérifier avant d’assigner, dans les deux sens.',
      ],
      [
        'La confidentialité',
        'Tout ce qui est dit, écrit ou élaboré en médiation est confidentiel[^1]. Mais une pièce antérieure, simplement produite pendant le processus, ne le devient pas.',
      ],
      [
        'Le bon tiers',
        'Médiateur technique, centre spécialisé en PI (OMPI). Si un inventeur salarié est en cause : commission nationale des inventions de salariés.',
      ],
    ],
    '**Piège Axéa** · une rencontre sans accord de médiation écrit n’est couverte par aucune confidentialité : les déclarations peuvent être produites ensuite, et un savoir-faire montré sans NDA cesse d’être un secret.',
  ),
  [S.CPC1528_3],
);

add(
  grid(
    '03 · Accord avec un tiers',
    'Négocier et se protéger en même temps',
    [
      [
        'La prescription se suspend',
        'Dès l’accord de médiation ou de conciliation, ou à défaut d’écrit dès la première réunion[^1]. Elle reprend à la fin du processus, pour six mois au moins.',
      ],
      [
        'Le juge reste accessible',
        'L’amiable n’empêche ni une mesure d’instruction, ni une mesure provisoire ou conservatoire[^2]. Saisie-contrefaçon et médiation peuvent coexister.',
      ],
      [
        'Même après l’assignation',
        'Le juge peut ordonner une médiation en cours d’instance ; l’audience de règlement amiable confie le dossier à un juge dédié qui ne tranche pas[^3].',
      ],
    ],
    '**Règle** · l’amiable n’est pas une trêve juridique. Ce qui n’est pas expressément suspendu continue de courir, notamment les délais devant les offices.',
  ),
  [S.C2238, S.CPC1537, S.CPC1532_1],
);

/* ───────────────────────── 04 · Obtenir une décision ───────────────────────── */

add(
  section(
    '04',
    'Obtenir une décision',
    '**Fait nouveau** · la médiation échoue sur le prix. Le partenaire maintient sa revendication 1 et annonce une assignation sous dix jours. Deux choix : attaquer le titre, et devant qui.',
  ),
);

add(
  grid(
    '04 · Obtenir une décision',
    'Contester le titre du partenaire, dans l’ordre du temps',
    [
      [
        'La revendication de propriété',
        'Dès le dépôt, devant le juge. Obtenir le transfert du titre plutôt que son annulation : préférable quand l’invention est bonne et qu’elle est la vôtre[^1].',
      ],
      [
        'Les observations de tiers',
        'Après publication de la demande et avant délivrance, devant l’INPI[^2]. Sans frais ni qualité particulière ; l’examinateur en tient compte, sans que vous deveniez partie.',
      ],
      [
        'L’opposition devant l’INPI',
        'Neuf mois à compter de la publication de la délivrance au BOPI[^3]. Procédure administrative contradictoire, pas de dommages-intérêts.',
      ],
      [
        'La nullité devant le juge',
        'À tout moment, souvent en défense. Défaut de nouveauté ou d’activité inventive, insuffisance de description ; la validité se juge sur les revendications.',
      ],
    ],
    '**Réflexe Axéa** · le rapport de recherche cite deux antériorités « X ». Leur lecture précède tout choix : elles peuvent fonder une nullité ou une limitation de la revendication 1.',
  ),
  [S.L611_8, S.L612_13, S.R613_44],
);

add(
  {
    blockType: 'table',
    eyebrow: '04 · Obtenir une décision',
    title: 'Référé, fond ou arbitre : trois portées différentes',
    lead: '**Règle** · en brevets, référé et fond relèvent du seul tribunal judiciaire de Paris[^3]. Le provisoire limite la portée de la décision, pas son effet.',
    columns: [
      { header: 'Trois voies' },
      { header: 'Référé' },
      { header: 'Fond' },
      { header: 'Arbitre' },
    ],
    rows: [
      {
        cells: [
          { value: '**Ce qu’on obtient**' },
          { value: 'Mesure provisoire, provision, interdiction sous garantie[^1].' },
          { value: 'Validité, propriété, contrefaçon, réparation : la décision qui s’impose[^2].' },
          { value: 'Une sentence entre les parties, seulement si une clause le prévoit.' },
        ],
      },
      {
        cells: [
          { value: '**Ce qu’il faut montrer**' },
          { value: 'Une atteinte vraisemblable, ou l’absence de contestation sérieuse.' },
          { value: 'Les faits et le droit, selon les règles de preuve ordinaires.' },
          { value: 'Ce que la convention d’arbitrage permet de soumettre.' },
        ],
      },
      {
        cells: [
          { value: '**Ce que ça ne fait pas**' },
          {
            value:
              'Trancher le principal. Modifiable si circonstances nouvelles ; une mesure levée ensuite engage celui qui l’a obtenue.',
          },
          { value: 'Aller vite : plusieurs mois, sauf jour fixe ou procédure accélérée.' },
          { value: 'Annuler un titre à l’égard de tous. La sentence lie les parties.' },
        ],
      },
    ],
  },
  [S.L615_3, S.CPC480, S.D211_6],
);

/* ───────────────────────── 05 · Mettre en œuvre ───────────────────────── */

add(
  section(
    '05',
    'Mettre en œuvre l’issue',
    '**Fait nouveau** · après lecture des antériorités, le partenaire propose une licence à 6 % du chiffre d’affaires, exclusivité France, et l’abandon réciproque de toute action. Portée exacte de ce qui serait signé.',
  ),
);

add(
  grid(
    '05 · Mettre en œuvre',
    'Ce qu’une transaction éteint',
    [
      [
        'La règle',
        'Écrit et concessions réciproques. La transaction fait obstacle à toute action entre les parties ayant le même objet[^1].',
      ],
      [
        'Le piège',
        'Une renonciation « à toute action relative aux résultats du projet » éteint aussi la revendication de propriété et l’action en nullité de la PME.',
      ],
      [
        'Les tiers',
        'L’accord n’engage pas les licenciés, distributeurs ou sous-traitants qui n’y sont pas parties. Une licence non inscrite au registre n’est pas opposable aux tiers[^2].',
      ],
      [
        'La force exécutoire',
        'Homologation par le juge, ou formule exécutoire apposée par le greffe sur l’acte contresigné par les avocats des deux parties, même hors médiation[^3].',
      ],
    ],
    '**Réflexe Axéa** · délimiter l’objet de la transaction : faits, période, titre, demandes. Une renonciation rédigée largement couvre aussi ce que l’on croyait réservé.',
  ),
  [S.C2052, S.L613_9, S.CPC1546],
);

add(
  grid(
    '05 · Mettre en œuvre',
    'Les clauses de la licence',
    [
      [
        'Périmètre et registre',
        'Produits, territoires, durée, exclusivité. Inscription de la licence au Registre national des brevets, sinon inopposable aux tiers.',
      ],
      [
        'Redevance et audit',
        'Assiette définie (chiffre d’affaires net ?), échéancier, droit d’audit comptable, intérêts et résiliation en cas de retard.',
      ],
      [
        'Améliorations',
        'À qui appartiennent les développements futurs de chaque partie ? Une clause de retour (grant-back) exclusive est à manier avec prudence au regard du droit de la concurrence.',
      ],
      [
        'Validité du titre',
        'Si le brevet est annulé ensuite, que deviennent les redevances ? Une clause de non-contestation peut être écartée ; prévoir plutôt la fin des redevances.',
      ],
    ],
    '**Règle** · chaque principe devient une obligation vérifiable, avec un débiteur, une échéance et une sanction.',
  ),
);

/* ───────────────────────── Conclusion ───────────────────────── */

add(
  grid(
    'Retour au cas fictif',
    'Trois issues, trois leviers',
    [
      [
        'Poursuivre sous licence',
        'Si la revendication 1 résiste aux antériorités et couvre Axéa. Éléments de négociation : la possession personnelle antérieure et l’action en nullité.',
      ],
      [
        'Organiser la séparation',
        'Si les apports sont dissociables. L’accord répartit titres, code, données, usages, stocks et documents, objet par objet, selon le régime de chacun.',
      ],
      [
        'Faire trancher',
        'Si le désaccord sur la propriété persiste. Revendication de propriété, nullité, ou action en déclaration de non-contrefaçon : vous choisissez le terrain.',
      ],
    ],
    '**Règle** · aucune issue ne se choisit sur la lettre. Elle se choisit sur les pièces, la date de vos développements et l’échéance la plus proche.',
  ),
);

add(
  grid(
    'Retour à votre première décision',
    'Suspendre le lancement ? Non. Les diligences des huit jours',
    [
      [
        'Jour 1',
        'Donner date certaine aux développements et aux démonstrations clients. Conserver les fichiers en l’état.',
      ],
      [
        'Jour 2',
        'Lire la clause de propriété des résultats du contrat de R&D et chercher une clause de médiation préalable.',
      ],
      [
        'Jour 3',
        'Interroger la base INPI : numéro, revendications, rapport de recherche, annuités. Lire les antériorités citées.',
      ],
      [
        'Jour 8',
        'Répondre sans reconnaître, exiger les pièces, et sommer le titulaire de prendre parti sur l’opposabilité de son brevet à Axéa.',
      ],
    ],
    '**Ce qui aurait justifié de suspendre** · une revendication identifiée qui couvre Axéa, aucune antériorité citée, aucune preuve de date du côté de la PME. La lettre n’établit aucun de ces éléments.',
  ),
);

add({
  blockType: 'cta',
  eyebrow: 'Merci',
  title: 'Merci',
  subtitle:
    'Nous vous offrons un premier échange de 30 minutes pour faire le point sur vos besoins.',
  primaryAction: 'Prendre rendez-vous',
  primaryActionUrl: '{org.bookingUrl}',
  footerNote:
    'Panorama principalement français · Cas fictif · Les situations individuelles appellent une analyse de leur dossier',
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
    const id = `webinaire-pi-${slugFromTitle(slide.title)}`;
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
  const payload = await getPayload({ config, disableOnInit: true, cron: false });
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
      where: { and: [{ title: { equals: TITLE } }, { organisation: { equals: organisation.id } }] },
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
          'Webinaire panorama en droit français pour dirigeants de projets innovants. Cinq fonctions : comprendre, écrire et répondre, accord avec un tiers, obtenir une décision, mettre en œuvre. Cas fictif PME Axéa et partenaire technique, avec un fait nouveau à chaque section. Chaque slide énonce une règle, un piège et un réflexe. Sources Légifrance vérifiées ; CPC dans la numérotation du décret 2025-660.',
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
