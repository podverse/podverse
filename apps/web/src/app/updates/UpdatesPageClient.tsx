import ReactMarkdown from 'react-markdown';

import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';

type UpdatesPageClientProps = {
  markdownContent: string;
};

export function UpdatesPageClient({ markdownContent }: UpdatesPageClientProps) {
  return (
    <MainWrapper>
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <div className="markdown">
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
