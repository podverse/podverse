import { useTranslations } from 'next-intl';
import { AuthResetPasswordForm } from '../../components/Auth/AuthResetPasswordForm';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';

type ResetPasswordPageClientProps = {
  token?: string;
};

export function ResetPasswordPageClient({ token }: ResetPasswordPageClientProps) {
  const tAuthentication = useTranslations('authentication');

  return (
    <>
      <MainHeader title={tAuthentication('reset_password')} />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <AuthResetPasswordForm token={token} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
