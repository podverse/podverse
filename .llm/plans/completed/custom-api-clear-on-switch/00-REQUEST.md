# Request — Clear the phone when the custom API address changes

## Request

my colleague who self-hosts his own instance of podverse infra, and then changes the path used in requests using the advanced feature to point to his servers, is running into an issue. i am posting our conversation although i don't know if either of us has the best solution. investigate and figure out what the best approach would be. ask if there is a critical decision to make.

The posted conversation:

> Yep. Related to the fact, I was connected to a different server first and we don't have proper segmentation between them to let the app know what it's connected to
>
> What do you mean by segmentation? Do you mean like displaying if they're on incompatible versions?
>
> I was connected to podcastDJ now I'm connected to SUORCD. I deleted all the podcast from the other, it feels like something just got stuck and weird. It would be nice to have debugging so I could send you what's actually inside.
>
> One thing I can think of is that the IDs between podcast DJ and your server are likely different, and maybe end points need to use Podcast Index IDs as a source of truth instead of internal database IDs. We don't want to be obligated to Podcast Index either, but maybe there could be an endpoint that tells you what the source of truth and point is to ensure IDs are compatible
>
> Possibly though I wear thinking that we needed to prepend the server url to the Id. Or a hash of the url, so if people jump around the IDs can't get jumbled

does this plan account for everything it needs to? for example, previous api ids may not align with ids of the new api. jwt / auth key will not work between different apis

is there anything else that you can confidently assume will not be cross compatible with an entirely separate api / infra and therefore can and should be removed?

instead of a popup, i think you should display an entire confirmation screen that lists fully all the data that will be cleared

## Operator answers

Colleague's app: my colleague is on the nextgen app.

What a switch does: when a user changes the api url, do not keep their local storage from the previous url (although the data should persist on the remote server if they were logged in to the previous api url). instead, after they try to switch api urls, a confirmation popup appears that warns them that switching the api with result in clearlng everything they have saved locally, since it will no longer be compatible with the api, and asking them to accept or cancel.

The popup was then replaced: display an entire confirmation screen that lists fully all the data that will be cleared.

Where to run the set: create the plan files and save them locally. we will not need a new worktree. we will stay with this branch.

Model: the plan should only use grok 4.7. our opus limit is exceeded.

## Glossary

- clearlng: clearing
- I wear thinking: the colleague's words, as posted
- podcastDJ and SUORCD: two self-hosted servers the colleague switched between
- jwt / auth key: the phone's access token and refresh token for a Podverse API. A UnifiedPush distributor auth key is not this credential.

## Orientation

- `apps/mobile/src/screens/more/MoreCustomApiScreen.tsx` — Save and Reset. Logout is required before the address changes. The health probe runs before a new custom address is kept.
- `apps/mobile/src/config/customApiUrl.ts` — `planCustomApiCommit` returns `unchanged`, `invalid`, `clear`, or `probe`.
- `apps/mobile/src/config/customApiProbe.ts` — unauthenticated `GET {base}/health`. No bearer token.
- `apps/mobile/src/config/customApiEndpoint.ts` — `writeCustomApiBaseUrl` only stores `api.custom_base_url`.
- `apps/mobile/src/auth/secureTokenStorage.ts` — `auth.accessToken` and `auth.refreshToken`.
- `apps/mobile/src/auth/authRequestWithRefresh.ts` — `advanceAuthSessionGeneration` drops the in-memory tokens.
- `apps/mobile/src/auth/AuthProvider.tsx` — `clearSession` deletes tokens and account caches. It leaves subscriptions, downloads, and Add by RSS feeds.
- `apps/mobile/src/data/db/schema.ts` — one `podverse.db`. Directory rows are keyed by that server's `id_text` and serial ids.
- `apps/mobile/src/data/repositories/addByRssCredentialStore.ts` — `clearAccountCredentials` deletes account feed secrets and leaves the signed-out owner's.
- `apps/mobile/src/lib/addByRss/credentials.ts` — `SIGNED_OUT_CREDENTIAL_OWNER` is `signed-out-device`.
- `apps/mobile/e2e/custom-api.yaml` — rejects a bad address and resets when no override is saved. It never calls the network.
