---
description: "Converted from typescript-express.mdc"
---

# TypeScript Express Route Handlers

## Route Handler Return Types

Express route handlers should return `Promise<void>` or `void`:

```typescript
async handler(req: Request, res: Response): Promise<void> {
  // ...
}
```

## Response Method Patterns

### DO NOT use return with res.json/send/status chain

```typescript
// ❌ WRONG - TypeScript error (returns Response, not void)
return res.json(data);
return res.status(404).json({ error: 'Not found' });

// ✓ CORRECT - Call without return, then return void
res.json(data);

// ✓ CORRECT - For early exit
res.status(404).json({ error: 'Not found' });
return;
```

## Catch Block Returns

Always include explicit return in catch blocks:

```typescript
// ❌ WRONG - Missing return (TS7030: Not all code paths return)
try {
  res.json(result);
} catch (error) {
  handleError(res, error); // No return
}

// ✓ CORRECT
try {
  res.json(result);
} catch (error) {
  handleError(res, error);
  return; // Explicit return required
}
```

## Why This Matters

- TypeScript's `noImplicitReturns` requires all code paths to return
- `res.json()` returns `Response`, not `void`
- Catch blocks need explicit returns even when response is sent

## Applies To

- `apps/api/src/controllers/**/*.ts`
- `apps/api/src/routes/**/*.ts`
- `apps/management-api/src/controllers/**/*.ts`
- `apps/management-api/src/routes/**/*.ts`
