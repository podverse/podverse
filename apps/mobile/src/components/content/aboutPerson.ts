import type { DTOChannelPerson, DTOItemPerson } from '@podverse/helpers';

/**
 * The fields a People row needs to paint a credited person. Channel and item person DTOs both
 * carry them; callers pass whichever array they own.
 */
export type AboutPerson = {
  href: string | null;
  id: number;
  img: string | null;
  name: string;
  personIdText: string | null;
  role: string | null;
};

export const toAboutPersonFromChannel = (person: DTOChannelPerson): AboutPerson => ({
  href: person.href,
  id: person.id,
  img: person.img,
  name: person.name,
  personIdText: person.person_id_text ?? null,
  role: person.role,
});

export const toAboutPersonFromItem = (person: DTOItemPerson): AboutPerson => ({
  href: person.href,
  id: person.id,
  img: person.img,
  name: person.name,
  personIdText: person.person_id_text ?? null,
  role: person.role,
});

export type AboutFundingLink = {
  id: number;
  title: string | null;
  url: string;
};

export const toAboutFundingLink = (funding: {
  id: number;
  title?: string | null;
  url: string;
}): AboutFundingLink => ({
  id: funding.id,
  title: funding.title ?? null,
  url: funding.url,
});
