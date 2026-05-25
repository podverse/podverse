import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';

import {
  getTablePolicy,
  type TableFieldDefinition,
  type TablePolicyDefinition,
} from './tablePolicy.js';

type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'in'
  | 'is_null'
  | 'is_not_null';

type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value?: unknown;
};

type SortCondition = {
  field: string;
  direction: 'ASC' | 'DESC';
};

type QueryOptions = {
  filters: FilterCondition[];
  sorts: SortCondition[];
  page: number;
  pageSize: number;
};

type MutationData = Record<string, unknown>;

class DatabaseQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseQueryError';
  }
}

function validateFieldName(field: string, policy: TablePolicyDefinition): TableFieldDefinition {
  const def = policy.fields.find((f) => f.name === field);
  if (!def) {
    throw new DatabaseQueryError(
      `Field "${field}" is not allowlisted for table "${policy.tableName}"`
    );
  }
  return def;
}

function validateFilterOperators(filters: FilterCondition[], policy: TablePolicyDefinition): void {
  if (filters.length > policy.maxFilters) {
    throw new DatabaseQueryError(
      `Too many filters (${filters.length}). Maximum is ${policy.maxFilters} for table "${policy.tableName}"`
    );
  }

  for (const filter of filters) {
    validateFieldName(filter.field, policy);

    const needsValue = filter.operator !== 'is_null' && filter.operator !== 'is_not_null';
    if (needsValue && filter.value === undefined) {
      throw new DatabaseQueryError(
        `Filter on "${filter.field}" with operator "${filter.operator}" requires a value`
      );
    }

    if (filter.operator === 'in') {
      if (!Array.isArray(filter.value)) {
        throw new DatabaseQueryError(`Filter "in" on "${filter.field}" requires an array value`);
      }
      if (filter.value.length > policy.maxInValues) {
        throw new DatabaseQueryError(
          `Too many values in "in" filter on "${filter.field}" (${filter.value.length}). Maximum is ${policy.maxInValues}`
        );
      }
    }

    if (filter.operator === 'like') {
      if (typeof filter.value !== 'string') {
        throw new DatabaseQueryError(`Filter "like" on "${filter.field}" requires a string value`);
      }
      if (filter.value.length > 100) {
        throw new DatabaseQueryError(
          `Filter "like" on "${filter.field}" value too long (max 100 characters)`
        );
      }
    }
  }
}

function validateSorts(sorts: SortCondition[], policy: TablePolicyDefinition): void {
  if (sorts.length > policy.maxSorts) {
    throw new DatabaseQueryError(
      `Too many sort clauses (${sorts.length}). Maximum is ${policy.maxSorts} for table "${policy.tableName}"`
    );
  }
  for (const sort of sorts) {
    validateFieldName(sort.field, policy);
    if (sort.direction !== 'ASC' && sort.direction !== 'DESC') {
      throw new DatabaseQueryError(`Invalid sort direction "${sort.direction}" on "${sort.field}"`);
    }
  }
}

function validateMutationData(
  data: MutationData,
  policy: TablePolicyDefinition,
  requireUpdatable: boolean
): void {
  const keys = Object.keys(data);
  if (keys.length > 20) {
    throw new DatabaseQueryError(`Too many fields in mutation (${keys.length}). Maximum is 20`);
  }
  for (const [key, value] of Object.entries(data)) {
    const def = validateFieldName(key, policy);
    if (requireUpdatable && !def.updatable) {
      throw new DatabaseQueryError(
        `Field "${key}" is not updatable in table "${policy.tableName}"`
      );
    }

    if (value === null) {
      if (!def.nullable) {
        throw new DatabaseQueryError(
          `Field "${key}" is not nullable in table "${policy.tableName}"`
        );
      }
    } else {
      validateFieldValueType(key, value, def);
    }
  }
}

function validateFieldValueType(field: string, value: unknown, def: TableFieldDefinition): void {
  switch (def.type) {
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new DatabaseQueryError(`Field "${field}" must be an integer`);
      }
      break;
    case 'text':
      if (typeof value !== 'string') {
        throw new DatabaseQueryError(`Field "${field}" must be a string`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new DatabaseQueryError(`Field "${field}" must be a boolean`);
      }
      break;
    case 'timestamp':
      if (typeof value !== 'string') {
        throw new DatabaseQueryError(`Field "${field}" must be a ISO timestamp string`);
      }
      break;
  }
}

function buildWhereClause(
  filters: FilterCondition[],
  _policy: TablePolicyDefinition,
  params: unknown[],
  paramIndex: { value: number }
): string {
  if (filters.length === 0) return '';

  const clauses: string[] = [];
  for (const filter of filters) {
    const idx = paramIndex.value++;
    switch (filter.operator) {
      case 'eq':
        clauses.push(`"${filter.field}" = $${idx}`);
        params.push(filter.value);
        break;
      case 'neq':
        clauses.push(`"${filter.field}" != $${idx}`);
        params.push(filter.value);
        break;
      case 'gt':
        clauses.push(`"${filter.field}" > $${idx}`);
        params.push(filter.value);
        break;
      case 'gte':
        clauses.push(`"${filter.field}" >= $${idx}`);
        params.push(filter.value);
        break;
      case 'lt':
        clauses.push(`"${filter.field}" < $${idx}`);
        params.push(filter.value);
        break;
      case 'lte':
        clauses.push(`"${filter.field}" <= $${idx}`);
        params.push(filter.value);
        break;
      case 'like':
        clauses.push(`"${filter.field}" LIKE $${idx}`);
        params.push(`%${filter.value}%`);
        break;
      case 'in': {
        const values = filter.value as unknown[];
        const placeholders = values.map(() => {
          const i = paramIndex.value++;
          params.push(values[placeholders.length] ?? null);
          return `$${i}`;
        });
        clauses.push(`"${filter.field}" IN (${placeholders.join(', ')})`);
        break;
      }
      case 'is_null':
        clauses.push(`"${filter.field}" IS NULL`);
        break;
      case 'is_not_null':
        clauses.push(`"${filter.field}" IS NOT NULL`);
        break;
    }
  }
  return `WHERE ${clauses.join(' AND ')}`;
}

