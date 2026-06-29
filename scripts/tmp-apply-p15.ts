/**
 * TEMP: apply the KB-grounded concision/accuracy edits to presentation 15.
 * Edits are keyed by block id / child id (stable), so structure is preserved.
 * Rich-text fields are passed as { rich: '...' } and converted via Lexical.
 * Run: pnpm dlx tsx --env-file=.env scripts/tmp-apply-p15.ts
 */
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical';
import config from '@payload-config';
import { getPayload } from 'payload';

type Rich = { rich: string };
type FieldVal = string | Rich;
type ChildEdits = Record<string, Record<string, Record<string, FieldVal>>>;
interface BlockEdit {
  fields?: Record<string, FieldVal>;
  children?: ChildEdits;
  cells?: Record<string, Record<number, string>>; // rowId -> cellIndex -> text (rich)
}

const isRich = (v: FieldVal): v is Rich => typeof v === 'object' && v !== null && 'rich' in v;

const EDITS: Record<string, BlockEdit> = {
  // 1 — cover
  '6a4244e3e16aa96d70ec7f8c': {
    fields: {
      subtitle: {
        rich: 'Qualifier, exploiter, concéder ou céder un actif de PI : les réflexes fiscaux à sécuriser, avec les preuves utiles en cas de contrôle.',
      },
      footerRight: { rich: 'Brevets · logiciels · savoir-faire · marques : régimes distincts' },
    },
  },
  // 2 — agenda
  '6a4244e3e16aa96d70ec7f92': {
    children: {
      items: {
        '6a4244e3e16aa96d70ec7f90': { label: 'Tester l’option IP Box' },
        '6a4244e3e16aa96d70ec7f91': {
          description: 'Cession, plus-value, gratuité apparente et preuves de contrôle.',
        },
      },
    },
  },
  // 3 — twoCols qualification
  '6a4244e3e16aa96d70ec7f97': {
    fields: {
      leftFooter: { rich: 'Réflexe : qualifier séparément l’actif, le contrat et le flux.' },
    },
    children: {
      rightCards: {
        '6a4244e3e16aa96d70ec7f95': {
          description: {
            rich: 'Actif si le droit est identifiable, contrôlé et durable ; sinon, charge.',
          },
        },
        '6a4244e3e16aa96d70ec7f96': {
          description: {
            rich: 'La qualification oriente redevances, TVA, amortissement, cession et option IP Box.',
          },
        },
      },
    },
  },
  // 4 — cardGrid 4 critères
  '6a4244e3e16aa96d70ec7f9c': {
    fields: { title: 'Immobilisation incorporelle : 4 questions' },
    children: {
      cards: {
        '6a4244e3e16aa96d70ec7f98': {
          description: {
            rich: 'Droit séparable, cessible ou issu d’un droit contractuel ou protégé.',
          },
        },
        '6a4244e3e16aa96d70ec7f9b': {
          title: 'Durée d’utilisation',
          description: {
            rich: 'Amortir si la durée est finie ou prévisible ; sinon, tester la dépréciation.',
          },
        },
      },
    },
  },
  // 5 — table divisibilité
  '6a4244e3e16aa96d70ec7fb4': {
    cells: {
      '6a4244e3e16aa96d70ec7fa3': { 0: 'Brevets / inventions brevetables' },
      '6a4244e3e16aa96d70ec7fa7': {
        1: 'Régime à qualifier ; IP Box seulement si conditions spécifiques réunies.',
      },
      '6a4244e3e16aa96d70ec7fab': {
        2: 'Périmètre : utilisateurs, modules, code source, durée ; services associés à isoler.',
      },
    },
  },
  // 6 — twoCols valorisation
  '6a4244e3e16aa96d70ec7fb9': {
    fields: {
      intro: {
        rich: 'La valorisation documente l’économie de l’opération. Le régime fiscal dépend ensuite du droit, du contrat et du flux.',
      },
    },
    children: {
      rightCards: {
        '6a4244e3e16aa96d70ec7fb7': {
          description: {
            rich: 'À l’IS, rattacher le produit quand la créance est acquise : certaine et déterminable.',
          },
        },
        '6a4244e3e16aa96d70ec7fb8': {
          description: {
            rich: 'Droits incorporels = services ; vérifier territorialité, fait générateur et exigibilité.',
          },
        },
      },
    },
  },
  // 7 — twoCols entrée
  '6a4244e3e16aa96d70ec7fbe': {
    fields: {
      leftFooter: { rich: 'Ne pas confondre comptabilité, crédit d’impôt recherche et IP Box.' },
    },
    children: {
      rightCards: {
        '6a4244e3e16aa96d70ec7fba': {
          description: {
            rich: 'Suivre R&D, inscription éventuelle à l’actif et lien R&D/revenus.',
          },
        },
      },
    },
  },
  // 8 — table frais d'entrée
  '6a4244e3e16aa96d70ec7fd2': {
    cells: {
      '6a4244e3e16aa96d70ec7fc5': {
        0: 'Dépôt / entretien de brevet',
        1: 'Charges R&D en principe ; immobilisation par exception justifiée.',
        2: 'À distinguer d’un titre acquis ou de coûts directs de production.',
      },
    },
  },
  // 10 — cardGrid amortissement
  '6a4244e3e16aa96d70ec7fd8': {
    fields: { title: 'Amortir l’incorporel : seulement si la durée d’utilité est limitée' },
    children: {
      cards: {
        '6a4244e3e16aa96d70ec7fd4': {
          description: { rich: 'Répartir le coût sur la durée normale prévisible d’utilisation.' },
        },
        '6a4244e3e16aa96d70ec7fd6': {
          title: 'Base = valeur inscrite',
          description: {
            rich: 'Partir de la valeur d’origine, puis appliquer les retraitements fiscaux.',
          },
        },
        '6a4244e3e16aa96d70ec7fd7': {
          title: 'Écart fiscal / comptable',
          description: {
            rich: 'Isoler l’écart si le rythme fiscal admis diffère du rythme comptable.',
          },
        },
      },
    },
  },
  // 11 — twoCols dépréciation
  '6a4244e3e16aa96d70ec7fdd': {
    children: {
      rightCards: {
        '6a4244e3e16aa96d70ec7fdb': {
          description: {
            rich: 'Dotation non justifiée : réintégrer ; reprise ultérieure : traiter symétriquement.',
          },
        },
      },
    },
  },
  // 12 — statement exploitation directe
  '6a4244e3e16aa96d70ec7fde': {
    fields: {
      footer: {
        rich: 'Question clé : exploiter directement ou concéder via un vrai droit éligible, documenté et au prix de marché ?',
      },
    },
  },
  // 13 — timeline concession
  '6a4244e3e16aa96d70ec7fe3': {
    children: {
      steps: {
        '6a4244e3e16aa96d70ec7fe1': {
          label: '3. TVA / prix / territorialité',
          description:
            'TVA : licence = prestation de services ; vérifier territorialité, exigibilité et prix de marché.',
        },
      },
    },
  },
  // 14 — twoCols redevances
  '6a4244e3e16aa96d70ec7fe8': {
    fields: {
      intro: {
        rich: 'Les redevances sont des produits d’exploitation. IP Box : jamais le brut — résultat net éligible × nexus, sur option.',
      },
    },
    children: {
      rightCards: {
        '6a4244e3e16aa96d70ec7fe4': {
          description: { rich: 'Imposer quand la créance est acquise : certaine et déterminable.' },
        },
        '6a4244e3e16aa96d70ec7fe6': {
          description: { rich: 'Pas les redevances brutes : résultat net éligible × nexus.' },
        },
        '6a4244e3e16aa96d70ec7fe7': {
          description: {
            rich: 'Option dans la liasse ; suivi par actif ou famille ; dossier prêt.',
          },
        },
      },
    },
  },
  // 15 — cardGrid TVA
  '6a4244e3e16aa96d70ec7fec': {
    children: {
      cards: {
        '6a4244e3e16aa96d70ec7feb': {
          title: 'Assujetti + contrepartie',
          description: {
            rich: 'Service taxable si activité économique indépendante et contrepartie ; territorialité et exigibilité à vérifier.',
          },
        },
      },
    },
  },
  // 16 — stats IP Box
  '6a4244e3e16aa96d70ec7ff1': {
    children: {
      stats: {
        '6a4244e3e16aa96d70ec7fef': {
          label: 'Ratio R&D éligible / dépenses totales : il limite la base à 10 %.',
        },
        '6a4244e3e16aa96d70ec7ff0': {
          label:
            'Brevets, inventions brevetables, logiciels protégés, procédés éligibles ; pas les marques en principe.',
        },
      },
    },
  },
  // 17 — timeline calcul IP Box (reorder: option/périmètre first)
  '6a4244e3e16aa96d70ec7ff7': {
    fields: { footer: 'Taux réduit oui — après option, assiette nette, nexus et piste d’audit.' },
    children: {
      steps: {
        '6a4244e3e16aa96d70ec7ff2': {
          label: '1. Option / périmètre',
          description: 'Choisir actif, bien ou famille : le périmètre pilote le calcul.',
        },
        '6a4244e3e16aa96d70ec7ff3': {
          label: '2. Résultat net',
          description:
            'Revenus ou plus-values éligibles – dépenses R&D rattachées ; jamais le brut.',
        },
        '6a4244e3e16aa96d70ec7ff4': {
          label: '3. Ratio nexus',
          description: 'Mesurer la part de R&D réellement supportée par l’entreprise.',
        },
        '6a4244e3e16aa96d70ec7ff5': {
          label: '4. Base à 10 %',
          description: 'Seule la base couverte par le nexus relève du taux réduit.',
        },
        '6a4244e3e16aa96d70ec7ff6': {
          label: '5. Annexe et dossier',
          description: 'Option, actifs, revenus, dépenses, nexus et calculs prêts au contrôle.',
        },
      },
    },
  },
  // 18 — twoCols cession
  '6a4244e3e16aa96d70ec7ffd': {
    children: {
      rightCards: {
        '6a4244e3e16aa96d70ec7ff8': {
          description: {
            rich: 'Transfert de propriété ou simple licence ? Puis durée, territoire, exclusivité.',
          },
        },
        '6a4244e3e16aa96d70ec7ffc': {
          description: {
            rich: 'Droits incorporels = prestation de services ; vérifier territorialité et exigibilité.',
          },
        },
      },
    },
  },
  // 19 — cardGrid cession régime
  '6a4244e3e16aa96d70ec8001': {
    fields: {
      title: 'Cession à l’IS : droit commun, puis art. 238 si conditions réunies',
      sidebarText: {
        rich: 'Par défaut : IS au taux normal. Art. 238 seulement si actif éligible, option, résultat net et nexus documentés.',
      },
    },
    children: {
      cards: {
        '6a4244e3e16aa96d70ec7fff': {
          description: {
            rich: '10 % sur le résultat net éligible, après dépenses rattachées et nexus.',
          },
        },
        '6a4244e3e16aa96d70ec8000': {
          description: { rich: 'Option + annexe art. 238 + nexus + cohérence avec la liasse.' },
        },
      },
    },
  },
  // 20 — statement gratuité
  '6a4244e3e16aa96d70ec8002': {
    fields: {
      body: {
        rich: 'Abandon, mise à disposition ou transfert sans prix peuvent révéler un avantage. En groupe, documenter intérêt social, valeur et prix de pleine concurrence. Risque : acte anormal de gestion ou avantage occulte si le prix ou l’intérêt social manque.',
      },
      footer: {
        rich: 'Toujours isoler : bien transmis, valeur, titulaire réel, acte qui transfère l’avantage.',
      },
    },
  },
  // 21 — cardGrid documentation
  '6a4244e3e16aa96d70ec8006': {
    fields: { title: 'Documentation : la checklist qui sauve le régime fiscal' },
    children: {
      cards: {
        '6a4244e3e16aa96d70ec8003': {
          title: 'Actif / contrat',
          description: {
            rich: 'Titre, contrat, droits, durée, territoire, titulaire et preuves de création.',
          },
        },
        '6a4244e3e16aa96d70ec8004': {
          title: 'Calculs / déclarations',
          description: {
            rich: 'PV, résultat net IP Box, option, annexe art. 238, TVA et liasse cohérents.',
          },
        },
        '6a4244e3e16aa96d70ec8005': {
          title: 'Pleine concurrence',
          description: { rich: 'Méthode, comparables, intérêt social et preuves de contrepartie.' },
        },
      },
    },
  },
  // 22 — cta conclusion
  '6a4244e3e16aa96d70ec8007': {
    fields: {
      subtitle: {
        rich: 'Qualifier le droit avant le flux. Documenter éligibilité, option, revenus, dépenses/nexus et TVA. Revoir chaque cession ou licence avant signature.',
      },
      secondaryAction: 'Checklist : inventaire PI · contrats · option IP Box · TVA · preuves.',
    },
  },
};

