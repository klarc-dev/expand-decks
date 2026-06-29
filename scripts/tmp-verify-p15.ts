import { writeFileSync } from 'node:fs';
import config from '@payload-config';
import { getPayload } from 'payload';

function lexToText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (typeof n.text === 'string') return n.text;
  const root = (n.root as Record<string, unknown>) ?? n;
  const children = (root.children as unknown[]) ?? [];
  return children.map(lexToText).join(' ').replace(/\s+/g, ' ').trim();
}
const txt = (v: unknown) =>
  v == null
    ? ''
    : typeof v === 'string'
      ? v
      : typeof v === 'object' && 'root' in (v as object)
        ? lexToText(v)
        : JSON.stringify(v);

async function main() {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    collection: 'presentations',
    id: 15,
    depth: 2,
    overrideAccess: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slides = (doc.slides ?? []) as any[];
  const out: string[] = [];
  slides.forEach((b, i) => {
    out.push(`\n== SLIDE ${i + 1} [${b.blockType}] ==`);
    for (const [k, v] of Object.entries(b)) {
      if (['id', 'blockType', 'blockName', 'footnotes'].includes(k)) continue;
      if (Array.isArray(v)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        v.forEach((it: any, j: number) => {
          if (it && typeof it === 'object') {
            if (Array.isArray(it.cells)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              out.push(`  ${k}[${j}] cells: ${it.cells.map((c: any) => txt(c.value)).join(' | ')}`);
            } else {
              const parts = Object.entries(it)
                .filter(([kk]) => !['id'].includes(kk))
                .map(([kk, vv]) => `${kk}="${txt(vv)}"`);
              out.push(`  ${k}[${j}] ${parts.join(' | ')}`);
            }
          }
        });
      } else {
        const t = txt(v);
        if (t) out.push(`  ${k}: ${t}`);
      }
    }
  });
  const s = out.join('\n');
  writeFileSync('/tmp/p15-verify.txt', s, 'utf-8');
  console.log(`Wrote /tmp/p15-verify.txt (${slides.length} blocks, ${s.length} chars)`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
