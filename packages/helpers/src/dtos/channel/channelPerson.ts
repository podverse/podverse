export interface DTOChannelPerson {
  id: number;
  channel_id: number;
  name: string;
  role: string | null;
  person_group: string;
  img: string | null;
  href: string | null;
}
