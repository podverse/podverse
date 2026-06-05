type SharableStatusRelationWire = number | { id?: number | null } | null | undefined;

const isSharableStatusRelationObject = (
  value: SharableStatusRelationWire
): value is { id?: number | null } => {
  return value !== null && typeof value === 'object';
};

/**
 * Resolves canonical sharable status id from scalar FK or loaded relation shape.
 */
export function resolveSharableStatusId(entity: {
  sharable_status_id?: number | null;
  sharable_status?: unknown;
}): number | undefined {
  if (entity.sharable_status_id !== null && entity.sharable_status_id !== undefined) {
    return entity.sharable_status_id;
  }

  const relation = entity.sharable_status;
  if (relation === null || relation === undefined) {
    return undefined;
  }

  if (typeof relation === 'number') {
    return relation;
  }

  if (isSharableStatusRelationObject(relation)) {
    const id = relation.id;
    if (id !== null && id !== undefined) {
      return id;
    }
  }

  return undefined;
}
