import { useTranslations } from 'next-intl';

import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { AuthContactOnlyMessage } from '../../components/Auth/AuthContactOnlyMessage';
import { AuthSignUpForm } from '../../components/Auth/AuthSignUpForm';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { getConfig } from '../../config';

export function SignUpClient() {
  const config = getConfig();
  const tAuthentication = useTranslations('authentication');
  const signupMode = config.public.account.signupMode;
  const contactEmail = config.public.account.contactEmail;

  return (
    <>
      <MainHeader title={tAuthentication('sign_up')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            {signupMode !== 'user_signup_email' && contactEmail ? (
              <AuthContactOnlyMessage contactEmail={contactEmail} />
            ) : (
              <AuthSignUpForm />
            )}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
