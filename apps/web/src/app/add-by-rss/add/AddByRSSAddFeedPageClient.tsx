'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import React, { useMemo, useState } from 'react';

import { splitFeedUrlUserinfo } from '@podverse/helpers';
import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  canSubmitAddByRssFeed,
} from '@podverse/helpers-validation/client';
import {
  CallToActionMessage,
  CheckboxField,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  SideContent,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useAddByRSSAddFeedFlow } from '../../../hooks/useAddByRSSAddFeedFlow';

import styles from '../../../styles/components/AddByRSS/AddByRSSAddFeed.module.scss';

export const AddByRSSAddFeedPageClient: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { addFeed, inputError, isAddingFeed, statusError, statusLabel, statusMessage } =
    useAddByRSSAddFeedFlow();

  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [useBasicAuth, setUseBasicAuthState] = useState(false);
  const [basicAuthUsername, setBasicAuthUsername] = useState('');
  const [basicAuthPassword, setBasicAuthPassword] = useState('');
  const [basicAuthError, setBasicAuthError] = useState<string | null>(null);

  const setUseBasicAuth = (next: boolean) => {
    setUseBasicAuthState(next);
    if (!next) {
      setBasicAuthUsername('');
      setBasicAuthPassword('');
      setBasicAuthError(null);
    }
  };

  const handleFeedUrlChange = (value: string) => {
    const isPaste = value.length - newFeedUrl.length > 1;
    if (isPaste) {
      const split = splitFeedUrlUserinfo(value);
      if (
        typeof split.username === 'string' &&
        split.username.length > 0 &&
        typeof split.password === 'string' &&
        split.password.length > 0
      ) {
        setNewFeedUrl(split.feedUrl);
        setUseBasicAuthState(true);
        setBasicAuthUsername(split.username);
        setBasicAuthPassword(split.password);
        setBasicAuthError(null);
        return;
      }
    }
    setNewFeedUrl(value);
  };

  const canSubmit = useMemo(
    () =>
      canSubmitAddByRssFeed({
        feedUrl: newFeedUrl,
        password: basicAuthPassword,
        requireCredentials: useBasicAuth,
        username: basicAuthUsername,
      }),
    [basicAuthPassword, basicAuthUsername, newFeedUrl, useBasicAuth]
  );

  const handleAddFeed = async (event?: FormEvent) => {
    event?.preventDefault();
    if (isAddingFeed) {
      return;
    }
    if (
      !canSubmitAddByRssFeed({
        feedUrl: newFeedUrl,
        password: basicAuthPassword,
        requireCredentials: useBasicAuth,
        username: basicAuthUsername,
      })
    ) {
      return;
    }

    if (useBasicAuth && (!basicAuthUsername.trim() || !basicAuthPassword)) {
      setBasicAuthError(tFeatures('add_by_rss.basic_auth_required_both'));
      return;
    }

    setBasicAuthError(null);

    const username = useBasicAuth ? basicAuthUsername.trim() : null;
    const password = useBasicAuth ? basicAuthPassword : null;
    await addFeed(
      { rawFeedUrl: newFeedUrl.trim(), username, password, title: null },
      {
        onFollowed: () => {
          setBasicAuthPassword('');
          if (useBasicAuth) {
            setBasicAuthUsername('');
            setUseBasicAuth(false);
          }
        },
      }
    );
  };

  return (
    <>
      <MainHeader title={tFeatures('add_by_rss.label')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <div className={styles.content}>
              <p className={styles.instructions}>{tFeatures('add_by_rss.add_feed_instructions')}</p>

              {!loggedInAccount && (
                <CallToActionMessage
                  message={tInstructions('login_for_subscriptions')}
                  buttonLabel={tAuthentication('login')}
                  onButtonClick={() => setModalAuthLogin({ isOpen: true })}
                />
              )}

              {loggedInAccount && (
                <StackForm onSubmit={(e) => handleAddFeed(e)} className={styles.form}>
                  <TextInput
                    value={newFeedUrl}
                    onChange={(event) => handleFeedUrlChange(event.target.value)}
                    eyebrow={tFeatures('add_by_rss.feed_url')}
                    placeholder={tFeatures('add_by_rss.feed_url_example')}
                    aria-label={tFeatures('add_by_rss.feed_url')}
                    infoError={inputError ?? undefined}
                    aria-invalid={inputError ? true : undefined}
                    button={{
                      label: tFeatures('add_feed.add_feed'),
                      disabled: isAddingFeed || !canSubmit,
                      isLoading: isAddingFeed,
                      onClick: () => {
                        void handleAddFeed();
                      },
                    }}
                    disabled={isAddingFeed}
                  />
                  <div className={styles.basicAuthSection}>
                    <CheckboxField
                      wrapInDiv
                      id="add-by-rss-use-basic-auth"
                      name="useBasicAuth"
                      checked={useBasicAuth}
                      onChange={setUseBasicAuth}
                      label={tFeatures('add_by_rss.basic_auth_requires')}
                    />
                    {useBasicAuth && (
                      <div className={styles.basicAuthFields}>
                        <p
                          className={styles.basicAuthDescription}
                          data-testid="add-by-rss-basic-auth-description"
                        >
                          {tFeatures('add_by_rss.basic_auth_description')}
                        </p>
                        <TextInput
                          value={basicAuthUsername}
                          onChange={(event) => setBasicAuthUsername(event.target.value)}
                          eyebrow={tFeatures('add_by_rss.basic_auth_username')}
                          placeholder={tMisc('required')}
                          aria-label={tFeatures('add_by_rss.basic_auth_username')}
                          type="text"
                          autoComplete="username"
                          maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
                          aria-invalid={
                            basicAuthError && !basicAuthUsername.trim() ? true : undefined
                          }
                          disabled={isAddingFeed}
                        />
                        <TextInput
                          value={basicAuthPassword}
                          onChange={(event) => setBasicAuthPassword(event.target.value)}
                          eyebrow={tFeatures('add_by_rss.basic_auth_password')}
                          placeholder={tMisc('required')}
                          aria-label={tFeatures('add_by_rss.basic_auth_password')}
                          type="password"
                          autoComplete="current-password"
                          maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
                          infoError={basicAuthError ?? undefined}
                          aria-invalid={basicAuthError && !basicAuthPassword ? true : undefined}
                          disabled={isAddingFeed}
                        />
                      </div>
                    )}
                  </div>
                </StackForm>
              )}

              {statusLabel && (
                <div className={styles.statusCard}>
                  <p className={styles.statusLabel}>{tFeatures('add_by_rss.status')}</p>
                  <p className={styles.statusValue}>{statusLabel}</p>
                  {statusMessage && statusMessage !== statusLabel && (
                    <p className={styles.statusValue}>{statusMessage}</p>
                  )}
                  {statusError && <p className={styles.errorText}>{statusError}</p>}
                </div>
              )}
            </div>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
