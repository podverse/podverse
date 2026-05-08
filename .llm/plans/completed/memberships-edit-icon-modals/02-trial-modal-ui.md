# Phase 02 — Trial row UI

- Remove top `SectionHeading` + `StackForm` trial block from `ProductMembershipsPageClient`.
- Per-row `DescriptionListRow` with value + `IconButton` (`FaPenToSquare`) for `freeTrialExpirationSeconds`.
- Open `EditValueModal`; on success call `updateProductMembershipTrial` / later `updateProductMembershipSettings`.
