export type ParsedSlide = {
  index: number;
  frontmatter: Record<string, unknown>;
  body: string;
  notes: string | null;
};

export type ParsedDeck = {
  headmatter: Record<string, unknown>;
  slides: ParsedSlide[];
};
