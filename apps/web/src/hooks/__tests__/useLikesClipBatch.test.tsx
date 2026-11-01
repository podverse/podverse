import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLikesClipBatch } from '../useLikesClipBatch';

const hoisted = vi.hoisted(() => ({
  loggedInAccount: null as { id: number } | null,
  reqPlaylistLikesMembership: vi.fn(),
}));

vi.mock('../../contexts/Account', () => ({
  useAccount: () => ({ loggedInAccount: hoisted.loggedInAccount }),
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqPlaylistLikesMembership: hoisted.reqPlaylistLikesMembership,
  }),
}));

function Harness() {
  useLikesClipBatch(['e2eArchClip01']);
  return null;
}

describe('useLikesClipBatch', () => {
  it('does not loop when each render passes a new array of the same clip ids', async () => {
    hoisted.loggedInAccount = null;
    hoisted.reqPlaylistLikesMembership.mockReset();

    expect(() => {
      render(<Harness />);
    }).not.toThrow();
    expect(hoisted.reqPlaylistLikesMembership).not.toHaveBeenCalled();
  });

  it('asks once which clips are liked when the account is signed in', async () => {
    hoisted.loggedInAccount = { id: 1 };
    hoisted.reqPlaylistLikesMembership.mockReset();
    hoisted.reqPlaylistLikesMembership.mockResolvedValue({
      item_id_texts: [],
      clip_id_texts: ['e2eArchClip01'],
      add_by_rss_hash_ids: [],
    });

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqPlaylistLikesMembership).toHaveBeenCalledTimes(1);
    });
    expect(hoisted.reqPlaylistLikesMembership).toHaveBeenCalledWith({
      clip_id_texts: ['e2eArchClip01'],
    });
  });
});
