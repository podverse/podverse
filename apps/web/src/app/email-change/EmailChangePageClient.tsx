import { useTranslations } from 'next-intl';

import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { AuthEmailChangeForm } from '../../components/Auth/AuthEmailChangeForm';
import { MainWrapper } from '../../components/Main/MainWrapper';

export function EmailChangePageClient() {
  const tAuthentication = useTranslations('authentication');

  return (
    <>
      <MainHeader title={tAuthentication('change_email_address_email')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <AuthEmailChangeForm />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
