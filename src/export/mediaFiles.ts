/** Referenced staged media, including JSON-valued chrome headmatter. */
export function referencedMediaFiles(markdown: string): string[] {
  const filenames = Array.from(
    markdown.matchAll(/(?:["']|image:\s*)(?:\.\/|\/)media\/([^"'\s]+)/g),
    (match) => match[1]!,
  );
  return [...new Set(filenames)];
}

/** Uploads are flat files: never let authored paths escape the media directory. */
export function assertMediaFilename(filename: string): void {
  if (!filename || filename === '.' || filename === '..' || /[/\\\x00-\x1f]/.test(filename)) {
    throw new Error('Invalid staged media filename');
  }
}
