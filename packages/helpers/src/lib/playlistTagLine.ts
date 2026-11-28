export const formatPlaylistTagLine = (tags: readonly string[] | undefined): string | null => {
  if (tags === undefined) {
    return null;
  }
  const names: string[] = [];
  for (const tag of tags) {
    const name = tag.trim();
    if (name.length > 0) {
      names.push(name);
    }
  }
  if (names.length === 0) {
    return null;
  }
  return names.join(', ');
};
