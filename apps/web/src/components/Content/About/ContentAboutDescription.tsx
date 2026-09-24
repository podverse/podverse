'use client';

import dynamic from 'next/dynamic';

type ContentAboutDescriptionProps = {
  description?: string;
};

const DescriptionRenderer = dynamic(
  () =>
    import('@podverse/ui').then((mod) => ({
      default: mod.DescriptionRenderer,
    })),
  { loading: () => <div /> }
);

/**
 * Channel About prose: the same rich-text path episode Summary uses.
 */
export const ContentAboutDescription = ({ description }: ContentAboutDescriptionProps) => {
  if (description === undefined || description.length === 0) {
    return null;
  }

  return <DescriptionRenderer description={description} />;
};
