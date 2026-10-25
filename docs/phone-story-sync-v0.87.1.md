# RoleForge 0.87.1 — phone messages and roleplay synchronization

The reported export had a Cassandra address-book entry, an existing X-Extreme NPC using that alias, and an empty phone inbox. The latest reply described sending a sequence of messages, but no phone event block or actual message text remained in the saved reply.

## Causes and fixes

1. Core state-patch cleanup also removed `<rf-phone>` blocks. A combined reply could lose its phone events before the delayed phone listener read them. Stored message, selected swipe and display surfaces now preserve phone protocol; visible prose continues to hide it. Display formatting strips the protocol without deleting its stored event data. Phone source identity ignores core tracker patches, so cleaning those patches does not create a second delivery.
2. First incoming messages had no pending player request, so their custom-contact profile could be ignored; an unlinked sender's events were then rejected. Valid proactive events now make their sender eligible for profile setup, subject to activity permissions, destination and blocking rules.
3. A saved alias did not link to an existing NPC unless explicitly selected. Exact canonical names, aliases and explicit alias declarations now connect an unlinked contact to one unambiguous existing NPC. The saved public label stays unchanged; a mention of someone in a biography does not count as an alias. Existing links and ambiguous names are left alone. Canonical identity is internal to the engine and is not substituted into the phone header.
4. An empty inventory could block a phone explicitly owned and used in the roleplay. The addon now recognizes player possession such as “my Aster” or an Aster notification addressed to the player. It does not add an inventory item or interpret another NPC's phone/private thoughts as the player's possession.

## Existing chats and missing model output

On enabling/loading an existing chat with an empty phone activity record, the addon checks the latest completed scene after Workshop preferences are ready. If that scene confirms a received/sent NPC message but supplies no phone data, it can make one background data request to reconcile the completed activity. It uses only the relevant contacts and scene, excludes thoughts and unsent drafts, and adds no user message to the main chat.

When a scene says messages were sent without writing their words, those words cannot be recovered verbatim from the export. The reconciliation task composes short NPC messages consistent with that completed scene; where sent text is written explicitly, it is instructed to reuse it. This still depends on the selected model returning valid event data.

Attempt and completion records are saved with the chat, preventing automatic repeat calls or duplicate delivery on reload. Failed, empty or interrupted reconciliation can be retried through its notice or **Phone Settings → Check for missing recent messages**. A retry targets the failed scene while it still matches the saved source. Disabled incoming activity and blocked contacts remain respected. The process checks the latest scene, not the entire history.

## Validation

Regression tests cover mixed tracker protocols on stored message/swipe/display surfaces, stable source identity, proactive first-contact setup, disabled activity, alias reuse/ambiguity, confirmed English/Thai phone actions, private thoughts/unsent drafts, possession and interrupted synchronization. Native tests import the supplied character and chat into an isolated SillyTavern profile and check inbox recovery, alias identity, no synthetic inventory, reload deduplication, mixed state/phone updates and subsequent player replies.

Native AI responses are controlled fixtures; no external model or voice account is used. Screenshots illustrate these test replies rather than a verbatim reconstruction of missing original words. Original uploaded files are not modified or committed.

Release checks: **1,929 unit tests passed**, runtime syntax checks passed, and native import/reload/mixed-protocol/reply checks passed on Chromium PC, Chromium touch-mobile and WebKit mobile. Mobile tests use browser emulation, not physical iPhone hardware.

To reproduce the private-file native test, start a local SillyTavern test profile, set `PHONE_PRIVATE_CHAT` to the reported JSONL export and optionally `PHONE_PRIVATE_CARD` to its PNG card, then run `npm run test:phone:story:real`. The uploaded files are external test inputs and are not part of the repository.
