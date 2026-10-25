# Aster Phone validation

## Automated checks

- Full repository unit suite: **1,922 passed, 0 failed** (`unit-complete.log`).
- Phone-specific suite: **39 passed**, covering contact/NPC identity, deferred/immediate requests, groups, profiles, privacy, blocking/removal, call speech, stickers/photos/drafts, wallet conservation/retry/currency changes, branch data, ownership queues and strict save acknowledgment.
- `npm run check`: all runtime syntax checks passed.

## Native SillyTavern

Host: **SillyTavern 1.19.0**, isolated local test profile. Actual Workshop installation, native UI, RoleForge persistence, main-chat generation and Voice Addon integration are exercised. The model endpoint and voice provider responses are controlled test fixtures; no external paid model or voice requests were made.

Completed Chromium PC and touch-mobile flows cover contact editing, lazy NPC creation, multi-bubble messages, both reply modes, background closing, stickers, phone calls, main-chat speech/thought privacy, incoming activity capsule, optional Voice, app profiles/posts/stories/comments/follows, groups, wallet transfers, browser accounts/games, photos, notes, maps, blocking/removal and English/Thai themes.

A separate WebKit mobile run passed these same native feature flows. This is browser touch emulation, not a claim of testing on physical iPhone hardware.

Deep PC validation additionally injects a failed HTTP deposit save and verifies both phone ledger and RoleForge wallet remain unchanged; reloads and checks saved messages/stickers/notes/theme and expired login sessions; creates an actual SillyTavern branch at an earlier message and checks later phone activity disappears while character preferences remain.

A focused native queue check also passed: a second immediate message resumes after a busy phone task, while a different conversation queued for the next main turn remains deferred.

The final recordings use the same native harness, with eight-second feature reading holds and assertions throughout. PC video is 1920×1080; mobile video is 1170×2532. Both include readable subtitles and chapter metadata. Synthetic call audio is generated locally and routed through the existing Voice Addon pipeline, then mixed at the captured playback timestamps.

## Limits and evidence

Controlled fixtures verify routing, validation, persistence and UI behavior. They do not establish that every external language model will always produce valid phone events. A live provider credential was not used. Voice playback follows normal browser autoplay rules and the user's configured voice service.

Artifacts: `minimal-desktop`, `minimal-mobile`, `deep-desktop`, `webkit-mobile`, `queue-native`, and final `record-desktop` / `record-mobile` reports in the supplied showcase evidence. Each report records the host, browser, exercised features and errors. Screenshots are taken from the running SillyTavern extension rather than mockup renders.

Preview branch only. Main remains unchanged; the Pokémon and earlier phone prototype worktrees are retained.
