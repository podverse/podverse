---
name: styles-import-last
description: Enforces import ordering so styles (CSS/SCSS module) imports are last. Use when editing React components or pages in .tsx/.jsx files, or when the user mentions import order or style imports.
---

# Styles Import Last

## Instructions

- In React components and pages (`.tsx`/`.jsx`), place the styles import as the final import at the top of the file.
- Keep existing import grouping, but move the styles import to the end of the import block.
- Applies to CSS/SCSS module imports like `styles` or similar.

## Example

```tsx
import React from 'react';

import { Button } from '../Button/Button';

import styles from './MyComponent.module.scss';
```
