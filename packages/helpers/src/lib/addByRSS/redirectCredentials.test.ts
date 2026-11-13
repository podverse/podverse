import { describe, expect, it } from 'vitest';

import { createAddByRSSRedirectCredentialTracker } from './redirectCredentials.js';

const FEED_URL = 'https://feeds.example.com/private.xml';

describe('createAddByRSSRedirectCredentialTracker', () => {
  it('denies every hop and records no decision when no credentials were attached', () => {
    const tracker = createAddByRSSRedirectCredentialTracker({
      credentialsAttached: false,
      feedUrl: FEED_URL,
    });

    expect(tracker.allowsCredentialsTo('https://cdn.example.com/private.xml')).toBe(false);
    expect(tracker.allowsCredentialsTo('https://feeds.other-host.net/private.xml')).toBe(false);
    expect(tracker.withheldDecision()).toBeNull();
  });

  it('allows an HTTPS hop on the same registrable domain', () => {
    const tracker = createAddByRSSRedirectCredentialTracker({
      credentialsAttached: true,
      feedUrl: FEED_URL,
    });

    expect(tracker.allowsCredentialsTo('https://cdn.example.com/private.xml')).toBe(true);
    expect(tracker.withheldDecision()).toBeNull();
  });

  it('withholds after another domain and does not restore credentials on a hop back', () => {
    const tracker = createAddByRSSRedirectCredentialTracker({
      credentialsAttached: true,
      feedUrl: FEED_URL,
    });

    expect(tracker.allowsCredentialsTo('https://feeds.other-host.net/private.xml')).toBe(false);
    expect(tracker.withheldDecision()).toBe('withheld_other_domain');
    expect(tracker.allowsCredentialsTo('https://feeds.example.com/private.xml')).toBe(false);
    expect(tracker.withheldDecision()).toBe('withheld_other_domain');
  });

  it('withholds an http hop unless insecure credentials are allowed', () => {
    const strict = createAddByRSSRedirectCredentialTracker({
      credentialsAttached: true,
      feedUrl: FEED_URL,
    });
    expect(strict.allowsCredentialsTo('http://feeds.example.com/private.xml')).toBe(false);
    expect(strict.withheldDecision()).toBe('withheld_insecure');

    const allowed = createAddByRSSRedirectCredentialTracker({
      allowInsecure: true,
      credentialsAttached: true,
      feedUrl: FEED_URL,
    });
    expect(allowed.allowsCredentialsTo('http://cdn.example.com/private.xml')).toBe(true);
    expect(allowed.withheldDecision()).toBeNull();
  });

  it('treats localhost and 127.0.0.1 as different hosts', () => {
    const tracker = createAddByRSSRedirectCredentialTracker({
      credentialsAttached: true,
      feedUrl: 'https://localhost/feed',
    });

    expect(tracker.allowsCredentialsTo('https://127.0.0.1/feed')).toBe(false);
    expect(tracker.withheldDecision()).toBe('withheld_other_domain');
  });
});
