import type { FindOptionsRelations } from 'typeorm';

interface RelationMap {
  [key: string]: boolean | RelationMap;
}

function isRelationMap(value: boolean | RelationMap | undefined): value is RelationMap {
  return typeof value === 'object' && value !== null;
}

function asFindOptionsRelations<T>(map: RelationMap): FindOptionsRelations<T> {
  // RelationMap is structurally compatible with TypeORM's relations object; generic T cannot be inferred per key.
  return map as FindOptionsRelations<T>;
}

function setRelationPath(target: RelationMap, segments: string[]): void {
  const [head, ...rest] = segments;
  if (head === undefined) {
    return;
  }
  if (rest.length === 0) {
    const current = target[head];
    if (isRelationMap(current)) {
      return;
    }
    target[head] = true;
    return;
  }
  const current = target[head];
  if (current === true || current === undefined) {
    target[head] = {};
  }
  const nested = target[head];
  if (isRelationMap(nested)) {
    setRelationPath(nested, rest);
  }
}

function mergeRelationMapsCore(left: RelationMap, right: RelationMap): RelationMap {
  const merged: RelationMap = { ...left };
  for (const [key, rightValue] of Object.entries(right)) {
    const leftValue = merged[key];
    if (leftValue === undefined) {
      merged[key] = rightValue;
      continue;
    }
    if (leftValue === true) {
      if (isRelationMap(rightValue)) {
        merged[key] = rightValue;
      }
      continue;
    }
    if (isRelationMap(leftValue) && isRelationMap(rightValue)) {
      merged[key] = mergeRelationMapsCore(leftValue, rightValue);
    }
  }
  return merged;
}

function mergeRelationMaps<T>(left: RelationMap, right: RelationMap): FindOptionsRelations<T> {
  return asFindOptionsRelations<T>(mergeRelationMapsCore(left, right));
}

/** Converts legacy string relation paths to TypeORM v1 nested `relations` objects. */
export function findOptionsRelationsFromPaths<T>(
  paths: readonly string[]
): FindOptionsRelations<T> {
  const result: RelationMap = {};
  for (const path of paths) {
    setRelationPath(result, path.split('.'));
  }
  return asFindOptionsRelations<T>(result);
}

function toRelationMap<T>(relations: FindOptionsRelations<T>): RelationMap {
  return relations as RelationMap;
}

function isRelationPathList<T>(
  extra: FindOptionsRelations<T> | readonly string[]
): extra is readonly string[] {
  return Array.isArray(extra);
}

export function mergeFindOptionsRelations<T>(
  base: FindOptionsRelations<T>,
  extra?: FindOptionsRelations<T> | readonly string[]
): FindOptionsRelations<T> {
  if (extra === undefined) {
    return base;
  }
  if (isRelationPathList(extra)) {
    return mergeRelationMaps<T>(
      toRelationMap(base),
      toRelationMap(findOptionsRelationsFromPaths<T>(extra))
    );
  }
  return mergeRelationMaps<T>(toRelationMap(base), toRelationMap(extra));
}
