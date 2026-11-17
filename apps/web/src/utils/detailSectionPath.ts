/**
 * Address for a detail section chip. The default section leaves `type` off the URL. Any other
 * section sets `type` and keeps the rest of the query.
 */
export const detailSectionPath = (
  pathname: string,
  search: string,
  section: string,
  defaultSection: string
): string => {
  const nextParams = new URLSearchParams(search);
  if (section === defaultSection) {
    nextParams.delete('type');
  } else {
    nextParams.set('type', section);
  }
  const nextQuery = nextParams.toString();
  return nextQuery === '' ? pathname : `${pathname}?${nextQuery}`;
};
