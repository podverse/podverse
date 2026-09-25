import { describe, expect, it, vi } from 'vitest';

import { buildCredentialScopedBeforeRedirect } from './addByRSSRedirectAuth.js';

const FEED_URL = 'https://feeds.example.com/private.xml';

/** Shape `follow-redirects` passes to `beforeRedirect`: the next request's options. */
const redirectOptions = (href: string): Record<string, unknown> => ({
  href,
  headers: { Authorization: 'Basic YWxpY2U6cHc=', 'User-Agent': 'test' },
});

describe('buildCredentialScopedBeforeRedirect', () => {
  it('keeps Authorization on a redirect within the feed registrable domain', () => {
    const onWithheld = vi.fn();
    const hook = buildCredentialScopedBeforeRedirect({
      feedUrl: FEED_URL,
      credentialsAttached: true,
      onCredentialsWithheld: onWithheld,
    });
    const options = redirectOptions('https://cdn.example.com/private.xml');

    hook(options);

    expect(options.headers).toEqual({ Authorization: 'Basic YWxpY2U6cHc=', 'User-Agent': 'test' });
    expect(onWithheld).not.toHaveBeenCalled();
  });

  it('strips Authorization and reports when a redirect leaves the registrable domain', () => {
    const onWithheld = vi.fn();
    const hook = buildCredentialScopedBeforeRedirect({
      feedUrl: FEED_URL,
      credentialsAttached: true,
      onCredentialsWithheld: onWithheld,
    });
    const options = redirectOptions('https://feeds.other-host.net/private.xml');

    hook(options);

    expect(options.headers).toEqual({ 'User-Agent': 'test' });
    expect(onWithheld).toHaveBeenCalledWith('withheld_other_domain');
  });

  it('strips Authorization on a downgrade to http within the same host', () => {
    const onWithheld = vi.fn();
    const hook = buildCredentialScopedBeforeRedirect({
      feedUrl: FEED_URL,
      credentialsAttached: true,
      onCredentialsWithheld: onWithheld,
    });
    const options = redirectOptions('http://feeds.example.com/private.xml');

    hook(options);

    expect(options.headers).toEqual({ 'User-Agent': 'test' });
    expect(onWithheld).toHaveBeenCalledWith('withheld_insecure');
  });

  it('never restores credentials on a later hop back into scope', () => {
    const onWithheld = vi.fn();
    const hook = buildCredentialScopedBeforeRedirect({
      feedUrl: FEED_URL,
      credentialsAttached: true,
      onCredentialsWithheld: onWithheld,
    });

    hook(redirectOptions('https://tracker.other-host.net/r'));
    const backInScope = redirectOptions('https://feeds.example.com/private.xml');
    hook(backInScope);

    expect(backInScope.headers).toEqual({ 'User-Agent': 'test' });
    expect(onWithheld).toHaveBeenCalledTimes(1);
  });

  it('matches the Authorization header case-insensitively', () => {
    const hook = buildCredentialScopedBeforeRedirect({
      feedUrl: FEED_URL,
      credentialsAttached: true,
    });
    const options: Record<string, unknown> = {
      href: 'https://other-host.net/x',
      headers: { authorization: 'Basic x', AUTHORIZATION: 'Basic y' },
    };

    hook(options);

    expect(options.headers).toEqual({});
  });

  it('does not report when no credentials were attached', () => {
    const onWithheld = vi.fn();
    const hook = buildCredentialScopedBeforeRedirect({
      feedUrl: FEED_URL,
      credentialsAttached: false,
      onCredentialsWithheld: onWithheld,
    });

    hook(redirectOptions('https://other-host.net/x'));

    expect(onWithheld).not.toHaveBeenCalled();
  });
});
