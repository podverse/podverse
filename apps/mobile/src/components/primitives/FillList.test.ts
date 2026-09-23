import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  return {
    LogBox: {
      ignoreLogs: () => undefined,
    },
  };
});

import {
  applyFillListRenderWindow,
  LIST_INITIAL_NUM_TO_RENDER,
  LIST_MAX_TO_RENDER_PER_BATCH,
  LIST_UPDATE_CELLS_BATCHING_PERIOD,
  LIST_WINDOW_SIZE,
} from './listVirtualization';

describe('applyFillListRenderWindow', () => {
  it('supplies the four FillList render-window defaults', () => {
    expect(applyFillListRenderWindow({})).toEqual({
      initialNumToRender: LIST_INITIAL_NUM_TO_RENDER,
      maxToRenderPerBatch: LIST_MAX_TO_RENDER_PER_BATCH,
      updateCellsBatchingPeriod: LIST_UPDATE_CELLS_BATCHING_PERIOD,
      windowSize: LIST_WINDOW_SIZE,
    });
  });

  it('lets a caller windowSize override the default', () => {
    const merged = applyFillListRenderWindow({ numColumns: 2, windowSize: 21 });

    expect(merged.windowSize).toBe(21);
    expect(merged.numColumns).toBe(2);
    expect(merged.initialNumToRender).toBe(LIST_INITIAL_NUM_TO_RENDER);
    expect(merged.maxToRenderPerBatch).toBe(LIST_MAX_TO_RENDER_PER_BATCH);
    expect(merged.updateCellsBatchingPeriod).toBe(LIST_UPDATE_CELLS_BATCHING_PERIOD);
  });

  it('lets a caller override each render-window default', () => {
    expect(
      applyFillListRenderWindow({
        initialNumToRender: 2,
        maxToRenderPerBatch: 3,
        updateCellsBatchingPeriod: 16,
        windowSize: 21,
      })
    ).toEqual({
      initialNumToRender: 2,
      maxToRenderPerBatch: 3,
      updateCellsBatchingPeriod: 16,
      windowSize: 21,
    });
  });
});
