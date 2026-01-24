function removeLeadingArticle(input: string): string {
  const english = /^(the|a|an)\s+/i;
  const patterns = [english];

  for (const pattern of patterns) {
    if (pattern.test(input)) {
      return input.replace(pattern, '');
    }
  }
  return input;
}

export function createSortableTitle(input: string): string {
  const noArticle = removeLeadingArticle(input);
  return noArticle
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}
