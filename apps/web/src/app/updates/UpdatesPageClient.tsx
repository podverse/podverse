import ReactMarkdown from 'react-markdown';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../components/SideContent/SideContent';

type UpdatesPageClientProps = {
  markdownContent: string;
};

export function UpdatesPageClient({ markdownContent }: UpdatesPageClientProps) {
  return (
    <MainWrapper>
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <div className="markdown">
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
}
