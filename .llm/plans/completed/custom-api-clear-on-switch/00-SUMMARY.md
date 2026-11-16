# Summary — Clear the phone when the custom API address changes

One change on nextgen mobile. Pointing the app at another API address leaves one local library, one login, and one push registration in place. Those ids and tokens belong to the previous server. The switch erases them on the phone after a full-screen list. The account on the previous server is not modified.

Podcast Index ids are not the fix. A hash glued onto an id would be sent to the server, which looks up the id it issued.

## Requirement ledger

- **R1** (area A) "my colleague who self-hosts his own instance of podverse infra, and then changes the path used in requests using the advanced feature to point to his servers, is running into an issue" — Plan: 01
- **R2** (area A) "when a user changes the api url, do not keep their local storage from the previous url" — Plan: 01
- **R3** (area A) "the data should persist on the remote server if they were logged in to the previous api url" — Plan: 01
- **R4** (area A) "display an entire confirmation screen that lists fully all the data that will be cleared" and "asking them to accept or cancel" — Plan: 01
- **R5** (area A) "previous api ids may not align with ids of the new api" — Plan: 01
- **R6** (area A) "jwt / auth key will not work between different apis" — Plan: 01
- **R7** (area A) "anything else that you can confidently assume will not be cross compatible with an entirely separate api / infra and therefore can and should be removed" — Plan: 01

## Areas

Area A owns `01`. It starts from `MoreCustomApiScreen`, `planCustomApiCommit`, `schema.ts`, and `secureTokenStorage.ts`. It depends on no other area. It shares no files with another area.

## Order

One phase. The set stays on the current branch. No worktree.
