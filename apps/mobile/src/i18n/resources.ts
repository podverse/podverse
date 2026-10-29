import type { Resource } from 'i18next';

import elGR from '../../i18n/compiled/el-GR.json';
import enUS from '../../i18n/compiled/en-US.json';
import es from '../../i18n/compiled/es.json';
import fr from '../../i18n/compiled/fr.json';

import type { CatalogTree } from './icuPlurals';
import { expandIcuPlurals } from './icuPlurals';

function translationResources(locale: string, catalog: CatalogTree): CatalogTree {
  const { tree, unsupportedKeys } = expandIcuPlurals(catalog);
  if (__DEV__ && unsupportedKeys.length > 0) {
    console.warn('[i18n] ICU strings mobile cannot render', locale, unsupportedKeys);
  }
  return tree;
}

export const MOBILE_I18N_RESOURCES: Resource = {
  'el-GR': {
    translation: translationResources('el-GR', elGR),
  },
  'en-US': {
    translation: translationResources('en-US', enUS),
  },
  es: {
    translation: translationResources('es', es),
  },
  fr: {
    translation: translationResources('fr', fr),
  },
};
