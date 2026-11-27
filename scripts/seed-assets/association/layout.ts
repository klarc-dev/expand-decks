export type Page = { blockType: string; title: string; [key: string]: unknown };

export function workedCase(
  eyebrow: string,
  title: string,
  rows: [string, string][],
  sources: string[] = [],
  sidebarText?: string,
): Page {
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

/** Module opener: a native `section` slide so the agenda and numbering follow the course. */
export function section(number: string, title: string, subtitle: string): Page {
  return { blockType: 'section', number, title, subtitle };
}

export function compare(
  eyebrow: string,
  title: string,
  rows: [string, string][],
  sources: string[] = [],
  sidebarText?: string,
): Page {
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
