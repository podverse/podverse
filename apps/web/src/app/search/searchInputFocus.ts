export type SearchInputActivationType = 'push' | 'replace' | 'reload' | 'traverse' | null;

export type SearchInputArrival = {
  activationType: SearchInputActivationType;
  backNavFlag: boolean;
  /**
   * This document was loaded by Back or Forward onto `/search`, and the visitor has not left it yet.
   */
  documentOpenedSearchViaBackForward: boolean;
};

const SEARCH_PATH = '/search';

const ACTIVATION_TYPES = ['push', 'replace', 'reload', 'traverse'] as const;

const isActivationType = (value: unknown): value is Exclude<SearchInputActivationType, null> => {
  return ACTIVATION_TYPES.some((type) => type === value);
};

/**
 * Focus the search field on an intentional visit. History traversal (Back or Forward) and a
 * document load of `/search` via Back or Forward leave it unfocused.
 */
export function shouldFocusSearchInput(arrival: SearchInputArrival): boolean {
  if (arrival.activationType === 'traverse') {
    return false;
  }
  if (
    arrival.activationType === 'push' ||
    arrival.activationType === 'replace' ||
    arrival.activationType === 'reload'
  ) {
    return true;
  }
  if (arrival.backNavFlag || arrival.documentOpenedSearchViaBackForward) {
    return false;
  }
  return true;
}

/** True when this document was loaded by Back or Forward and the loaded URL is `/search`. */
export function documentOpenedSearchViaBackForward(
  navigationType: string | null,
  documentUrl: string | null
): boolean {
  if (navigationType !== 'back_forward' || documentUrl === null) {
    return false;
  }
  try {
    const pathname = new URL(documentUrl).pathname;
    return pathname === SEARCH_PATH || pathname === `${SEARCH_PATH}/`;
  } catch {
    return false;
  }
}

/** Navigation API activation type, or null when the browser does not provide one. */
export function activationTypeFrom(value: unknown): SearchInputActivationType {
  if (typeof value !== 'object' || value === null || !('navigation' in value)) {
    return null;
  }
  const navigation = value.navigation;
  if (typeof navigation !== 'object' || navigation === null || !('activation' in navigation)) {
    return null;
  }
  const activation = navigation.activation;
  if (typeof activation !== 'object' || activation === null || !('navigationType' in activation)) {
    return null;
  }
  return isActivationType(activation.navigationType) ? activation.navigationType : null;
}

let initialDocumentOpenedSearchViaBackForwardCache: boolean | null = null;

const initialDocumentOpenedSearchViaBackForward = (): boolean => {
  if (initialDocumentOpenedSearchViaBackForwardCache === null) {
    const entry = performance.getEntriesByType('navigation')[0];
    const navigationType = entry instanceof PerformanceNavigationTiming ? entry.type : null;
    const documentUrl = entry instanceof PerformanceNavigationTiming ? entry.name : null;
    initialDocumentOpenedSearchViaBackForwardCache = documentOpenedSearchViaBackForward(
      navigationType,
      documentUrl
    );
  }
  return initialDocumentOpenedSearchViaBackForwardCache;
};

/**
 * One arrival for this Search visit. The document-load check applies only while the visitor is
 * still on the page that loaded the document.
 */
export function readSearchInputArrival(
  backNavFlag: boolean,
  leftInitialDocument: boolean
): SearchInputArrival {
  return {
    activationType: activationTypeFrom(window),
    backNavFlag,
    documentOpenedSearchViaBackForward:
      !leftInitialDocument && initialDocumentOpenedSearchViaBackForward(),
  };
}