async function main() {
  const payload = await getPayload({ config });
  const editorConfig = await editorConfigFactory.default({ config: payload.config });
  const rt = (markdown: string) => convertMarkdownToLexical({ editorConfig, markdown }) as unknown;

  const doc = await payload.findByID({
    collection: 'presentations',
    id: 15,
    depth: 2,
    overrideAccess: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slides = (doc.slides ?? []) as any[];

  let applied = 0;
  const setField = (obj: Record<string, unknown>, key: string, val: FieldVal) => {
    obj[key] = isRich(val) ? rt(val.rich) : val;
    applied++;
  };

  for (const block of slides) {
    const edit = EDITS[block.id];
    if (!edit) continue;

    if (edit.fields) for (const [k, v] of Object.entries(edit.fields)) setField(block, k, v);

    if (edit.children) {
      for (const [arrKey, byId] of Object.entries(edit.children)) {
        const arr = block[arrKey] as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(arr)) throw new Error(`block ${block.id}: missing array ${arrKey}`);
        for (const [childId, fields] of Object.entries(byId)) {
          const child = arr.find((c) => c.id === childId);
          if (!child) throw new Error(`block ${block.id}: missing child ${childId} in ${arrKey}`);
          for (const [k, v] of Object.entries(fields)) setField(child, k, v);
        }
      }
    }

    if (edit.cells) {
      const rows = block.rows as Array<{ id: string; cells: Array<{ value: unknown }> }>;
      for (const [rowId, byIdx] of Object.entries(edit.cells)) {
        const row = rows.find((r) => r.id === rowId);
        if (!row) throw new Error(`block ${block.id}: missing row ${rowId}`);
        for (const [idxStr, text] of Object.entries(byIdx)) {
          const idx = Number(idxStr);
          if (!row.cells[idx])
            throw new Error(`block ${block.id}: row ${rowId} missing cell ${idx}`);
          row.cells[idx].value = rt(text);
          applied++;
        }
      }
    }
  }

  await payload.update({
    collection: 'presentations',
    id: 15,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { slides } as any,
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  console.log(
    `Applied ${applied} field edits across ${Object.keys(EDITS).length} blocks to presentation 15.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
