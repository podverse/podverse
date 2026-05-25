import { CrudMask, hasCrud } from '@management-api/lib/crud.js';
import { describe, expect, it } from 'vitest';

describe('hasCrud', () => {
  it('returns true when the bit is set', () => {
    expect(hasCrud(15, 'create')).toBe(true);
    expect(hasCrud(15, 'read')).toBe(true);
    expect(hasCrud(15, 'update')).toBe(true);
    expect(hasCrud(15, 'delete')).toBe(true);
  });

  it('returns false when the bit is not set', () => {
    expect(hasCrud(0, 'create')).toBe(false);
    expect(hasCrud(0, 'read')).toBe(false);
    expect(hasCrud(0, 'update')).toBe(false);
    expect(hasCrud(0, 'delete')).toBe(false);
  });

  it('checks individual bits correctly', () => {
    expect(hasCrud(CrudMask.create, 'create')).toBe(true);
    expect(hasCrud(CrudMask.create, 'read')).toBe(false);
    expect(hasCrud(CrudMask.read, 'read')).toBe(true);
    expect(hasCrud(CrudMask.update, 'update')).toBe(true);
    expect(hasCrud(CrudMask.delete, 'delete')).toBe(true);
    expect(hasCrud(CrudMask.read, 'create')).toBe(false);
  });

  it('handles combined permissions', () => {
    const readWrite = CrudMask.read | CrudMask.update; // 6
    expect(hasCrud(readWrite, 'read')).toBe(true);
    expect(hasCrud(readWrite, 'update')).toBe(true);
    expect(hasCrud(readWrite, 'create')).toBe(false);
    expect(hasCrud(readWrite, 'delete')).toBe(false);
  });
});
