/** CRUD bitmask: create=1, read=2, update=4, delete=8. Value 0-15. */
export const CrudMask = { create: 1, read: 2, update: 4, delete: 8 } as const;

export type CrudOp = keyof typeof CrudMask;

export function hasCrud(crud: number, op: CrudOp): boolean {
  return (crud & CrudMask[op]) !== 0;
}
