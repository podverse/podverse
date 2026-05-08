import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';

export type UpdatesPageClientProps = {
  intro: string;
  linkLabel: string;
  releasesUrl: string;
  title: string;
};

export function UpdatesPageClient({
  intro,
  linkLabel,
  releasesUrl,
  title,
}: UpdatesPageClientProps) {
  return (
    <MainWrapper>
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <h1>{title}</h1>
          <p>{intro}</p>
          <p>
            <a href={releasesUrl} rel="noreferrer" target="_blank">
              {linkLabel}
            </a>
          </p>
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
