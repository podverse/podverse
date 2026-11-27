export interface DTOChannelPerson {
  id: number;
  channel_id: number;
  name: string;
  role: string | null;
  person_group: string;
  img: string | null;
  href: string | null;
  /** Public id of the directory person this credit resolves to. Absent on older stored payloads. */
  person_id_text?: string | null;
}
