# First incoming contacts — RoleForge 0.88.3 / Aster Phone 1.1.3

## Cause

Aster's incoming-event merger required a saved contact, while prose recovery searched only existing contacts with numbers. An empty address book therefore had no valid destination for the first NPC message or call. The same problem could affect a known NPC whose phone number had not been recorded. Older builds could acknowledge that undeliverable reply as processed, preventing a later retry.

## Behavior

- A completed NPC message, call or supported social event can establish its incoming contact automatically. Reuse the existing NPC ID and existing contact whenever available; a genuinely new sender may provide an incoming profile and NPC dossier in the same reply.
- An anonymous account can receive through a stable public account ID without exposing or inventing its real identity. Automatically derived labels use the active NPC visibility projection.
- A first direct message creates its conversation. The AI does not need to know the generated thread UUID. Invented new-thread identifiers are routed to the proper direct conversation; real group membership and deleted-thread validation remain intact.
- A received message channel permits replies without inventing a phone number. A received call channel permits answering/callbacks. Public social accounts do not gain SMS/call access just because they exist. Incoming contacts can have their names/images edited while their number is still unknown.
- Incoming-message/call permissions, blocked NPC/contact identities, installed apps and offscreen permissions still apply. A profile without a deliverable event cannot create an incoming contact. Plans, unsent drafts and private thoughts do not count as delivery.
- Existing manual profile edits remain protected. Contacts created by phone story events remain part of the timeline and disappear when the originating reply is undone; no NPC or future contact is resurrected through profile retention.

The main phone prompt explains how to initiate contact and includes a bounded NPC routing index. Runtime processing coordinates with the core reply state before linking newly introduced NPCs. Relevant archive NPCs are loaded before phone results are committed.

English/Thai prose recovery recognizes completed messages and calls even without a saved contact. It can use existing NPCs or a new sender established in the visible scene. If a completed scene omits the phone data block, one reconciliation request asks the configured model for the missing phone records. No automatic polling is introduced. A sender promising to message later does not create an immediate notification.

## Existing missed first messages

Phone metadata includes an additive routing-version marker. An older empty phone gets one migration attempt for its latest completed assistant reply if that reply establishes incoming phone activity. Only the corresponding stale processed markers are cleared. Existing message/call histories, user-deleted conversations and address books are not bulk-replayed. If a provider request fails, the existing sync status/retry UI remains available.

This does not reconstruct every historical missed message. Older missed events outside the latest eligible reply still need a new story confirmation or an explicit sync of relevant content.

## Performance

Known contacts with established channels do not receive an extra registration-validation clone on every incoming bubble. New channels are validated before committing their contact; a successful validation is reused for profile eligibility. The routing index is bounded, images remain outside model context, and recovery remains one task per qualifying reply.

## Validation

- Full unit suite (1,949 passing tests) and syntax checks; focused tests cover empty address books, new NPCs, anonymous senders, replies/callbacks without invented numbers, block/permission failures, private identities and prose detection.
- Real local SillyTavern normal generation, desktop 1920×1080 and mobile 390×844 emulation: two first-contact bubbles, reply without a manual contact, no synthetic main-chat user turn, one-time legacy recovery after reload, Thai prose-only delivery through one recovery task, new core NPC plus incoming call in one reply, answering, blocking an alternate contact ID, deleting the originating reply and reload.
- Mobile WebKit runs the same first-contact and migration flow. No physical iPhone or paid provider is used; model responses are controlled local fixtures.
- Existing cached-swipe/edit/regenerate/delete/wallet-save-race and native player-profile persistence suites remain passing.

Update RoleForge, reload SillyTavern and update Aster Phone to 1.1.3 in Workshop. Enable **Allow incoming calls** if NPCs should ring the phone; the existing call preference is preserved.
