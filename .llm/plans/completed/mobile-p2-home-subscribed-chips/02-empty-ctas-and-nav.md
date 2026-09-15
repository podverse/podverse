# 02 — Empty discovery CTAs + Browse/Search params

**Cursor model:** Codex 5.3
**Reasoning:** medium

Read [740-home-empty-discovery-ctas](/docs/proposals/mobile/_master-plan_/phase-2/details/740-home-empty-discovery-ctas.md)
and locked decisions in [00-SUMMARY.md](00-SUMMARY.md).

## Work

1. Optional second action on `CallToActionSection`.
2. `BrowseRoot: { mediaType?: BrowseMediaType }`; apply on focus + `writeBrowseMediaType`.
3. `SearchRoot: { autoFocus?: boolean; medium?: 'all' | 'music' }`; apply + `writeSearchListMedium`.
4. Home empty matrix per locked decisions (incl. Clips login fill).
5. i18n: reuse `features.search.search` and `nav.tab.browse`.

Do not run tests during agent work.
