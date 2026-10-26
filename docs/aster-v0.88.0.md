# Aster Phone 1.1.0 — RoleForge 0.88.0

Update RoleForge and reload SillyTavern. Workshop offers Aster Phone 1.1.0; existing enabled phone packages also use the updated native runtime. Phone data keeps schema 1 and character preferences remain separate from chat progress.

## Timeline fixes

The old phone event handlers only cleared queues, voice and UI on swipe/delete. They left phone metadata intact while core restored the RPG state. That retained abandoned messages, posts, news and calls, and could restore wallet money without reversing site credits.

The pre-reply checkpoint now records the complete branch bundle before asynchronous phone effects. Restoration uses the selected historical reply's bundle, or its preceding baseline for a new alternative. This restores phone state and RPG financial/NPC state together. Phone commits and timeline restoration share a serialized barrier; queued obsolete saves check their original epoch before changing RPG metadata. A save already awaiting acknowledgement finishes before the newer restoration is saved. Incoming phone processing waits for that barrier instead of guessing a 150 ms restoration delay.

Cached swipes process their own phone block. Returning to a previously visited swipe restores its saved phone and matching RPG state, including actions the player performed while on that swipe. Repeated receive events do not duplicate delivery. Deleting a range restores the surviving history prefix, including when that range exceeds the three recent core checkpoints. Assistant-message editing uses the same restore/reapply path. Reload retains the restored result.

Restoration includes messages, profiles/contacts, posts, news, follows, calls and transcripts, notifications, pending requests, processed/sync markers, notes/photos/browser state, account balances and transaction receipts. Earlier content and character-level language/theme/Voice preferences remain independent. No full phone image library is duplicated into a new per-swipe snapshot format: the existing structural-delta journal is reused.

Historical recovery requires a genuine saved checkpoint. This update cannot reconstruct phone history that older versions never recorded correctly. Main-chat user edits that leave later AI replies in place do not regenerate those replies; regenerate affected story content when its meaning changes. Late AI task output is discarded after timeline invalidation; the current SillyTavern raw-data API does not expose a request-owned abort signal, so this does not promise cancellation of an already running provider request.

## Interaction and storage fixes

- Explicit contact relinking replaces the prior NPC ID.
- Deleting a phone conversation removes notifications targeting it.
- Opening a message notification marks its conversation messages read.
- Already saved drafts/read states skip redundant writes. Thread previews use a single message-summary pass rather than scanning all messages once per thread.
- All runtime phone saves, including AI/account/financial results, enforce the phone storage budget before committing RPG money. Transactions remain acknowledged and idempotent.
- The stable composer, 80-message initial history window, background replies/calls and keyboard viewport handling from 0.87.2 remain.

## Visual and interaction design

| Area | Updated treatment |
| --- | --- |
| Messages / Gather | Removed the repeated app icon/branding block. Conversation heading, profile shortcut, search, All/Unread/Archived filters, newest-chat ordering, times and unread badges. Search text survives live list updates. |
| Conversation | Softer asymmetric bubble corners, clearer time labels, calm background gradients, stable auto-growing composer and separate reply-mode chip. New bubbles animate only while following the end of the conversation. |
| Home | Adapts to the actual available phone height so browser chrome or a smaller visual viewport does not clip the dock. Consistent typography and lighter widget surfaces; removed widget/dock backdrop blur to reduce mobile GPU work. Existing approved minimalist icons remain. |
| Contacts | Clearer rows, larger readable labels, avatar treatment and consistent editing-sheet spacing. |
| Calls | Ringing/connected styling, gentle connected-avatar glow, more deliberate call controls and a Text call / Voice enabled indicator. The activity capsule continues to reflect ringing, connected and background activity. |
| Lumen | Warm rose action accent, generous post cards, clearer author metadata and larger reaction targets. |
| Murmur | Violet action accent, consistent post/profile hierarchy and feed spacing. |
| Wallet | Teal identity, refined balance card and readable ledger rows. Its financial state shares timeline restoration with RoleForge. |
| Drift | Blue identity, larger tab labels, address-bar spacing and consistent news/site surfaces. |
| Harbor Store | Retains readable dark-on-cream feature text in both themes, aligned app actions and improved shared typography. |
| Photos / stickers | Softer gallery/card geometry, clearer captions and spacing. Existing upload/shared-media rules remain. |
| Notes / places | Shared row, card, label and spacing improvements. Maps still use story locations, not real GPS. |
| Settings / sheets | More readable rows, consistent 28 px sheet corners, clear field spacing and less mobile backdrop work. |

App entry uses a 190 ms fade/5 px movement; new visible bubbles use a 210 ms arrival; taps have a small 160 ms response. Connected-call glow has a gentle 3-second cycle. Motion configuration and system reduced-motion preferences suppress effects. Updates while reading older messages do not animate the reader to the bottom. New product labels support English and Thai. The preview recordings use English captions and controlled scene data, not real phone services.

## Verification

- `npm test` and `npm run check`.
- `npm run test:phone:timeline:real`: native SillyTavern A → B → A; cached versus newly received variants; messages/posts/news/calls/follows; wallet deposit restoration; assistant edit; six-turn range deletion; reload; and swipe while a wallet HTTP save is held before acknowledgement.
- `npm run test:phone:layout:real`: icon removal, search/filter/archive interaction, stable drafts/cursor, duplicate-submit protection, older-history scrolling, light/dark contrast, 320–430 px widths and reduced visual viewport. Chromium PC/touch mobile and WebKit mobile emulation.
- `PHONE_DEEP_QA=1 npm run test:phone:real`: messaging, calls/Voice, media, groups/social profiles, wallet/deposit/withdrawal/transfer, acknowledged save failure, reload and branch checks. Voice uses a local synthetic provider fixture; no external account calls.

Tests use isolated profiles and controlled AI events/replies. Browser mobile emulation is not physical iPhone testing. The historical X-Extreme story-sync test can also be run with its private exported card/chat supplied externally; those files are not distributed in the repository.

Release checks: **1,931 unit tests passed**, syntax checks passed, and the new timeline cases passed on Chromium desktop/touch-mobile and WebKit mobile. The full phone workflow and deep save/reload/branch checks passed on desktop and touch-mobile. Layout, search/archive, focus/history and separate system/app motion controls passed on WebKit. Preview videos use actual browser recordings with controlled fixture data, large captions, 1920 × 1080 PC and 1170 × 2532 mobile output.
