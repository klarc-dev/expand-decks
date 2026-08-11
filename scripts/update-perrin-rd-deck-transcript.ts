import config from '../src/payload.config';
import { getPayload } from 'payload';
import { buildSlidesMd } from '../src/export/buildSlidesMd';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import type { Presentation } from '../src/payload-types';

const payload = await getPayload({ config });

const slides = [
  {
    blockType: 'cover',
    eyebrow: 'REVUE DE L’ORGANISATION EXISTANTE · 11 JUIN 2026',
    title: 'R&D Perrin : anomalies constatées et décisions à prendre',
    subtitle:
      'Analyse fondée sur les situations décrites pendant la réunion. Les qualifications juridiques et fiscales restent à confirmer sur pièces.',
    surface: 'gradient',
  },
  {
    blockType: 'table',
    eyebrow: 'ANOMALIES DOCUMENTÉES EN RÉUNION',
    title: 'Le CIR est porté par une société qui n’emploie pas directement l’équipe R&D',
    surface: 'dark',
    tableVariant: 'reference',
    columns: [
      { header: 'Situation décrite' },
      { header: 'Défaut précis' },
      { header: 'Mesure immédiate' },
    ],
    rows: [
      {
        cells: [
          { value: '**Perrin et Fils porte l’essentiel du CIR**' },
          { value: 'Léo et Anna sont salariés d’un groupement d’employeurs.' },
          {
            value:
              'Identifier l’employeur, l’utilisateur, le site et le projet pour chaque période.',
          },
        ],
      },
      {
        cells: [
          { value: '**Mise à disposition générale**' },
          {
            value:
              'Manuel Ferré confirme l’absence de formalisation individuelle et nominative précise.',
          },
          { value: 'Établir les conventions et annexes manquantes sans les antidater.' },
        ],
      },
      {
        cells: [
          { value: '**Léo intervient sur plusieurs sites et pour plusieurs entités**' },
          {
            value:
              'Le temps consacré par Léo aux projets des domaines ou d’autres sociétés du groupe ne peut pas être valorisé dans le CIR déclaré par Perrin et Fils.',
          },
          {
            value:
              'Exclure ces temps du CIR de Perrin et Fils et les ventiler par projet et par entité bénéficiaire.',
          },
        ],
      },
      {
        cells: [
          { value: '**Anna travaille à l’Université de Bordeaux**' },
          {
            value:
              'Présente toute l’année dans les locaux de l’université dans le cadre de la CIFRE, Anna ne peut pas être valorisée dans le CIR de Perrin et Fils.',
          },
          {
            value:
              'Exclure intégralement son temps et sa rémunération de l’assiette CIR de Perrin et Fils.',
          },
        ],
      },
      {
        cells: [
          { value: '**Gaël intervient sur la caisserie**' },
          {
            value:
              'Son temps n’a pas été anticipé ni chiffré ; l’intervention de Léo peut relever de la supervision plutôt que de travaux directs.',
          },
          { value: 'Qualifier les tâches avant toute inclusion dans l’assiette.' },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'JUSTIFICATION TECHNIQUE 2025',
    title: 'Au 11 juin 2026, le dossier n’avait pas commencé',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Constat' }, { header: 'Conséquence concrète' }, { header: 'Décision' }],
    rows: [
      {
        cells: [
          { value: 'Léo indique ne pas avoir commencé la justification technique du CIR 2025.' },
          {
            value:
              'Les verrous, essais, échecs et résultats doivent être reconstruits plusieurs mois après les travaux.',
          },
          { value: 'Nommer un responsable et lancer la rédaction immédiatement.' },
        ],
      },
      {
        cells: [
          {
            value:
              'Léo indique manquer de temps et attendre un arbitrage interne sur l’accompagnement.',
          },
          {
            value:
              'Le dossier dépend d’une décision entre direction, finance et expert-comptable qui n’est pas prise.',
          },
          {
            value:
              'Pierre tranche le budget et le prestataire ; Léo fournit la matière scientifique.',
          },
        ],
      },
      {
        cells: [
          { value: 'Le dossier technique est traité comme un livrable fiscal annuel.' },
          { value: 'La preuve n’est pas produite au fil des projets.' },
          {
            value:
              'Instaurer un relevé mensuel des hypothèses, essais, résultats, temps et dépenses.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'CONTRATS ET PROPRIÉTÉ INTELLECTUELLE',
    title: 'Les documents ne permettent pas d’identifier immédiatement le porteur des droits',
    surface: 'light',
    tableVariant: 'reference',
    columns: [
      { header: 'Exemple cité' },
      { header: 'Anomalie' },
      { header: 'Vérification requise' },
    ],
    rows: [
      {
        cells: [
          { value: '**Contrats universitaires**' },
          {
            value:
              'Des documents désignent « Famille Perrin » sans identifier clairement la société concernée.',
          },
          {
            value:
              'Déterminer le signataire, le payeur, le bénéficiaire et le régime des résultats.',
          },
        ],
      },
      {
        cells: [
          { value: '**Deux brevets évoqués**' },
          {
            value:
              'La réunion ne permet pas de répondre immédiatement à la question : quelle entité a porté et payé les projets ?',
          },
          { value: 'Rapprocher contrats de thèse, factures, inventeurs, dépôts et titulaires.' },
        ],
      },
      {
        cells: [
          { value: '**Dépôt cosmétique**' },
          {
            value:
              'Joachim cite une tentative de dépôt sur une société de domaines alors que le projet concernait la cosmétique.',
          },
          { value: 'Retrouver le dossier, le motif de rejet et la chaîne de droits.' },
        ],
      },
      {
        cells: [
          { value: '**Marque Beau Soleil**' },
          { value: 'Joachim indique qu’elle aurait été déposée sur la mauvaise entité.' },
          {
            value: 'Vérifier le titulaire, l’usage réel et la nécessité d’une cession ou licence.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'FLUX INTRAGROUPE',
    title:
      'Perrin et Fils finance parce qu’elle dispose de trésorerie, pas parce que chaque projet lui appartient',
    surface: 'dark',
    tableVariant: 'reference',
    columns: [
      { header: 'Fait exprimé en réunion' },
      { header: 'Problème' },
      { header: 'Correction' },
    ],
    rows: [
      {
        cells: [
          { value: 'Perrin et Fils est présentée comme la société disposant des fonds.' },
          {
            value:
              'La trésorerie disponible ne démontre ni son intérêt propre ni son droit sur les résultats.',
          },
          {
            value:
              'Transformer le versement en apport, compte courant ou prêt admissible à la filiale R&D.',
          },
        ],
      },
      {
        cells: [
          {
            value:
              'Manuel Ferré indique que des dépenses R&D sont souvent refacturées arbitrairement à Perrin et Fils.',
          },
          {
            value:
              'La clé de répartition n’est pas rattachée à un mandat, un livrable ou un droit obtenu.',
          },
          {
            value: 'Convention-cadre, ordre de mission, budget et méthode de prix avant le projet.',
          },
        ],
      },
      {
        cells: [
          { value: 'Une société peut financer tandis qu’une autre exploite.' },
          {
            value:
              'L’exploitante n’acquiert aucun droit par le seul financement d’une autre société.',
          },
          { value: 'Prévoir une licence, une cession ou une prestation attributive de droits.' },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'ENTITÉS EXISTANTES',
    title: 'Ni 20 Domaines ni Cépages R&D ne répondent au besoin transverse décrit',
    surface: 'light',
    tableVariant: 'reference',
    columns: [
      { header: 'Entité' },
      { header: 'Situation décrite' },
      { header: 'Conclusion opérationnelle' },
    ],
    rows: [
      {
        cells: [
          { value: '**20 Domaines**' },
          {
            value:
              'Cumulerait activité fermière, tête d’intégration, holding et activité ingrédients.',
          },
          { value: 'Ne pas y ajouter les nouveaux travaux R&D et dépôts de brevets.' },
        ],
      },
      {
        cells: [
          { value: '**Cépages R&D**' },
          {
            value:
              'Structure à actionnariat 50/25/25, créée pour la valorisation cosmétique et porteuse d’un brevet licencié à Beau Domaine.',
          },
          {
            value:
              'Ce véhicule commun avec des partenaires ne constitue pas la fonction support R&D du groupe.',
          },
        ],
      },
      {
        cells: [
          { value: '**Groupements d’employeurs**' },
          {
            value:
              'Ils répondent à une politique RH globale mais compliquent la preuve CIR et la séparation des fonctions.',
          },
          {
            value:
              'Conserver leur usage général ; employer directement le noyau R&D dans le véhicule cible.',
          },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'INVESTISSEMENT EN COURS',
    title: 'Le laboratoire d’extraction ne doit pas être engagé avant cinq arbitrages',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'Arbitrage' }, { header: 'Question non résolue pendant la réunion' }],
    rows: [
      {
        cells: [
          { value: '**Propriétaire**' },
          { value: 'Quelle société achète et amortit les équipements ?' },
        ],
      },
      {
        cells: [
          { value: '**Occupation**' },
          {
            value:
              'Quel titre autorise la filiale R&D à utiliser l’espace situé dans le laboratoire qualité existant ?',
          },
        ],
      },
      {
        cells: [
          { value: '**Séparation**' },
          {
            value:
              'Comment distinguer les équipements, consommables et coûts du contrôle qualité et de la R&D ?',
          },
        ],
      },
      {
        cells: [
          { value: '**Personnel**' },
          {
            value:
              'Clara reste-t-elle en qualité, rejoint-elle la R&D ou partage-t-elle son temps selon une règle formalisée ?',
          },
        ],
      },
      {
        cells: [
          { value: '**Résultats**' },
          {
            value:
              'Quelle société détiendra les procédés, fractions, savoir-faire et dépôts issus du laboratoire ?',
          },
        ],
      },
    ],
  },
  {
    blockType: 'mermaid',
    eyebrow: 'SOLUTION CIBLE',
    title: 'Créer le véhicule minimal pour les nouveaux projets',
    surface: 'light',
    source: `flowchart LR
      F[Financeur identifié] -->|apport, compte courant ou prêt admissible| R[Filiale R&D]
      R -->|emploie 3 à 4 personnes cœur| E[Équipe R&D]
      R -->|signe les nouveaux contrats| P[Nouveaux projets]
      P --> D[Nouveaux résultats et droits]
      D -->|licence, cession ou prestation| X[Société exploitante]
      X -->|prix documenté| R`,
    caption:
      'Le véhicule cible reçoit les nouveaux projets. Les contrats, salariés et actifs historiques ne sont pas transférés en bloc.',
  },
  {
    blockType: 'table',
    eyebrow: 'PÉRIMÈTRE DE LA PREMIÈRE PHASE',
    title: 'Ce qui entre dans la filiale et ce qui reste hors du chantier initial',
    surface: 'light',
    tableVariant: 'reference',
    columns: [{ header: 'À faire maintenant' }, { header: 'À différer' }],
    rows: [
      {
        cells: [
          { value: 'Constituer une société contrôlée par le groupe avec un objet R&D adapté.' },
          { value: 'Transférer tous les brevets et marques historiques.' },
        ],
      },
      {
        cells: [
          {
            value:
              'Employer directement les trois ou quatre personnes majoritairement affectées à la R&D.',
          },
          { value: 'Réorganiser immédiatement tous les salariés à contribution ponctuelle.' },
        ],
      },
      {
        cells: [
          {
            value:
              'Faire signer par la filiale les nouveaux contrats, notamment les nouveaux projets d’extraction, jus et spiritueux.',
          },
          {
            value:
              'Renégocier d’un seul bloc les contrats universitaires et industriels existants.',
          },
        ],
      },
      {
        cells: [
          {
            value:
              'Définir avant chaque projet le financeur, le titulaire, l’exploitant, le prix et le déclarant CIR.',
          },
          { value: 'Reconstituer immédiatement l’intégralité de l’historique du groupe.' },
        ],
      },
    ],
  },
  {
    blockType: 'table',
    eyebrow: 'DÉCISIONS À PRENDRE',
    title: 'Six décisions conditionnent le démarrage',
    surface: 'dark',
    tableVariant: 'reference',
    columns: [{ header: 'Décision' }, { header: 'Réponse attendue' }],
    rows: [
      {
        cells: [
          { value: '**CIR 2025**' },
          { value: 'Qui rédige le dossier, avec quel budget et selon quel calendrier ?' },
        ],
      },
      {
        cells: [
          { value: '**Filiale**' },
          {
            value:
              'Validation de la création, du contrôle capitalistique et de la date de constitution.',
          },
        ],
      },
      {
        cells: [
          { value: '**Direction**' },
          {
            value:
              'Formalisation du rôle de Léo Lajoie et de ses pouvoirs sur les projets et les temps.',
          },
        ],
      },
      {
        cells: [
          { value: '**Équipe**' },
          {
            value:
              'Liste des trois ou quatre salariés transférés ou recrutés et traitement social associé.',
          },
        ],
      },
      {
        cells: [
          { value: '**Laboratoire**' },
          {
            value: 'Société propriétaire, site, règles d’usage, personnel et régime des résultats.',
          },
        ],
      },
      {
        cells: [
          { value: '**Premiers projets**' },
          {
            value:
              'Liste des projets qui naîtront directement dans la filiale et sociétés appelées à les exploiter.',
          },
        ],
      },
    ],
  },
];

const richSlides = await convertSlidesMarkdownToLexical(slides, payload);

if (process.env.OUTPUT_MARKDOWN) {
  const { writeFileSync } = await import('node:fs');
  const md = buildSlidesMd({
    title: 'R&D Perrin : anomalies constatées et décisions à prendre',
    slides: richSlides as never,
  });
  writeFileSync(process.env.OUTPUT_MARKDOWN, md);
  console.log(`Wrote rendered deck to ${process.env.OUTPUT_MARKDOWN}`);
  process.exit(0);
}

const presentation = await payload.update({
  collection: 'presentations',
  id: 16,
  data: {
    title: 'R&D Perrin : anomalies constatées et décisions à prendre',
    language: 'fr',
    status: 'published',
    tags: ['R&D', 'CIR', 'organisation', 'propriété intellectuelle', 'décision'],
    footer: {
      enabled: true,
      left: 'Groupe Perrin · R&D',
      center: 'Revue de l’organisation existante',
      right: '{page} / {total}',
    },
    slides: richSlides,
  } as unknown as Presentation,
  overrideAccess: true,
  context: { skipBuildQueue: true },
});

console.log(`Updated presentation ${presentation.id} with ${richSlides.length} slides.`);
process.exit(0);
