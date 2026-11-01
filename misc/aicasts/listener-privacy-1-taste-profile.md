# Listener Privacy 1: What Taste Profile Records

- **Version:** 2026-10-24T22:07-05:00
- **Episode ID:** listener-privacy-popularity-tracking
- **Changed:** Rewritten for the rebuilt system: the opt-in is now Taste Profile, the listener id
  is permanent and kept in its own schema, listens are stored per session with daily totals and a
  per-show Taste Profile, and the limits, flags, and opt-out cooldown are new. Previous title:
  "Listener Privacy 1: What Popularity Tracking Counts". Regenerate the audio.
- **Description:** What Taste Profile records when a listener turns it on, what it never records,
  how the listener id is kept apart from the account, the limits that keep public counts honest,
  and what turning it off deletes.
- **Status:** Built
- **Group:** Listener Privacy, part 1
- **Sources:** `.llm/plans/completed/popularity-tracking-rebuild/`,
  `.llm/plans/completed/popularity-anti-gaming/`, `docs/features/POPULARITY-AND-TASTE-PROFILE.md`,
  `apps/api/legal/taste-profile-agreement/en-US.md`, `apps/api/legal/terms/en-US.md`,
  `apps/api/src/lib/legal/tasteProfileAgreementContent.ts`,
  `packages/helpers/src/lib/popularityListen.ts`,
  `packages/orm/src/services/stats/listenerIdentity/`,
  `packages/orm/src/services/stats/statsPopularityRefresh.ts`,
  `packages/playback-core/src/listenSession.ts`,
  `apps/web/src/utils/statsTracking/statsTracking.ts`
- **Length:** about 9 minutes (1,351 words)

## Directions for the voice service (do not read aloud)

- Two voices. **Claire** is a woman: warm, clear, measured. **Tom** is a man: relaxed, curious.
  Each line starts with the speaker's name and a colon. That name picks the voice. Never read it.
- About 150 words per minute. Natural turn-taking, no overlap.
- Read only the lines under **Script**, exactly as written. Do not read headings or these
  directions.
- A line that says `(pause)` is about one and a half seconds of silence. Never say "pause".
- No music, sound effects, intro, or outro.
- Pronunciation: **Podverse** "POD-verse". Say **id** as the word "id", rhyming with "kid".
  Spell out **UTC** letter by letter.
- If your service writes its own script from this one, keep every number and every claim
  exactly, keep both voices, and add nothing the text does not say.

## Script

CLAIRE: This is part one of Listener Privacy. It covers Taste Profile, the optional Premium feature that records a member's listens. Those listens build the member's own Taste Profile, which drives their recommendations, and they also count toward the public popularity lists, without the listener's name. It's built.

TOM: Wasn't this called Popularity Tracking?

CLAIRE: It was, and it worked differently. One row per account per thing, a random id that could rotate, and rolling counts. That couldn't tell a first listen from a replay, kept nothing per listener that lasted, and let the same account count again after a rotation. The rebuild replaced all of it.

(pause)

TOM: What rules does it hold to?

CLAIRE: Four. It's opt-in: nothing is recorded until the account says yes to the current version of the explanation. A no sticks; a later version never asks again. Never call the records anonymous, because the company can connect them back to the account. And the stored field names keep their old listen stats names, because phones keep account snapshots on disk.

TOM: So it's private, but not anonymous.

CLAIRE: Right. Privacy here is a layer. Every listening row holds only a random listener id. The table that maps an account to that id lives in its own database schema. The read-only database role can't see it, and the management database browser doesn't list it. Only a small zone of account-facing code reads that mapping. Everything else, the workers, the management side, the popularity jobs, works from listener ids already on the rows. A lint rule and a source guard test enforce that.

TOM: Does the id rotate?

CLAIRE: Never. It's created at the first stored listen and lasts until the account is deleted. Rotating it would add no real privacy, and it would let one person count twice.

(pause)

TOM: Walk me through a listen.

CLAIRE: The player measures media seconds actually heard, so seeking doesn't count. A listen counts at sixty seconds, or a quarter of the episode or track, whichever comes first. Every surface uses the same shared rule. The device gives each listening session its own id and repeats it on every report, so a later report only raises the seconds heard or marks it finished. It never counts the session twice.

TOM: Whose clock decides the day?

CLAIRE: The server's. Reports carry no device time. A phone that was offline counts its listens on the day they arrive.

TOM: And who can send them?

CLAIRE: A signed-in account with a current yes. Signed-out listening isn't recorded, and neither are Add by RSS episodes. A trial member's listens build their Taste Profile but never count toward the public lists. Counting publicly takes paid Premium.

