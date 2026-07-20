import type { TextStyle } from 'react-native';

/**
 * Mobile typography ramp (font size / weight / line height per role). Theme-independent on purpose:
 * text **color** always comes from the active theme tokens at render time, so this module only
 * carries the non-color type scale that primitives and screens share. It loosely mirrors the web
 * text hierarchy (display → caption); refine exact values in the pixel-polish pass — this scaffold
 * is not a full visual pass (see DOCS-MOBILE-PROCESS-VISUAL-PARITY.md).
 */
export type TypographyRole =
  'display' | 'title' | 'heading' | 'subheading' | 'body' | 'label' | 'caption';

export type TypographyStyle = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight'>;

export const typography: Record<TypographyRole, TypographyStyle> = {
  display: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  heading: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  subheading: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};
