export interface DTOItemEnclosureIntegrity {
  id: number;
  item_enclosure_id: number;
  type: 'sri' | 'pgp-signature';
  value: string;
}
