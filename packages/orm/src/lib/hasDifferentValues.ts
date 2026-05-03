import { loggerService } from '@orm/factories/loggerService.js';

import { isLogLevelDebug } from '@podverse/helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNumeric(value: any): boolean {
  return value !== null && value !== '' && !isNaN(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObjectWithId(value: any): value is { id: number } {
  return value && typeof value === 'object' && 'id' in value;
}

function hasDifferentValuesNoLogs<T>(entity: T, dto: Partial<T>): boolean {
  const keys = Object.keys(dto);
  return keys.some((key) => {
    const entityValue = entity[key as keyof T];
    const dtoValue = dto[key as keyof T];

    const normalizedEntityValue = isNumeric(entityValue) ? Number(entityValue) : entityValue;
    const normalizedDtoValue = isNumeric(dtoValue) ? Number(dtoValue) : dtoValue;

    if (isObjectWithId(normalizedEntityValue) && isNumeric(normalizedDtoValue)) {
      return normalizedEntityValue.id !== normalizedDtoValue;
    }

    if (isObjectWithId(dtoValue) && isNumeric(normalizedEntityValue)) {
      return dtoValue.id !== normalizedEntityValue;
    }

    if (isObjectWithId(normalizedEntityValue) && isObjectWithId(normalizedDtoValue)) {
      return normalizedEntityValue.id !== normalizedDtoValue.id;
    }

    return normalizedEntityValue !== normalizedDtoValue;
  });
}

export function hasDifferentValues<T>(entity: T, dto: Partial<T>): boolean {
  if (!isLogLevelDebug(process.env.LOG_LEVEL)) {
    return hasDifferentValuesNoLogs(entity, dto);
  }

  // debug-mode with thorough logging
  const keys = Object.keys(dto);
  loggerService.debug(`hasDifferentValues start: keys=${JSON.stringify(keys)}`);

  const safeStringify = (v: unknown) => {
    try {
      return JSON.stringify(v);
    } catch {
      try {
        return String(v);
      } catch {
        return '[unserializable]';
      }
    }
  };

  return keys.some((key) => {
    const entityValue = entity[key as keyof T];
    const dtoValue = dto[key as keyof T];

    loggerService.debug(
      `Checking key="${key}" — entityValue=${safeStringify(entityValue)}, dtoValue=${safeStringify(dtoValue)}`
    );

    const normalizedEntityValue = isNumeric(entityValue) ? Number(entityValue) : entityValue;
    const normalizedDtoValue = isNumeric(dtoValue) ? Number(dtoValue) : dtoValue;

    loggerService.debug(
      `Normalized key="${key}" — normalizedEntityValue=${safeStringify(normalizedEntityValue)}, normalizedDtoValue=${safeStringify(normalizedDtoValue)}`
    );

    if (isObjectWithId(normalizedEntityValue) && isNumeric(normalizedDtoValue)) {
      const diff = normalizedEntityValue.id !== normalizedDtoValue;
      loggerService.debug(
        `Branch: entity is objectWithId, dto is numeric — entity.id=${normalizedEntityValue.id}, dto=${normalizedDtoValue}, different=${diff}`
      );
      return diff;
    }

    if (isObjectWithId(dtoValue) && isNumeric(normalizedEntityValue)) {
      const diff = dtoValue.id !== normalizedEntityValue;
      loggerService.debug(
        `Branch: dto is objectWithId, entity is numeric — dto.id=${dtoValue.id}, entity=${normalizedEntityValue}, different=${diff}`
      );
      return diff;
    }

    if (isObjectWithId(normalizedEntityValue) && isObjectWithId(normalizedDtoValue)) {
      const diff = normalizedEntityValue.id !== normalizedDtoValue.id;
      loggerService.debug(
        `Branch: both objectWithId — entity.id=${normalizedEntityValue.id}, dto.id=${normalizedDtoValue.id}, different=${diff}`
      );
      return diff;
    }

    const diff = normalizedEntityValue !== normalizedDtoValue;
    loggerService.debug(
      `Branch: primitive/other compare — entity=${safeStringify(normalizedEntityValue)}, dto=${safeStringify(normalizedDtoValue)}, different=${diff}`
    );
    return diff;
  });
}
