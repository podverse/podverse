import { useTranslations } from 'next-intl';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { Link } from '../Link/Link';
import { InfoWrapper } from './InfoWrapper';

type HowToStartInfoProps = {
  rows: unknown[];
  totalPages: number;
};

export const HowToStartInfo = ({ rows, totalPages }: HowToStartInfoProps) => {
  const tSubscriptions = useTranslations('subscriptions');
  const { loggedInAccount } = useAccount();

  if (!loggedInAccount || (loggedInAccount && rows.length === 0 && totalPages === 1)) {
    return (
      <InfoWrapper>
        <p>
          {tSubscriptions.rich('how_to_start_message', {
            searchLink: (chunks) => (
              <Link fullPageLoad href={ROUTES.SEARCH}>
                {chunks}
              </Link>
            ),
            podcastsLink: (chunks) => (
              <Link fullPageLoad href={`${ROUTES.PODCASTS}?type=global&sort=recent`}>
                {chunks}
              </Link>
            ),
            videosLink: (chunks) => (
              <Link fullPageLoad href={`${ROUTES.VIDEOS}?type=global&sort=recent`}>
                {chunks}
              </Link>
            ),
            musicLink: (chunks) => (
              <Link fullPageLoad href={`${ROUTES.ARTISTS}?type=global&sort=recent`}>
                {chunks}
              </Link>
            ),
          })}
        </p>
      </InfoWrapper>
    );
  }

  return null;
};
