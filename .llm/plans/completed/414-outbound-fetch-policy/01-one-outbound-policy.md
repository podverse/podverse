# Untrusted server fetches use one outbound policy

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

## Issue

https://github.com/podverse/podverse/issues/414

## Rows

- **R1** Every server fetch of an untrusted URL uses the DNS-checked outbound policy, and the connection uses an address that already passed it.

## Runs after

none

## Review before running

No operator question. Settled:

- Untrusted means the URL came from a person, a feed, a directory, or any other party outside this deployment's own config.
- Trusted means the URL is this deployment's API, management API, or runtime-config sidecar, taken from config. Those stay on `fetchWithTimeout`.
- Device-side fetches in `apps/mobile` are out of scope. The phone is not this server.
- Production still refuses private and loopback addresses. `ALLOW_LOCALHOST_PROXY` stays the local override the image proxy already has. Do not widen it.
- Do not add a second allowlist of public hosts.

## Alpha GitOps (k.podcastdj.com)

None. No new env key and no logout. Alpha web already calls the API in-cluster from
config (`podverse-api` in `apps/podverse-alpha/web/source/web-sidecar.env`). Those fetches
stay trusted. Public feed and image URLs, including the DigitalOcean Spaces CDN named in
the alpha env files, stay allowed because they are public https. A job that deliberately
fetches a private address stops doing so. Do not add an allowlist entry for that. No
file under `apps/podverse-alpha/` needs an edit for this change.

## Files

- `packages/helpers-requests/src/outboundHttpPolicy.ts`
- `packages/helpers-requests/src/_requestOutbound.ts`
- `packages/helpers-requests/src/outboundHttpPolicy.test.ts`
- `packages/helpers-requests/src/requestOutbound.test.ts`
- `apps/web/src/app/api/proxy/route.ts`
- `apps/web/src/utils/media/resolveMediaRedirect.ts`
- `apps/web/src/app/api/resolve-media-url/route.ts` if it fetches on its own
- `apps/workers/src/commands/imageShrink/batch.ts`
- `apps/workers/src/lib/archive/feedProbe.ts`
- `apps/workers/src/lib/podcastIndex/discoverArtistPublisherFeeds.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts` if that URL is not this deployment's config
- Tests next to those callers when they already mock the fetch

Search `fetchWithTimeout` and `fetch(` under `apps/` and `packages/` before editing. Classify each caller in the final message as trusted, untrusted, or test-only. Untrusted callers move. Trusted callers stay.

## Tests

- Extend `outboundHttpPolicy.test.ts` and the outbound request tests. A private literal is refused. A loopback name is refused. A redirect to a private address is refused. A redirect to a new hostname is checked with DNS, not only when the target is an IP literal.
- The image proxy route test, or a new unit test beside it, refuses a hostname the string checker would allow when resolution is private. Mock DNS. Do not send a real request at a link-local address.
- Worker tests that already mock `fetchWithTimeout` should mock the guarded client instead, so the production path is the one under test.
- No Playwright spec. The behavior is the server refusing a URL, not a screen.

## Release scratchpad

Append when the change is done:

```markdown
## Untrusted server fetches use one outbound check

- Surfaces: web, workers
- Change: the image proxy, image shrink, feed probe, publisher-feed discovery, and media URL resolution use the DNS-checked outbound policy. The connection stays on an address that passed the check, and a redirect is checked the same way.
- Who notices: an image or feed URL that pointed at a private or loopback address no longer loads through the server. Ordinary public URLs are unchanged.
- Operator steps: none
```

## Work

`validateOutboundFetchUrl` in `outboundHttpPolicy.ts` already allows only http(s), rejects embedded credentials, resolves hostnames, and refuses addresses whose range is not unicast. `_requestOutbound.ts` calls it, then axios resolves the name again. `validateOutboundRedirectLocation` does not resolve a hostname.

The end state:

- Lookup happens once inside the guard.
- The socket connects to an address from that lookup. The `Host` header and TLS server name stay the original hostname, so the remote certificate still matches.
- Every redirect runs the full check, including DNS, then connects to an address from that check.
- `fetchWithTimeout` remains the client for trusted URLs. It does not grow a partial copy of the policy. Untrusted callers use the guarded client.
- The image proxy keeps its size cap and image content-type allowlist. It stops treating `validateUrlForSSRF` as sufficient for the fetch. That string helper may remain for cheap rejects. It is not the check that decides the connection.
- Response size limits that exist today move with the caller. Do not drop them.

Do not describe the old gap in a code comment. State the guarantee: the connected address is one the guard accepted.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it and close issue 414.

```text
Server fetches of URLs that come from people, feeds, or other outside parties now use one
check. The connection stays on an address that check already accepted, and a redirect is
checked the same way. Fetches of this deployment's own API are unchanged. An image or feed
URL that pointed at a private address no longer loads through the server.
```

## Done

Search issue 414 again before the first edit. Do not run tests. Do not commit. Do not
comment on or close the issue. Append the scratchpad entry. Write `proposed-reply.md`,
move this directory to `.llm/plans/completed/414-outbound-fetch-policy/`, and give the
operator the verification commands from COPY-PASTA plus fish-safe git commands. The close
recommendation is only for after `develop`.
