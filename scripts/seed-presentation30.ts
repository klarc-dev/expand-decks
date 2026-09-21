/**
 * Canonical, repeatable seed for production presentation 30.
 *
 * Usage:
 *   NODE_ENV=development pnpm deck:seed presentation30 -- --dry-run
 *   NODE_ENV=development pnpm deck:seed presentation30 -- --build
 *
 * The seed edits the existing NERIVO deck by stable slide identity, preserves
 * unrelated slides, and refuses to write when the deck changes between read
 * and update. It is the durable SSOT for further presentation30 iterations;
 * do not create one-shot tmp/revise scripts for this deck.
 */
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { runBuildSlidesTask } from '../src/jobs/buildSlidesRunner';
import { runPayloadScript } from './lib/payloadScript';

const TITLE =
  "Signes distinctifs et originaux : sécuriser l'identité et l'image de votre projet innovant";
const dryRun = process.argv.includes('--dry-run');
const buildAfterWrite = process.argv.includes('--build');

type AnyRecord = Record<string, any>;

const text = (value: any): string =>
  typeof value === 'string'
    ? value
    : (value?.text ??
      (value?.root ? text(value.root) : (value?.children ?? []).map(text).join('')));

const setRichText = (field: any, value: string) => {
  const leaves: AnyRecord[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.text === 'string') leaves.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(field?.root ?? field);
  if (!leaves.length) throw new Error('Expected an existing rich-text field');
  leaves[0].text = value;
  for (const leaf of leaves.slice(1)) leaf.text = '';
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const setOptionalRichText = (slide: AnyRecord, fieldName: string, value: string) => {
  if (!slide[fieldName]) {
    slide[fieldName] = {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: [
          {
            type: 'paragraph',
            format: '',
            indent: 0,
            version: 1,
            children: [],
            direction: null,
            textStyle: '',
            textFormat: 0,
          },
        ],
      },
    };
  }
  setRichText(slide[fieldName], value);
};

const assertCardGridLimits = (slide: AnyRecord, label: string) => {
  assert(slide.blockType === 'cardGrid', `${label} is not a card grid`);
  assert((slide.cards ?? []).length <= 3, `${label} has more than three cards`);
  assert(slide.columns == null || slide.columns === '2', `${label} must use compact columns`);
  assert(text(slide.sidebarText).length <= 320, `${label} sidebar exceeds 320 characters`);
  for (const [index, card] of (slide.cards ?? []).entries()) {
    assert(
      String(card.title ?? '').length <= 120,
      `${label} card ${index + 1} title exceeds 120 characters`,
    );
    assert(
      text(card.description).length <= 260,
      `${label} card ${index + 1} description exceeds 260 characters`,
    );
  }
};

const setFootnotes = (slide: AnyRecord, sources: string[]) => {
  slide.footnotes = sources.map((text) => ({ text }));
};

