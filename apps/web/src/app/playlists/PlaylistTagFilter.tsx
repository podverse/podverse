'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

import { normalizePlaylistTagName, PLAYLIST_TAG_NAME_MAX_LENGTH } from '@podverse/helpers';
import { AutocompleteDropdown, Chip, IconButton } from '@podverse/ui';

import { getApiRequestService } from '../../factories/apiRequestService';
import { usePlaylistsPageContext } from './PlaylistsPageContext';

import styles from './PlaylistTagFilter.module.scss';

type PanelBox = {
  top: number;
  left: number;
};

export function PlaylistTagFilter() {
  const { filterParams, setFilterParams } = usePlaylistsPageContext();
  const tFilters = useTranslations('filters');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelBox, setPanelBox] = useState<PanelBox | null>(null);

  const applied =
    typeof filterParams.tag === 'string' && filterParams.tag !== '' ? filterParams.tag : null;
  const label = tFilters('playlist_tag.label');
  const visibleText = applied ?? label;
  const accessibleName =
    applied === null ? label : tFilters('playlist_tag.selected', { name: applied });

  useLayoutEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }

    const place = () => {
      const anchor = wrapperRef.current;
      if (anchor === null) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setPanelBox((current) => {
        if (current !== null && current.top === rect.bottom && current.left === rect.left) {
          return current;
        }
        return { top: rect.bottom, left: rect.left };
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (wrapperRef.current !== null && wrapperRef.current.contains(target)) {
        return;
      }
      if (panelRef.current !== null && panelRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };

    // Bubble phase, so Escape that closes the suggestion list does not also close the editor.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function applyRaw(raw: string) {
    const normalized = normalizePlaylistTagName(raw);
    if (!normalized.ok) {
      return;
    }
    setFilterParams({ ...filterParams, tag: normalized.name, page: 1 });
    setOpen(false);
  }

  function handleChipClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setQuery(applied ?? '');
    setOpen(true);
  }

  const panel =
    open && panelBox !== null
      ? createPortal(
          <div
            className={styles.panel}
            ref={panelRef}
            style={{ top: panelBox.top, left: panelBox.left }}
          >
            <AutocompleteDropdown
              autoFocus
              clearQueryLabel={tFilters('playlist_tag.clear_text')}
              id="playlists-tag-filter-input"
              inputLabel={label}
              listLabel={tFilters('playlist_tag.suggestions')}
              maxLength={PLAYLIST_TAG_NAME_MAX_LENGTH}
              placeholder={tFilters('playlist_tag.placeholder')}
              query={query}
              search={async (nextQuery) => {
                const response = await getApiRequestService().reqPlaylistTagSearch(nextQuery);
                return response.data.map((name) => ({ id: name, label: name, value: name }));
              }}
              onEnter={applyRaw}
              onQueryChange={setQuery}
              onSelect={(option) => {
                applyRaw(option.value);
              }}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <div className={styles.wrapper} data-testid="playlists-tag-filter" ref={wrapperRef}>
      <div className={styles.face}>
        <Chip
          aria-expanded={open}
          aria-label={accessibleName}
          selected={applied !== null}
          variant="filter"
          onClick={handleChipClick}
        >
          {visibleText}
        </Chip>
        {applied !== null ? (
          <IconButton
            appearance="ghost"
            aria-label={tFilters('playlist_tag.clear')}
            className={styles.clear}
            htmlButtonType="button"
            onClick={(event) => {
              event.stopPropagation();
              setFilterParams({ ...filterParams, tag: null, page: 1 });
            }}
          >
            <FaXmark aria-hidden className={styles.clearIcon} />
          </IconButton>
        ) : null}
      </div>
      {panel}
    </div>
  );
}
