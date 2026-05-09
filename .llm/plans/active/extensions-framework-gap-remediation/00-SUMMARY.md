# extensions-framework-gap-remediation - summary

This follow-up plan addresses only the remaining blockers identified in post-implementation review of the extensions framework worktree.

## Scope

- Stabilize apps/web Cloudflare head E2E env setup so it does not fail due to unrelated account-signup validation requirements.
- Align web extension invalidation subscriber bootstrap with the same effective env source used by extension resolution.
- Prevent secret-marked extension config fields from being exposed by management-api update responses.
- Implement actual CSP propagation/merge for extension script sources so browser responses enforce policy.

## Out of scope

- New extension features.
- Marketplace or per-account extension scoping.
- Additional UI redesign work.

## Blocking gaps this plan resolves

1. apps/web E2E spec can fail with admin_only_email env path.
2. Subscriber bootstrap checks process env while resolver checks merged runtime env.
3. PUT /extensions/:id returns unsanitized saved payload.
4. Sidecar CSP header is generated but not propagated to Next.js browser response path.

## Completion criteria

- All four phase files are implemented and verified.
- Scoped tests for each phase pass.
- Full lint and package/build sanity pass.
- Plan directory is archived to completed.
