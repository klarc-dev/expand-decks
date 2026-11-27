/**
 * One-off production repair: shorten legacy page copy that no longer fits
 * today's field limits or the export layout gate, so every deck builds again.
 *
 *   pnpm prod run scripts/set-presentation-fixes.ts              # dry run
 *   pnpm prod run scripts/set-presentation-fixes.ts --apply --yes
 *
 * Each edit names the page title it expects, so a reordered deck is refused
 * instead of patched in the wrong place. Rich-text fields receive markdown and
 * are converted to Lexical; plain fields are written as is. Writes skip the
 * build queue: run scripts/run-build.ts <id> afterwards.
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical';

const apply = process.argv.includes('--apply');

type Edit = [path: string, value: string];
type PageFix = { page: number; title: string; edits: Edit[] };

const FIXES: Record<number, PageFix[]> = {
  11: [
    {
      page: 12,
      title: 'Un parcours jalonné réduit les corrections de dernière minute.',
      edits: [
        [
          'footer',
          'Indicateur de pilotage : part des dossiers corrigés après la revue annuelle, suivie par cohorte et comparée à N−1.',
        ],
      ],
    },
    {
      page: 13,
      title: 'La documentation intégrée limite la charge plus qu’une reconstitution tardive.',
      edits: [
        [
          'leftFooter',
          'Cas illustratif, projet de 9 mois à 5 contributeurs : 60 h de documentation au fil de l’eau, contre 110 h de reconstitution en clôture, avec davantage d’informations manquantes.',
        ],
      ],
    },
  ],
  12: [
    {
      page: 13,
      title: 'La documentation couvre quatre objets de preuve distincts',
      edits: [
        [
          'sidebarText',
          'Les quatre objets doivent rester cohérents et suivis au même niveau de granularité. Une rupture entre actif, revenu, dépense et ratio fragilise le résultat net imposé à 10 %.',
        ],
        [
          'cards.0.description',
          'Établir la nature de l’actif, sa protection et le respect des conditions de sa catégorie, au niveau retenu pour l’option : actif, bien ou famille.',
        ],
        [
          'cards.1.description',
          'Identifier les produits de concession ou de cession et leur rattachement à l’actif ; isoler les flux hors périmètre.',
        ],
        [
          'cards.2.description',
          'Affecter à l’actif les dépenses de R&D directement rattachables. La méthode d’imputation relie chaque montant au périmètre de l’option.',
        ],
        [
          'cards.3.description',
          'Distinguer dépenses éligibles et dépenses totales rattachées à l’actif, majorer le numérateur de 30 % et plafonner le ratio à 100 %.',
        ],
      ],
    },
  ],
  13: [
    {
      page: 9,
      title:
        'Une démarche de propriété industrielle se construit sur l’ensemble du cycle de protection',
      edits: [
        [
          'footer',
          'Le parcours n’est pas linéaire : résultats, évolution du projet ou incident peuvent conduire à réviser la stratégie.',
        ],
      ],
    },
  ],
  14: [
    {
      page: 7,
      title: 'La forme de financement ne suffit pas à connaître les obligations du bénéficiaire',
      edits: [
        [
          'rows.0.cells.1.value',
          'Contribution en principe non remboursable si les conditions sont respectées.',
        ],
        ['rows.0.cells.2.value', 'Reversement possible en cas de manquement aux obligations.'],
        ['rows.0.cells.3.value', 'Cahier des charges, convention et échéancier.'],
        ['rows.1.cells.1.value', 'Somme à rembourser selon les modalités du financeur.'],
        ['rows.1.cells.2.value', 'Part remboursable, déclenchement, calendrier et intérêts.'],
        ['rows.1.cells.3.value', 'Convention ou contrat, échéancier.'],
        ['rows.2.cells.0.value', 'Avance récupérable (si intitulé officiel)'],
        ['rows.2.cells.1.value', 'Récupération selon les conditions du dispositif.'],
        ['rows.2.cells.2.value', 'Événements déclencheurs et montants ; succès non présumé.'],
        ['rows.2.cells.3.value', 'Texte officiel, convention et échéancier.'],
        ['rows.3.cells.1.value', 'Fonds à rembourser selon un contrat.'],
        ['rows.3.cells.2.value', 'Capital, intérêts, calendrier et remboursement anticipé.'],
        ['rows.3.cells.3.value', 'Contrat de prêt et échéancier.'],
        [
          'rows.4.cells.1.value',
          'Couverture d’une partie du risque du prêteur, sans versement au bénéficiaire.',
        ],
        ['rows.4.cells.2.value', 'L’emprunt reste dû ; vérifier la portée de la couverture.'],
        ['rows.4.cells.3.value', 'Acte de garantie et contrat de prêt.'],
        ['rows.5.cells.0.value', 'Aide mixte (si prévue)'],
        ['rows.5.cells.1.value', 'Combinaison de formes, par exemple subvention et avance.'],
        ['rows.5.cells.2.value', 'Obligations propres à chaque composante.'],
        ['rows.5.cells.3.value', 'Documents de chaque composante.'],
        ['footnotes.0.text', 'Convention d’aide : engagements du financeur et du bénéficiaire.'],
        ['footnotes.1.text', 'Échéancier : calendrier des versements ou des remboursements.'],
        ['footnotes.2.text', 'Repères généraux, à confronter aux documents applicables.'],
      ],
    },
    {
      page: 8,
      title: "Le vocabulaire permet de distinguer une forme d'aide d'une décision de financement",
      edits: [
        [
          'sidebarText',
          'Associez A et B aux définitions 1 et 2, puis justifiez. Carte 02 : choisissez l’affirmation correcte.',
        ],
        [
          'cards.0.description',
          'A. Garantie · B. Paiement direct\n\n(1) Versement au bénéficiaire. (2) Couverture du risque du prêteur.',
        ],
        [
          'cards.1.description',
          'A. « Subvention » exclut toute restitution.\n\nB. Les documents peuvent prévoir une restitution.',
        ],
        [
          'cards.2.description',
          'A. Éligibilité · B. Attribution\n\n(1) Décision d’accorder l’aide. (2) Respect des conditions d’accès.',
        ],
        [
          'cards.3.description',
          'A. Convention d’aide · B. Échéancier\n\n(1) Calendrier des échéances. (2) Engagements et conditions de l’aide.',
        ],
        ['footnotes.0.text', 'Correction : 01 — A2, B1 ; 02 — B ; 03 — A2, B1 ; 04 — A2, B1.'],
        [
          'footnotes.1.text',
          'Erreurs fréquentes : supposer des remboursements uniformes ; tenir l’aide pour acquise dès l’éligibilité.',
        ],
        [
          'footnotes.2.text',
          'À retenir : le nom de l’aide ne détermine pas les obligations du bénéficiaire.',
        ],
      ],
    },
    {
      page: 13,
      title:
        "L'ancrage territorial et les projets internationaux appellent des recherches distinctes",
      edits: [
        ['footnotes.0.text', 'Pistes à vérifier sur des sources officielles datées.'],
        ['rows.4.cells.0.value', 'Marché international'],
        ['rows.4.cells.2.value', 'Objet, pays, partenaires'],
        ['rows.1.cells.0.value', 'Politique régionale'],
      ],
    },
    {
      page: 18,
      title: 'La qualification distingue les faits établis des vérifications encore nécessaires',
      edits: [
        [
          'intro',
          'À partir de l’extrait fictif précédent, examinez le besoin de financement et l’avancement du projet. Reliez chaque fait disponible au critère concerné, puis concluez ou demandez les informations manquantes.',
        ],
        [
          'rightCards.1.description',
          'Admissibilité possible, incompatibilité documentée, ou incertitude si une règle ou une preuve manque.',
        ],
        [
          'rightCards.3.description',
          'Ne promettez aucun montant. Un projet commencé n’est ni accepté ni exclu d’office : confrontez-le aux règles de l’extrait.',
        ],
      ],
    },
    {
      page: 20,
      title: 'Le récit du projet, son calendrier et ses pièces doivent décrire le même périmètre',
      edits: [
        [
          'sidebarText',
          'Vérifiez la cohérence des éléments du dossier et leur conformité aux rubriques demandées. Le budget reprend le même périmètre.',
        ],
        [
          'cards.0.description',
          'Relier les objectifs aux travaux décrits, sans omission ni contradiction entre les rubriques.',
        ],
        [
          'cards.1.description',
          'Vérifier que les dates des travaux et des jalons concordent entre le récit, le calendrier et les pièces.',
        ],
        [
          'cards.2.description',
          'Rapprocher les moyens des travaux prévus ; le rôle de chaque intervenant reste identique partout.',
        ],
        [
          'cards.3.description',
          'Rapprocher chaque affirmation de sa pièce justificative et vérifier les pièces demandées.',
        ],
      ],
    },
    {
      page: 30,
      title: "La décision et la convention fixent les engagements à suivre après l'attribution",
      edits: [
        [
          'sidebarText',
          'La décision et la convention fixent le financement et les engagements. L’attribution ne déclenche pas de paiement automatique.',
        ],
        ['cards.0.description', 'Identifier l’entité bénéficiaire et le projet couvert.'],
        [
          'cards.1.description',
          'Distinguer l’aide accordée et les dépenses retenues des montants demandés.',
        ],
        [
          'cards.2.description',
          'Repérer les dates et l’échéancier ; vérifier les conditions de chaque versement.',
        ],
        [
          'cards.3.description',
          'Relever les obligations de suivi, les justificatifs et les conditions de reversement.',
        ],
      ],
    },
    {
      page: 35,
      title: 'La conclusion doit rester conditionnelle tant que la règle ou la preuve manque',
      edits: [
        [
          'sidebarText',
          'Pour chaque situation, choisissez une conclusion et nommez la preuve nécessaire pour l’étayer.',
        ],
        [
          'cards.0.description',
          '« Toujours inéligible » ou « éligibilité à vérifier » ? Quel texte et quelles dates rapprocher ?',
        ],
        [
          'cards.1.description',
          '« Aide acquise » ou « l’éligibilité ne vaut pas attribution » ? Quel document établit l’issue ?',
        ],
        [
          'cards.2.description',
          '« Acceptée sans opposition » ou « non établie si une validation est requise » ? Quelle preuve ?',
        ],
        [
          'cards.3.description',
          '« La fin déclenche le paiement » ou « le versement dépend des justificatifs » ? Quelles pièces ?',
        ],
        [
          'footnotes.0.text',
          'Correction 1–2 : confronter les dates du projet au cahier des charges ; l’éligibilité ne vaut ni sélection ni attribution.',
        ],
        [
          'footnotes.1.text',
          'Correction 3–4 : vérifier la validation formelle si requise, les justificatifs et le service fait.',
        ],
        [
          'footnotes.2.text',
          'À retenir : relier chaque conclusion à une règle, une preuve et la validation attendue.',
        ],
      ],
    },
    {
      page: 39,
      title: 'Quatre contrôles relient la qualification initiale à la préparation du solde',
      edits: [
        [
          'cards.0.description',
          'Vérifier le projet et sa date de début au regard d’une règle identifiée. Le financeur décide ensuite de la sélection et du montant.',
        ],
        [
          'cards.1.description',
          'Vérifier le même périmètre dans le dossier, le budget et les annexes. Le financeur confirme les dépenses retenues et l’aide.',
        ],
        [
          'cards.2.description',
          'Vérifier la conformité des réalisations à la décision et à la convention, et les validations de modifications requises.',
        ],
        [
          'cards.3.description',
          'Rapprocher réalisations, justificatifs et dépenses acceptées avant la validation du service fait et le solde.',
        ],
      ],
    },
  ],
  16: [
    {
      page: 4,
      title: 'La nature du résultat commande le régime applicable',
      edits: [
        [
          'sidebarText',
          'Qualifier chaque élément séparément : un livrable peut relever de plusieurs titulaires. Confidentialité et remise technique ne transfèrent pas les droits.',
        ],
        [
          'cards.0.description',
          'Qualifier séparément le code et sa documentation : dévolution ou cession ciblée selon le statut du créateur.',
        ],
        [
          'cards.1.description',
          'Rapports, schémas ou interfaces restent à leur auteur ; leur exploitation suppose une cession écrite.',
        ],
        [
          'cards.2.description',
          'La titularité dépend de la mission et des circonstances : distinguer invention de mission et autre invention.',
        ],
        [
          'cards.3.description',
          'Recenser éléments préexistants, titulaires et licences : leur intégration n’en transfère pas la propriété.',
        ],
      ],
    },
    {
      page: 7,
      title: 'L’article L. 113-9-1 exige la réunion de toutes ses conditions',
      edits: [
        [
          'sidebarText',
          'Les sept conditions sont cumulatives et ne visent que les logiciels et leur documentation.',
        ],
        ['cards.0.description', 'Ni salariée au sens de l’article L. 113-9 CPI, ni agent public.'],
        ['cards.2.description', 'Personne morale, privée ou publique, réalisant de la recherche.'],
        [
          'cards.3.description',
          'Logiciel créé dans l’exercice des missions ou d’après les instructions.',
        ],
        ['cards.5.description', 'Création sous l’autorité d’un responsable de la structure.'],
        ['cards.6.description', 'Aucune stipulation contraire n’écarte la dévolution.'],
      ],
    },
    {
      page: 12,
      title: 'L’inventaire rend les créations identifiables et la remise vérifiable',
      edits: [
        [
          'sidebarText',
          'L’inventaire identifie les créations ; le procès-verbal constate leur remise. Ni l’un ni l’autre ne transfère les droits : dévolution ou cession reste nécessaire.',
        ],
        ['cards.0.description', 'Titre, nature du résultat, projet et période de création.'],
        ['cards.1.description', 'Emplacement, version, fichiers, dépôt Git et commits associés.'],
        [
          'cards.2.description',
          'Auteurs, composants tiers et open source, licences et antériorités.',
        ],
        [
          'cards.3.description',
          'État de remise et corrections attendues ; annexe mise à jour puis rapprochée du procès-verbal signé.',
        ],
      ],
    },
    {
      page: 13,
      title:
        'La gratification, le prix de cession et la contrepartie d’invention répondent à des règles distinctes',
      edits: [
        [
          'sidebarText',
          'Pour chaque flux, identifier le fondement, le bénéficiaire, la méthode de calcul et l’écrit. La gratification n’est pas le prix des droits.',
        ],
        [
          'cards.0.description',
          'Elle compense la présence en stage, non les cessions de droits, sauf stipulation explicite.',
        ],
        [
          'cards.1.description',
          'L’acte précise si la cession est gratuite ou onéreuse et, dans ce cas, le mode de calcul du prix.',
        ],
        [
          'cards.2.description',
          'Proportionnelle aux recettes ; forfait admis dans les seuls cas de l’art. L. 131-4 CPI.',
        ],
        [
          'cards.3.description',
          'Invention de mission : contrepartie financière. Hors mission attribuable : juste prix.',
        ],
      ],
    },
    {
      page: 16,
      title: 'Le parcours documentaire suit quatre temps et deux statuts',
      edits: [
        [
          'sidebarText',
          'Deux kits restent séparés : convention pour le stagiaire, contrat de travail pour l’apprenti.',
        ],
        ['cards.0.title', 'À l’entrée : ouvrir le kit du statut'],
        ['cards.1.title', 'Pendant l’accueil : tracer'],
        ['cards.2.title', 'Avant la sortie : instruire'],
        ['cards.3.title', 'À la sortie : formaliser'],
        [
          'cards.0.description',
          'Stagiaire : convention et contrepartie. Apprenti : contrat de travail. Pour les deux : mission et antériorités.',
        ],
        [
          'cards.1.description',
          'Tenir un inventaire vivant : versions, auteurs, licences et inventions potentielles.',
        ],
        [
          'cards.2.description',
          'Revoir séparément logiciels, œuvres, inventions et éléments confidentiels.',
        ],
        [
          'cards.3.description',
          'Stagiaire : dévolution ou cessions requises. Apprenti : régimes du salarié et cessions nécessaires.',
        ],
      ],
    },
  ],
  19: [
    {
      page: 12,
      title: 'La preuve de l’usage s’apprécie par un faisceau d’éléments concrets et objectifs',
      edits: [
        [
          'sidebarText',
          'Ces facteurs, non exhaustifs, s’apprécient ensemble pour établir que les milieux intéressés identifient l’entreprise.',
        ],
        ['cards.0.description', 'Lieux d’usage du signe et étendue géographique.'],
        ['cards.1.description', 'Période et durée d’usage du signe.'],
        [
          'cards.2.description',
          'Part de marché, intensité de l’usage et investissements promotionnels.',
        ],
        [
          'cards.3.description',
          'Proportion du public identifiant l’entreprise ; déclarations de CCI ou d’associations professionnelles.',
        ],
      ],
    },
  ],
};

process.env.PAYLOAD_DB_PUSH = '0';
process.env.PAYLOAD_RUN_JOBS_IN_PROCESS = '0';
process.env.MASTRA_DISABLE_INIT = '1';
const [{ getPayload }, { default: config }, { closeScriptPayload }] = await Promise.all([
  import('payload'),
  import('../src/payload.config'),
  import('./lib/payloadScript'),
]);
const payload = await getPayload({ config, disableOnInit: true, cron: false });
const editorConfig = await editorConfigFactory.default({ config: payload.config });
let exitCode = 0;

type Node = Record<string, unknown>;
const isRich = (value: unknown) =>
  !!value && typeof value === 'object' && 'root' in (value as object);

try {
  for (const [id, pages] of Object.entries(FIXES)) {
    const doc = await payload.findByID({
      collection: 'presentations',
      id: Number(id),
      depth: 0,
      overrideAccess: true,
    });
    const slides = structuredClone(doc.slides ?? []) as Node[];
    for (const { page, title, edits } of pages) {
      const slide = slides[page - 1];
      if (!slide || slide.title !== title)
        throw new Error(
          `#${id} page ${page} : titre « ${String(slide?.title)} », attendu « ${title} »`,
        );
      for (const [path, value] of edits) {
        const keys = path.split('.');
        const last = keys.pop()!;
        let parent: Node = slide;
        for (const key of keys) {
          const next = parent[key];
          if (!next || typeof next !== 'object')
            throw new Error(`#${id} page ${page} : chemin ${path} introuvable`);
          parent = next as Node;
        }
        if (!(last in parent) || parent[last] == null)
          throw new Error(`#${id} page ${page} : champ ${path} absent`);
        parent[last] = isRich(parent[last])
          ? convertMarkdownToLexical({ editorConfig, markdown: value })
          : value;
      }
    }
    const count = pages.reduce((n, page) => n + page.edits.length, 0);
    if (apply)
      await payload.update({
        collection: 'presentations',
        id: Number(id),
        data: { slides: slides as typeof doc.slides },
        overrideAccess: true,
        context: { skipBuildQueue: true },
        depth: 0,
      });
    console.log(
      `${apply ? 'Corrigé' : 'À corriger'} #${id} « ${doc.title} » : ${pages.length} page(s), ${count} champ(s)`,
    );
  }
  if (!apply) console.log('\nSimulation : relancer avec --apply pour appliquer.');
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await closeScriptPayload(payload);
}
process.exit(exitCode);
