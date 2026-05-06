import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { describe, expect, it } from 'vitest';

import {
  assertLifecycleTransitionAllowed,
  isLifecycleTransitionAllowed,
} from './feedLifecycleTransitionValidation.js';

describe('isLifecycleTransitionAllowed', () => {
  it('allows identity transitions', () => {
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Active,
        FeedLifecycleStateKeyEnum.Active
      )
    ).toBe(true);
  });

  it('allows the base matrix edges from 01b', () => {
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Active,
        FeedLifecycleStateKeyEnum.PendingArchive
      )
    ).toBe(true);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.PendingArchive,
        FeedLifecycleStateKeyEnum.Archived
      )
    ).toBe(true);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Active,
        FeedLifecycleStateKeyEnum.Takedown
      )
    ).toBe(true);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.PendingArchive,
        FeedLifecycleStateKeyEnum.Takedown
      )
    ).toBe(true);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Archived,
        FeedLifecycleStateKeyEnum.Takedown
      )
    ).toBe(true);
  });

  it('allows takedown -> active only with operatorUntakedown', () => {
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Takedown,
        FeedLifecycleStateKeyEnum.Active,
        {}
      )
    ).toBe(false);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Takedown,
        FeedLifecycleStateKeyEnum.Active,
        { operatorUntakedown: true }
      )
    ).toBe(true);
  });

  it('denies archived -> active and takedown -> pending_archive without override', () => {
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Archived,
        FeedLifecycleStateKeyEnum.Active
      )
    ).toBe(false);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Takedown,
        FeedLifecycleStateKeyEnum.PendingArchive
      )
    ).toBe(false);
  });

  it('allows archived -> active and takedown -> pending_archive with explicitManagementOverride', () => {
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Archived,
        FeedLifecycleStateKeyEnum.Active,
        { explicitManagementOverride: true }
      )
    ).toBe(true);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Takedown,
        FeedLifecycleStateKeyEnum.PendingArchive,
        { explicitManagementOverride: true }
      )
    ).toBe(true);
  });

  it('denies transitions outside the matrix when no escape hatch applies', () => {
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.PendingArchive,
        FeedLifecycleStateKeyEnum.Active
      )
    ).toBe(false);
    expect(
      isLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Archived,
        FeedLifecycleStateKeyEnum.PendingArchive
      )
    ).toBe(false);
  });
});

describe('assertLifecycleTransitionAllowed', () => {
  it('throws when the transition is disallowed', () => {
    expect(() =>
      assertLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Archived,
        FeedLifecycleStateKeyEnum.Active
      )
    ).toThrow(/Disallowed lifecycle transition/);
  });

  it('does not throw for a valid edge', () => {
    expect(() =>
      assertLifecycleTransitionAllowed(
        FeedLifecycleStateKeyEnum.Active,
        FeedLifecycleStateKeyEnum.PendingArchive
      )
    ).not.toThrow();
  });
});
