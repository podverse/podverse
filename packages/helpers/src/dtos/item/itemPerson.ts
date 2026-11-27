export interface DTOItemPerson {
  id: number;
  item_id: number;
  name: string;
  role: string | null;
  person_group: string | null;
  img: string | null;
  href: string | null;
  /** Public id of the directory person this credit resolves to. Absent on older stored payloads. */
  person_id_text?: string | null;
}
