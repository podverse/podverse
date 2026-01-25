import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { DTOCategory, QUERY_PARAMS_GLOBAL_SORT_VALUES, QueryParamsGlobalSort } from '@podverse/helpers';

type OnClickCategoryParams<T extends object> = {
  category: DTOCategory,
  setFilterParams: (params: T) => void,
  filterParams: T,
  setShowCategoriesModal: (isOpen: boolean) => void,
  linkPath?: string,
  router: AppRouterInstance
};

export const onClickCategory = <T extends { sort?: string }>({
  category,
  setFilterParams,
  filterParams,
  setShowCategoriesModal,
  linkPath,
  router,
}: OnClickCategoryParams<T>) => {
  if (category?.mapping_key) {
    const currentSort = filterParams.sort;
    const isValidSort = currentSort && (QUERY_PARAMS_GLOBAL_SORT_VALUES as readonly string[]).includes(currentSort);
    setFilterParams({
      ...filterParams,
      type: 'category',
      sort: isValidSort ? (currentSort as QueryParamsGlobalSort) : 'recent',
      category: category.mapping_key,
      page: 1,
    } as T);
    setShowCategoriesModal(false);
    router.replace(`${linkPath}?category=${category.mapping_key}`);
  }
};
