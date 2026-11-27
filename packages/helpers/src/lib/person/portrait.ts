/**
 * One credit that can supply the portrait on the People list and a Person page.
 * Channel and item rows keep the image from their own tag and do not use this choice.
 */
export type PersonPortraitCredit = {
  at: string | null;
  group: string | null;
  img: string | null;
  kind: 'channel' | 'item';
};

function newestImage(credits: readonly PersonPortraitCredit[]): string | null {
  const sorted = [...credits].sort((left, right) => {
    const leftAt = left.at ?? '';
    const rightAt = right.at ?? '';
    if (leftAt === rightAt) {
      return 0;
    }
    return leftAt < rightAt ? 1 : -1;
  });
  return sorted[0]?.img ?? null;
}

/**
 * Portrait for the People list and Person page.
 *
 * A crew credit on a channel comes first, because that image is the one the person is most
 * likely to have chosen. Any other channel credit comes next. An item credit is last. Several
 * images in the same step use the latest activity time.
 */
export function choosePersonListImage(credits: readonly PersonPortraitCredit[]): string | null {
  const withImage = credits.filter((credit) => credit.img !== null && credit.img.trim() !== '');
  const crew = withImage.filter((credit) => credit.kind === 'channel' && credit.group === 'crew');
  if (crew.length > 0) {
    return newestImage(crew);
  }
  const channel = withImage.filter((credit) => credit.kind === 'channel');
  if (channel.length > 0) {
    return newestImage(channel);
  }
  return newestImage(withImage.filter((credit) => credit.kind === 'item'));
}