await runPayloadScript(async (payload) => {
  const before: AnyRecord = await payload.findByID({
    collection: 'presentations',
    id: 30,
    depth: 0,
    overrideAccess: true,
  });
  assert(before.title === TITLE, 'Presentation 30 title changed; refusing seed');
  assert(before.slides?.length === 25, `Expected 25 slides, got ${before.slides?.length}`);

  const slides: AnyRecord[] = structuredClone(before.slides);
  const byTitle = (wanted: string) => {
    const matches = slides.filter((slide) => slide.title === wanted);
    assert(matches.length === 1, `Expected one slide titled ${wanted}, got ${matches.length}`);
    return matches[0];
  };
  // Resolve by exact current title. Do not use positional fallbacks: production
  // editorial order is mutable and title identity is the durable contract.
  const ownership = byTitle('Titularité et preuve');
  const names = byTitle('Création, usage, enregistrement : quand le droit naît-il ?');
  const nice = byTitle(
    'La Classification de Nice : classer pour décrire, pas pour créer un monopole',
  );
  const anteriority = byTitle('Une antériorité ne se lit pas seulement dans un registre');
  const risk = byTitle('NERIVA pour des cosmétiques : obstacle certain ou risque à qualifier ?');
  const tolerance = byTitle('Forclusion par tolérance');
  const domain = byTitle('Le domaine réservé ne remplit pas les trois fonctions attendues');
  const vote = byTitle('NERIVO peut-il autoriser la campagne allemande ?');
  const use = byTitle('Déchéance pour défaut d’exploitation : l’usage doit être réel');
  const launch = byTitle(
    'Le nom est réservé. Le logo est payé. Le produit est-il libre de sortir ?',
  );
  const assets = byTitle('Commencer par les actifs, pas par les guichets de dépôt');
  assert(domain && anteriority && vote, 'Stable slide identity missing');

  // Keep the narrative chronological: identify the online asset before
  // widening the analysis to third-party anteriorities.
  const domainIndex = slides.indexOf(domain);
  const anteriorityIndex = slides.indexOf(anteriority);
  if (domainIndex > anteriorityIndex) {
    slides.splice(domainIndex, 1);
    slides.splice(anteriorityIndex, 0, domain);
  }
  assert(slides.indexOf(domain) < slides.indexOf(anteriority), 'Domain must precede anteriority');

  const cover = slides.find((slide) => slide.blockType === 'cover');
  assert(cover, 'Cover slide missing');
  cover.pills = (cover.pills ?? []).filter(
    (pill: AnyRecord) => pill.text !== 'Cas fictif · Parfum',
  );

  assert(ownership?.blockType === 'cardGrid', 'Ownership slide is not a card grid');
  ownership.title = 'Titularité et preuve';
  ownership.cards[0].number = '01';
  ownership.cards[1].number = '02';
  ownership.cards[2].number = '03';
  ownership.cards[2].title = 'Titularité et preuve';

  assert(names?.blockType === 'twoCols', 'Names slide is not a two-column block');
  names.title = 'Quatre noms, quatre fonctions et des preuves différentes';
  names.leftFooter = null;

  assert(launch?.blockType === 'statement', 'Launch slide is not a statement');
  launch.title = 'Réservation, dépôt et liberté d’exploitation';
  setRichText(
    launch.body,
    'Réserver un nom de domaine ne crée pas un droit sur le signe. Déposer une marque demande encore un examen de validité et ne donne pas, à lui seul, la liberté d’exploiter le produit. La liberté d’exploitation suppose de vérifier les droits antérieurs opposables et les autorisations nécessaires.[^1]',
  );
  setRichText(
    launch.footer,
    'Domaine réservé : adresse internet. Marque déposée : titre soumis à examen. Liberté d’exploitation : conclusion après recherche des antériorités, comparaison des usages et vérification de la chaîne de droits.[^2]',
  );
  setFootnotes(launch, [
    'Réserver un nom de domaine est une opération d’enregistrement technique ; elle ne confère pas un monopole général sur le signe.',
    'La liberté d’exploitation est une analyse de risques et de droits opposables, distincte de la réservation du domaine et du dépôt de marque.',
  ]);

  const topicTitles: Record<string, string> = {
    'Un parfum, cinq actifs à distinguer': 'Actifs et régimes de protection',
    'Commencer par les actifs, pas par les guichets de dépôt': 'Actifs, protections et limites',
    'Création, usage, enregistrement : quand le droit naît-il ?':
      'Fonctions des noms et naissance des droits',
    'Trois noms possibles, trois difficultés différentes': 'Choix du signe et distinctivité',
    'Que protège chaque représentation ?': 'Types de représentation et portée du dépôt',
    'La Classification de Nice : classer pour décrire, pas pour créer un monopole':
      'Classification de Nice et HDB',
    'Une antériorité ne se lit pas seulement dans un registre': 'Recherche d’antériorités',
    'NERIVA pour des cosmétiques : obstacle certain ou risque à qualifier ?':
      'Risque de confusion : NERIVA / NERIVO',
    'Le domaine réservé ne remplit pas les trois fonctions attendues':
      'Nom de domaine et fonctions juridiques',
    'L’agence a été payée. Qui peut autoriser la réutilisation du logo ?':
      'Chaîne de droits sur le logo',
    'Reconstituer la chaîne de droits, pas seulement retrouver un contrat':
      'Preuve de titularité et chaîne de droits',
    'Le flacon a été montré avant le dépôt : tout est-il perdu ?':
      'Divulgation préalable et nouveauté',
    'Trois droits sur le flacon, trois démonstrations différentes':
      'Droits concurrents sur le flacon',
    'Six mois pour revendiquer une priorité, pas pour conquérir tous les marchés':
      'Priorité et calendrier de dépôt',
    'France et Allemagne : choisir l’architecture, pas seulement le guichet':
      'Architecture territoriale France / Allemagne',
    'Déchéance pour défaut d’exploitation : l’usage doit être réel':
      'Exploitation réelle et déchéance',
    'Un dossier d’usage doit relier le signe à une exploitation vérifiable':
      'Dossier de preuve d’usage',
    'Même copie apparente, fondements et preuves différents': 'Qualification des atteintes',
    'Un horodatage prouve une date, pas un monopole': 'Chronologie et force probatoire',
    'Non en l’état : l’accord sur le nom ne règle pas les droits sur le logo.':
      'Décision finale et conditions d’autorisation',
  };
  for (const slide of slides)
    if (slide.title && topicTitles[slide.title]) slide.title = topicTitles[slide.title];

  assert(nice?.blockType === 'twoCols', 'Nice/HDB slide is not two-column');
  setRichText(
    nice.intro,
    'La Classification de Nice organise les produits et services en classes. La base de données harmonisée des produits et services (HDB) propose des termes acceptés : ils facilitent le dépôt, la traduction, la recherche et le traitement procédural, sans remplacer le choix du périmètre utile.[^1]',
  );
  setOptionalRichText(
    nice,
    'leftFooter',
    'Partir des termes HDB pertinents, puis vérifier que le libellé décrit l’exploitation visée. Une classe ne crée pas une protection automatique.[^2]',
  );
  assert((nice.rightCards ?? []).length >= 3, 'Nice/HDB cards missing');
  nice.rightCards[0].title = 'Horizon court : périmètre exploité';
  setRichText(
    nice.rightCards[0].description,
    'Décrire les produits et services que NERIVO met réellement sur le marché au lancement : c’est le périmètre immédiatement défendable.',
  );
  nice.rightCards[1].title = 'Horizon long : extension crédible';
  setRichText(
    nice.rightCards[1].description,
    'Réserver une extension cohérente avec la stratégie future, sans gonfler artificiellement le libellé : l’intention doit rester crédible et utile.',
  );
  nice.rightCards[2].title = 'Potentiel de parasitisme';
  setRichText(
    nice.rightCards[2].description,
    'Un libellé trop étroit peut laisser un espace à une reprise opportuniste sur des produits ou services voisins ; comparer les usages projetés et les circuits de commercialisation.[^3]',
  );
  setFootnotes(nice, [
    'Arrangement de Nice : la classification organise les classes de produits et services.',
    'HDB de l’EUIPO : les termes acceptés facilitent le dépôt, la traduction et la recherche.',
    'Règlement (UE) 2017/1001, art. 33 : le libellé délimite les produits et services revendiqués.',
  ]);

  assert(use?.blockType === 'twoCols', 'Use/decheance slide is not two-column');
  setOptionalRichText(
    use,
    'leftFooter',
    'Après cinq ans, l’absence d’usage sérieux peut conduire à la déchéance, totale ou partielle, pour les produits et services concernés. Le renouvellement ne remplace pas l’exploitation.[^1]',
  );
  setRichText(
    use.rightCards?.[0]?.description,
    'Conserver un dossier daté reliant le signe aux produits ou services : factures, pages de vente, campagnes et volumes. L’usage doit être sérieux, public et cohérent avec le libellé.',
  );
  setFootnotes(use, [
    'CPI, art. L. 714-5 ; règlement (UE) 2017/1001, art. 18 et 58 : déchéance après cinq ans de non-usage sérieux, selon le périmètre concerné.',
  ]);

  assert(risk?.blockType === 'twoCols', 'Risk slide is not a two-column block');
  setRichText(
    risk.intro,
    'Hypothèse : la recherche révèle NERIVA, marque antérieure valable couvrant des cosmétiques en France. NERIVO envisage de conserver son nom en changeant la couleur du logo.',
  );
  risk.rightCards = [
    {
      title: 'Phonétique',
      description: 'Comparer les sonorités et le rythme de NERIVO et NERIVA.',
    },
    {
      title: 'Sémantique (conceptuelle)',
      description:
        'NERIVO et NERIVA sont des noms inventés sans signification établie : aucune évocation commune ne doit être présumée.',
    },
    {
      title: 'Orthographique (visuelle)',
      description:
        'Comparer les lettres, la structure et l’apparence ; une différence de couleur ne tranche pas seule.',
    },
  ];
  setOptionalRichText(
    risk,
    'leftFooter',
    'Comparer les signes sur trois plans : phonétique (sonorités et rythme), sémantique (sens et évocation) et orthographique/visuel (lettres, structure et apparence). Aucun critère ne décide seul : l’analyse est globale, rapportée aux produits ou services et au public concernés.[^1]',
  );
  risk.footnotes = [
    {
      text: 'CJUE, C-251/95, SABEL ; C-39/97, Canon ; C-342/97, Lloyd : appréciation globale du risque de confusion.',
    },
  ];

  assert(tolerance?.blockType === 'cardGrid', 'Tolerance slide is not a card grid');
  tolerance.eyebrow = 'NERIVO · Un concurrent est désormais sur le marché';
  tolerance.title = 'Forclusion par tolérance';
  setOptionalRichText(
    tolerance,
    'sidebarText',
    'Forclusion possible si la marque postérieure est enregistrée, connue et tolérée pendant cinq ans.[^1]',
  );
  tolerance.cards = [
    {
      number: '1',
      title: 'Marque postérieure enregistrée',
      description:
        'La forclusion vise une marque postérieure enregistrée, pour les produits ou services concernés.',
    },
    {
      number: '2',
      title: 'Connaissance et cinq ans',
      description:
        'Cinq années en connaissance de cause et de tolérance ; le silence seul ne suffit pas.[^2]',
    },
    {
      number: '3',
      title: 'Effet limité',
      description:
        'Recours irrecevable sur ce périmètre ; exception si le dépôt est de mauvaise foi.[^3]',
    },
  ];
  tolerance.columns = null;
  tolerance.footnotes = [
    {
      text: 'CPI, art. L. 716-2-8 et L. 716-4-5 : la forclusion concerne une marque postérieure enregistrée.',
    },
    {
      text: 'La connaissance de l’usage et la tolérance pendant cinq ans doivent être caractérisées ; le silence seul ne suffit pas.',
    },
    {
      text: 'La forclusion est limitée aux produits ou services concernés ; la mauvaise foi fait obstacle à son bénéfice.',
    },
  ];
  assertCardGridLimits(tolerance, 'Slide 12');
  assert(slides.indexOf(domain) < slides.indexOf(anteriority), 'Domain must precede anteriority');

  assert(vote, 'Final vote slide missing');
  if (!text(vote.lead).includes('Hypothèse finale')) {
    setRichText(
      vote.lead,
      `Hypothèse finale : si un accord NERIVA existe, que permet-il réellement ? ${text(vote.lead)}`,
    );
  }

  const fresh: AnyRecord = await payload.findByID({
    collection: 'presentations',
    id: 30,
    depth: 0,
    overrideAccess: true,
  });
  assert(fresh.updatedAt === before.updatedAt, 'Concurrent edit detected; refusing write');

  const changedSlides = [4, 6, 11, 12, 24, 25];
  const summary = {
    id: 30,
    title: before.title,
    slideCount: slides.length,
    changedSlides,
    dryRun,
    buildAfterWrite,
  };
  if (dryRun) {
    console.log(JSON.stringify(summary));
    return;
  }

  const converted = await convertSlidesMarkdownToLexical(slides, payload);
  await payload.update({
    collection: 'presentations',
    id: 30,
    data: { slides: converted },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const saved: AnyRecord = await payload.findByID({
    collection: 'presentations',
    id: 30,
    depth: 0,
    overrideAccess: true,
  });
  assert(saved.title === TITLE && saved.slides?.length === 25, 'Seed readback identity failed');
  assert(
    saved.slides[0].pills.every((pill: AnyRecord) => pill.text !== 'Cas fictif · Parfum'),
    'Cover pill remained',
  );
  assert(
    saved.slides.some((slide: AnyRecord) => slide.title === 'Forclusion par tolérance'),
    'Tolerance slide missing',
  );
  assert(
    JSON.stringify(saved.slides).includes('Connaissance et cinq ans'),
    'Tolerance content missing',
  );
  assert(
    JSON.stringify(saved.slides).includes('Nomenclature'),
    'Expected existing Nice-classification content missing',
  );
  assert(JSON.stringify(saved.slides).includes('HDB'), 'HDB horizon content missing');
  assert(JSON.stringify(saved.slides).includes('libellé'), 'Libellé horizon content missing');
  assert(
    saved.slides.some(
      (slide: AnyRecord) => slide.title === 'NERIVO peut-il autoriser la campagne allemande ?',
    ),
    'Final vote title changed',
  );

  let buildSuccess = false;
  if (buildAfterWrite) {
    const build = await runBuildSlidesTask({ input: { presentationId: 30 }, req: { payload } });
    buildSuccess = Boolean(build.output?.success);
    assert(buildSuccess, 'Presentation build failed');
  }

  const final: AnyRecord = await payload.findByID({
    collection: 'presentations',
    id: 30,
    depth: 0,
    overrideAccess: true,
  });
  console.log(JSON.stringify({ ...summary, updatedAt: final.updatedAt, buildSuccess }));
});