function buildOrderByClause(sorts: SortCondition[], policy: TablePolicyDefinition): string {
  if (sorts.length === 0) {
    return `ORDER BY "${policy.defaultSortField}" ${policy.defaultSortDirection}`;
  }
  return `ORDER BY ${sorts.map((s) => `"${s.field}" ${s.direction}`).join(', ')}`;
}

function buildSelectFields(policy: TablePolicyDefinition): string {
  return policy.fields.map((f) => `"${f.name}"`).join(', ');
}

export class DatabaseQueryEngine {
  async queryTable(
    tableName: string,
    options: QueryOptions
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const policy = getTablePolicy(tableName);
    if (!policy) {
      throw new DatabaseQueryError(`Table "${tableName}" is not allowlisted`);
    }

    validateFilterOperators(options.filters, policy);
    validateSorts(options.sorts, policy);

    const pageSize = Math.min(options.pageSize, policy.maxPageSize);
    const offset = (options.page - 1) * pageSize;

    const params: unknown[] = [];
    const paramIndex = { value: 1 };

    const whereClause = buildWhereClause(options.filters, policy, params, paramIndex);
    const orderByClause = buildOrderByClause(options.sorts, policy);
    const selectFields = buildSelectFields(policy);

    const countParams = [...params];
    const countQuery = `SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`;
    const countResult = await AppDbDataSourceRead.query(countQuery, countParams);
    const total = parseInt(countResult[0].total, 10);

    const pIdx = paramIndex.value;
    const dataQuery = `SELECT ${selectFields} FROM "${tableName}" ${whereClause} ${orderByClause} LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const dataParams = [...params, pageSize, offset];
    const rows = await AppDbDataSourceRead.query(dataQuery, dataParams);

    return { rows, total };
  }

  async getRow(tableName: string, id: number): Promise<Record<string, unknown> | null> {
    const policy = getTablePolicy(tableName);
    if (!policy) {
      throw new DatabaseQueryError(`Table "${tableName}" is not allowlisted`);
    }

    const selectFields = buildSelectFields(policy);
    const query = `SELECT ${selectFields} FROM "${tableName}" WHERE "${policy.primaryKeyField}" = $1 LIMIT 1`;
    const rows = await AppDbDataSourceRead.query(query, [id]);

    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  }

  async createRow(tableName: string, data: MutationData): Promise<Record<string, unknown>> {
    const policy = getTablePolicy(tableName);
    if (!policy) {
      throw new DatabaseQueryError(`Table "${tableName}" is not allowlisted`);
    }
    if (policy.readOnly) {
      throw new DatabaseQueryError(`Table "${tableName}" is read-only`);
    }

    validateMutationData(data, policy, false);

    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const fieldList = fields.map((f) => `"${f}"`).join(', ');

    const insertQuery = `INSERT INTO "${tableName}" (${fieldList}) VALUES (${placeholders}) RETURNING *`;
    const result = await AppDbDataSourceReadWrite.query(insertQuery, values);

    return result[0];
  }

  async updateRow(
    tableName: string,
    id: number,
    data: MutationData
  ): Promise<Record<string, unknown> | null> {
    const policy = getTablePolicy(tableName);
    if (!policy) {
      throw new DatabaseQueryError(`Table "${tableName}" is not allowlisted`);
    }
    if (policy.readOnly) {
      throw new DatabaseQueryError(`Table "${tableName}" is read-only`);
    }

    validateMutationData(data, policy, true);

    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClauses = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');

    const updateQuery = `UPDATE "${tableName}" SET ${setClauses} WHERE "${policy.primaryKeyField}" = $${fields.length + 1} RETURNING *`;
    const result = await AppDbDataSourceReadWrite.query(updateQuery, [...values, id]);

    if (result.length === 0) {
      return null;
    }
    return result[0];
  }

  async deleteRow(tableName: string, id: number): Promise<boolean> {
    const policy = getTablePolicy(tableName);
    if (!policy) {
      throw new DatabaseQueryError(`Table "${tableName}" is not allowlisted`);
    }
    if (policy.readOnly) {
      throw new DatabaseQueryError(`Table "${tableName}" is read-only`);
    }

    const deleteQuery = `DELETE FROM "${tableName}" WHERE "${policy.primaryKeyField}" = $1`;
    const result = await AppDbDataSourceReadWrite.query(deleteQuery, [id]);

    return result.length > 0;
  }
}

export type { FilterCondition, FilterOperator, MutationData, QueryOptions, SortCondition };
export { DatabaseQueryError, getTablePolicy };
