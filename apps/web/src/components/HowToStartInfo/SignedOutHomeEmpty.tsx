import { useTranslations } from 'next-intl';

import { Button, InfoWrapper } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useModals } from '../../contexts/Modals';

import styles from '../../styles/components/HowToStartInfo/SignedOutHomeEmpty.module.scss';

/**
 * Signed-out Subscribed home. The sentence names where follows will show, and Login opens
 * the auth dialog from that same line. Search sits above Browse.
 */
export const SignedOutHomeEmpty = () => {
  const tSubscriptions = useTranslations('subscriptions');
  const tFeatures = useTranslations('features');
  const { setModalAuthLogin } = useModals();

  return (
    <div data-testid="signed-out-home-empty">
      <InfoWrapper>
        <p>
          {tSubscriptions.rich('signed_out_home_message', {
            loginLink: (chunks) => (
              <button
                type="button"
                className={styles.loginLink}
                onClick={() => setModalAuthLogin({ isOpen: true })}
              >
                {chunks}
              </button>
            ),
          })}
        </p>
      </InfoWrapper>
      <div className={styles.actions}>
        <Button href={ROUTES.SEARCH} variant="primary">
          {tFeatures('search.search')}
        </Button>
        <Button href={ROUTES.BROWSE} variant="outline">
          {tFeatures('browse.browse')}
        </Button>
      </div>
    </div>
  );
};
