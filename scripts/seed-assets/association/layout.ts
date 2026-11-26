export type Page = { blockType: string; title: string; [key: string]: unknown };

export function cards(
  eyebrow: string,
  title: string,
  rows: [string, string][],
  sources: string[] = [],
  sidebarText?: string,
): Page {
  // A worked example deserves a reading order: facts and first proposition on the
  // left, alternatives on the right. Avoid a lone low strip of tiny cards.
  if (sidebarText && sidebarText.length <= 220 && rows.length >= 2 && rows.length <= 3) {
    const [label, text] = rows[0]!;
    const alternatives = rows.slice(1);
    return {
      blockType: 'twoCols',
      eyebrow,
      title,
      intro: `**${label}**\n\n${text}`,
      leftFooter: sidebarText,
      rightCards: alternatives.map(([title, description]) => ({ title, description })),
      footnotes: sources.map((text) => ({ text })),
    };
  }
  return {
    blockType: 'cardGrid',
    eyebrow,
    title,
    ...(sidebarText ? { sidebarText } : {}),
    columns: rows.length === 3 ? '3' : '2',
    cards: rows.map(([title, description]) => ({ title, description })),
    footnotes: sources.map((text) => ({ text })),
  };
}

export function table(
  eyebrow: string,
  title: string,
  lead: string,
  headers: string[],
  rows: string[][],
  sources: string[] = [],
): Page {
  return {
    blockType: 'table',
    eyebrow,
    title,
    lead,
    columns: headers.map((header) => ({ header })),
    rows: rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
    footnotes: sources.map((text) => ({ text })),
  };
}
