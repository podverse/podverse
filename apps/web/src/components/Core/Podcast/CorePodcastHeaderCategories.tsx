'use client';

import { useTranslations } from 'next-intl';

import type { DTOChannelCategory } from '@podverse/helpers';

import { Link } from '../../Link/Link';

type CorePodcastHeaderCategoriesProps = {
  channel_categories?: DTOChannelCategory[];
};

export const CorePodcastHeaderCategories: React.FC<CorePodcastHeaderCategoriesProps> = ({
  channel_categories,
}) => {
  const tCategories = useTranslations('categories');

  return channel_categories?.map((channel_category, index) => (
    <span key={index}>
      <Link
        key={channel_category.id}
        href={`/podcasts?category=${channel_category.category.mapping_key}`}
        color="secondary"
      >
        {tCategories(channel_category.category.mapping_key)}
      </Link>
      {index < channel_categories.length - 1 && ', '}
    </span>
  ));
};
