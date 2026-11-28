import { personNameKey } from './nameKey.js';

/** A person credit from a feed stored on the device. */
export type LocalPersonCreditInput = {
  href?: string | null;
  img?: string | null;
  name?: string | null;
  role?: string | null;
};

/** A channel person with a name, ready to list under Cast. */
export type LocalPersonCredit = {
  href: string | null;
  img: string | null;
  name: string;
  role: string | null;
};

/** One person grouped across items and livestreams. */
export type LocalPersonAppearance = {
  img: string | null;
  itemCount: number;
  name: string;
};

/** People on one item or livestream, with the instant used to pick the latest image. */
export type LocalPersonItemCredits = {
  people: readonly LocalPersonCreditInput[];
  publishedAt: Date | string | number | null | undefined;
};

export type LocalChannelPeopleSectionsInput = {
  cast: readonly LocalPersonCreditInput[];
  items: readonly LocalPersonItemCredits[];
};

export type LocalPersonSections = {
  appearances: LocalPersonAppearance[];
  cast: LocalPersonCredit[];
  hasPeople: boolean;
};

type Recency = {
  at: number | null;
  order: number;
};

type AppearanceGroup = {
  image: string | null;
  imageRecency: Recency | null;
  itemIndexes: Set<number>;
  name: string;
  nameRecency: Recency;
};

const textOrNull = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const publishedAtMs = (value: Date | string | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

/** A missing instant is older than any instant. Equal instants keep the later credit. */
const isNewer = (next: Recency, current: Recency): boolean => {
  if (next.at === null && current.at === null) {
    return next.order > current.order;
  }
  if (next.at === null) {
    return false;
  }
  if (current.at === null) {
    return true;
  }
  if (next.at !== current.at) {
    return next.at > current.at;
  }
  return next.order > current.order;
};

/**
 * Cast and Appearances for a feed that stays on the device.
 *
 * Cast keeps every channel credit that has a name, in feed order. Appearances group item and
 * livestream credits by `personNameKey`, count each person once per item, and keep the image
 * from the latest credit that has one. A person who is also in Cast stays in Appearances and
 * uses the Cast name. A name that does not produce a key is left out of Appearances.
 */
export const localChannelPeopleSections = (
  input: LocalChannelPeopleSectionsInput
): LocalPersonSections => {
  const cast: LocalPersonCredit[] = [];
  const castNames = new Map<string, string>();
  for (const credit of input.cast) {
    const name = textOrNull(credit.name);
    if (name === null) {
      continue;
    }
    cast.push({
      href: textOrNull(credit.href),
      img: textOrNull(credit.img),
      name,
      role: textOrNull(credit.role),
    });
    const key = personNameKey(name);
    if (key !== null && !castNames.has(key)) {
      castNames.set(key, name);
    }
  }

  const groups = new Map<string, AppearanceGroup>();
  let order = 0;
  for (const [itemIndex, item] of input.items.entries()) {
    const at = publishedAtMs(item.publishedAt);
    for (const credit of item.people) {
      const name = textOrNull(credit.name);
      if (name === null) {
        continue;
      }
      const key = personNameKey(name);
      if (key === null) {
        continue;
      }
      order += 1;
      const recency: Recency = { at, order };
      const img = textOrNull(credit.img);
      const existing = groups.get(key);
      if (existing === undefined) {
        groups.set(key, {
          image: img,
          imageRecency: img === null ? null : recency,
          itemIndexes: new Set([itemIndex]),
          name,
          nameRecency: recency,
        });
        continue;
      }
      existing.itemIndexes.add(itemIndex);
      if (isNewer(recency, existing.nameRecency)) {
        existing.name = name;
        existing.nameRecency = recency;
      }
      if (
        img !== null &&
        (existing.imageRecency === null || isNewer(recency, existing.imageRecency))
      ) {
        existing.image = img;
        existing.imageRecency = recency;
      }
    }
  }

  const appearances: LocalPersonAppearance[] = [...groups.entries()].map(([key, group]) => ({
    img: group.image,
    itemCount: group.itemIndexes.size,
    name: castNames.get(key) ?? group.name,
  }));
  appearances.sort((a, b) => {
    if (a.itemCount !== b.itemCount) {
      return b.itemCount - a.itemCount;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    appearances,
    cast,
    hasPeople: cast.length > 0 || appearances.length > 0,
  };
};
