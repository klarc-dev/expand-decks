import { escape, md } from '../utils';

export type OfficesBlockData = {
  blockType: 'offices';
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  offices?: Array<{
    name: string;
    region?: string | null;
    label?: string | null;
    specialties?: string | null;
  }> | null;
};

export function renderOffices(block: OfficesBlockData): string {
  const eyebrow = block.eyebrow
    ? `\n<div class="k-eyebrow mb-6">${escape(block.eyebrow)}</div>`
    : '';

  const subtitle = block.subtitle
    ? `\n<p class="text-base opacity-70 max-w-xl mb-14">\n  ${md(block.subtitle)}\n</p>`
    : '';

  const officeCount = (block.offices ?? []).length || 2;
  const gridClass = `k-grid-${Math.min(officeCount, 4)}`;

  const offices = (block.offices ?? [])
    .map((office) => {
      const label = office.label
        ? `\n      <div class="k-num">${escape(office.label)}</div>`
        : '';
      const region = office.region
        ? `\n      <div class="text-xs tracking-wider uppercase opacity-60">${escape(office.region)}</div>`
        : '';
      const specialties = office.specialties
        ? `\n  <hr class="k-divider" style="margin: 1.5rem 0;"/>\n  <p class="text-sm">\n    ${escape(office.specialties)}\n  </p>`
        : '';

      return `<div class="k-card" style="padding: 2rem;">\n  <div class="flex items-start justify-between mb-4">\n    <div>${label}\n      <h3 class="text-2xl mb-2" style="font-size: 2rem;">${escape(office.name)}</h3>${region}\n    </div>\n    <div class="w-3 h-3 rounded-full" style="background: var(--k-rose);"></div>\n  </div>${specialties}\n</div>`;
    })
    .join('\n\n');

  return `---
layout: default
class: relative
---

<div class="px-14 pt-24">
${eyebrow}
<h2 class="text-5xl mb-2">${md(block.title)}</h2>${subtitle}

<div class="${gridClass}">

${offices}

</div>

</div>`;
}