(pause)

TOM: Where does a listen end up?

CLAIRE: Three stores, each with its own lifetime. First, the raw listen record: the listener id, the episode or track, the clip if it was one, the show, seconds heard, whether it finished, and the time. Those are kept for the retention setting, ninety days by default, and dropped a whole month at a time. So a record lasts between ninety days and about a hundred and twenty-two.

TOM: Second?

CLAIRE: The Taste Profile. One row per listener per show: a podcast, an album, or an artist. Episodes and tracks never get rows. Each row keeps listen and completion counts, first and last listen times, and two fading scores, a recent one that halves every fourteen days and a long-term one that halves every hundred and eighty. It stays until the listener turns the feature off or deletes the account.

TOM: And third?

CLAIRE: Daily totals. How many distinct listeners each show, episode, clip, profile, and playlist had that day. No listener id at all, and they're kept forever. The day, week, and month lists are rebuilt every hour from the raw records. All-time adds up the daily totals, and counts one listener once per thing every ninety days.

(pause)

TOM: What stops someone from gaming the lists?

CLAIRE: A few limits, all server settings. A new listen within twenty seconds of the listener's last stored one isn't stored. A listener can store three hundred listens a day, and only the first hundred count publicly. The rest still feed their own Taste Profile. Opening someone's profile or a playlist counts once per day per thing, and at most ten a day.

TOM: And if it still looks scripted?

CLAIRE: The listener gets flagged. Two signals do it: reaching three hundred stored listens within three hours of the day's first, or thirty minutes in a row of listens arriving too soon. A flag keeps the listener out of the public counts. Their Taste Profile still updates, and every answer looks the same as before, so they're never told. An admin with the right permission can clear the flag in the management app.

(pause)

TOM: What does the listener see?

CLAIRE: A short summary above two buttons, Yes, Build My Taste Profile, and No Thanks. The full explanation opens under How It Works, and View Terms of Service is below. The text comes from the server, so it can change without an app release, and the retention days are filled in from the server setting. It's written in English, Spanish, French, and Greek.

TOM: And after they say yes?

CLAIRE: Settings lists their Taste Profile, show by show. Removing a show moves it to Not Counted in Recommendations and deletes its taste data. Listening to a show on that list still counts publicly; it just doesn't come back. Taking it off the list asks whether to add it back now, starting over, or let the next listen do it.

TOM: Anything only one surface does?

CLAIRE: The website also records opening someone else's profile and opening a playlist. Those count only for the public lists. Opening your own isn't recorded, and the phone records neither.

(pause)

TOM: Now turning it off.

CLAIRE: The app asks first, with Turn Off Taste Profile. On confirm, the server deletes that listener's listen records, Taste Profile, hidden list, and recommendations right away. Daily totals and all-time counts have no listener in them, so they stay. The day, week, and month lists drop the listener at the next hourly refresh.

TOM: And the listener id?

CLAIRE: It stays. That's what makes the limits hold. Turning it off and on again doesn't reset the daily limits or the twenty-second gap, and for ninety days after a no, new listens build the Taste Profile without counting publicly, and opens aren't recorded at all. Otherwise saying no and yes would be a way to count again.

TOM: What if their membership lapses instead?

CLAIRE: Nothing is deleted. Recording stops, the Taste Profile waits, and stored records still age out. The same goes for a new explanation version waiting for a yes. Deleting the account is the other path: the listener id goes, and everything tied to it goes with it.

(pause)

TOM: When should someone bump the explanation version?

CLAIRE: Only when what's recorded, how long it's kept, or who can see it changes. A bump turns every yes off. The screen then says, "How Taste Profile works has changed. It stays off until you turn it on again." People who said no aren't asked. The terms of service have their own version, and bumping that one blocks the app until everyone accepts again, so it's the bigger hammer.

TOM: Anything for operators?

CLAIRE: On a new deployment, run the partition job once by hand before the first listens arrive, so each month already has its own partition. After that, a daily job keeps the current month and the next two ready, and drops months past retention.

(pause)

TOM: To remember. One: Taste Profile is opt-in, a no sticks, and the records are never called anonymous. Two: the listener id is permanent, and only one small zone of code can connect it to an account. Three: raw records age out after ninety days or so, Taste Profile rows stay until opt-out, and daily totals stay forever. Four: twenty seconds between listens, three hundred stored and a hundred counted a day, and flags for scripted listening. Five: turning it off deletes the listener's data right away, but keeps the id, so the limits and a ninety-day cooldown still apply.

CLAIRE: Count real listening, keep it apart from the person, and say plainly what's kept.
