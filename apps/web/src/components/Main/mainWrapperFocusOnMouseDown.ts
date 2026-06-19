export const MAIN_WRAPPER_INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [contenteditable], [contenteditable="true"], [role="button"], [role="slider"], [role="menuitem"], [role="menu"], [role="menubar"], [role="listbox"], [role="option"], [role="dialog"]';

export function shouldFocusMainWrapperOnMouseDown(target: Element): boolean {
  return target.closest(MAIN_WRAPPER_INTERACTIVE_SELECTOR) === null;
}
