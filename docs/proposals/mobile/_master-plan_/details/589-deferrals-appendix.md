# 589-deferrals-appendix

**Master step:** 21.10
**Model (author + implement):** Auto
**Status:** done

## Scope

Single **deferrals appendix**: what mobile v1 intentionally leaves out, why, and the revisit trigger
for each. This is the canonical "not in v1" list; individual rationale lives in each linked detail.

## Deferrals table

| Deferral                  | Detail                                    | Rationale (short)                 | Revisit trigger               |
| ------------------------- | ----------------------------------------- | --------------------------------- | ----------------------------- |
| Apple Watch standalone    | [580](580-defer-apple-watch.md)           | Wear OS remote-control first      | Wear OS stable + demand       |
| tvOS native app           | [581](581-defer-tvos.md)                  | Android TV first                  | Android TV stable + demand    |
| Management-web parity     | [582](582-defer-management-parity.md)     | Consumer surface only             | Operator on-the-go need       |
| Clip authoring/upload     | [583](583-defer-clip-authoring.md)        | Design-heavy authoring            | Post-Track-23 + demand        |
| Social beyond share       | [584](584-defer-social.md)                | Needs server product + moderation | Social direction defined      |
| Advanced offline sync     | [585](585-defer-offline-sync-advanced.md) | LWW covers typical cases          | Field conflict loss           |
| Widgets / Live Activities | [586](586-defer-widgets.md)               | Separate native targets           | Post-v1 polish + demand       |
| CarPlay/AA video          | [587](587-defer-carplay-video.md)         | Platform audio-only in car        | Parked-video mode prioritized |

Issue placeholders: [588-deferral-issue-links](588-deferral-issue-links.md) (operator fills numbers).

## Related deferrals (other tracks)

- Player transcript chrome — [598](598-defer-player-transcript-chrome.md)
- Pixel drag-and-drop polish — [599](599-defer-pixel-dnd-polish.md)
- FOSS-flavor IAP unavailable — [575](575-foss-iap-unavailable.md)

## Acceptance

- All Track 21 deferrals appear once here with rationale + revisit trigger and a link to their detail.
