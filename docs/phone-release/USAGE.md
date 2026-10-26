# Aster One — using the phone

Aster Phone 1.1.2 ships with RoleForge 0.88.2. Update RoleForge and reload for coordinated phone/wallet timeline restoration, the refreshed layouts and Messages search/filter controls. Workshop offers the 1.1.2 package update. Manually saved app profiles now survive reply regeneration, swipes and reply deletion. Reply timing is plain text with a chevron below the composer; tap it to change the mode. The parked Pokémon work remains separate.

RoleForge 0.87.2 also improves the phone's rendering, mobile keyboard layout and Store readability. It preserves existing settings and phone data.

## Open and configure

Install **Aster Phone** in Workshop, enable it for the selected character, and open **Configure**. Its floating shortcut and Wand Menu entry can each be enabled independently. Desktop: drag the status bar to move the phone. Mobile: the device fills the browser viewport. Close it using the top control; closing does not cancel a reply or hang up a call.

By default the character must have a smartphone in RoleForge inventory or explicitly established possession in the roleplay (for example, using “my Aster”). A modern phone can also be assumed through **Assume a phone** in settings. This is useful for a card whose opening already gives the player one. The demo card includes an Aster One Smartphone.

Settings are shared across the character's chats. Contacts, messages, photos, posts, accounts, balances and calls belong to the current chat and its timeline. Branching restores the state captured at that message; future phone activity should not appear in the earlier branch. Login sessions are local runtime state and must be renewed after a reload.

## Contacts and first interaction

In Contacts, add the saved name, fictional number, image and notes. An existing RoleForge NPC can be linked; otherwise an AI NPC is created when you first interact with that contact. Saving an address-book entry alone does not create a character.

Your saved name is your label. The NPC's actual name and their app names are separate: someone saved as “Aoi at the café” might use “Aoi” in Messages, “aoi ☕” in Gather, and a playful handle in Murmur. Open their profile to edit each app's name, handle, bio, avatar, banner, privacy or status. Manual profile edits are preserved against subsequent AI profile suggestions.

Removing a contact removes the saved address-book entry while keeping the NPC and existing conversation. Blocking is separate: it suppresses incoming messages, calls and social activity and cancels pending interaction with that contact. A public social profile without a known number cannot be called or texted through SMS.

## Sending messages

Choose **Reply now** for an immediate background AI task, or **Next roleplay turn** to queue the message for the next normal main-chat response. You can change the default in Settings. Immediate sends made while another generation is active wait for it to finish. “Reply now” within a conversation targets that conversation.

NPCs can answer with several bubbles. No synthetic player message is inserted in the main chat. Close the device and read the roleplay while a background task continues. An unsuccessful response leaves the request available to retry rather than fabricating a reply.

The **Replies** control below the composer shows the current reply mode. **Sent · next story reply** means the message is queued intentionally; **Reply now** asks for its answer without waiting for another main-chat turn. Closing the phone dismisses its text focus and does not focus the main chat box.

Long conversations initially display the latest 80 bubbles. Use **Load earlier messages** to reveal older batches; the full conversation remains saved. Incoming replies preserve your position when reading older messages and keep your current draft and cursor intact. Text typed while a preceding send is saving remains the next draft.

The message menu supports reply, pin, edit your own text and delete. Conversation controls include pinning, archiving, deleting, mute and block. Gather adds groups with editable names and membership. Deleted content is removed from the phone's visible record; this is not a claim to erase information already present in prior model context.

Photos can be attached with a caption. Only explicitly shared images enter the recipient's shared-photo context. The text task receives captions and identifiers, not pixel-level image interpretation. Unsent text and image attachments remain drafts.

## Stickers

Upload a PNG, JPEG, WebP or supported GIF in Stickers, give it a name and describe when it fits. Enable NPC use per sticker. Both you and the model select from this saved library; the model cannot invent an uploaded asset. Images are validated and ordinary uploads are resized/compressed for chat storage. A sticker-only send preserves unfinished text in the composer.

## Calls and Voice Addon

Call a contact, or permit incoming calls in Settings. Ringing, connected, declined, missed and ended are separate states. Incoming calls require acceptance. Closing the phone keeps a connected call active; hang up to end it.

The call transcript accepts typed phone speech and, according to **Call input**, player speech or matching NPC dialogue from the main chat. `|private thoughts|` and narrative actions are excluded. Muting prevents the player's main-chat speech from being sent to the call. Speaker is an in-world call state; it does not alter physical device volume.

Text calls work without Voice Addon. For spoken NPC replies, connect the existing RoleForge Voice Addon, enable phone call voice, and select a contact voice or fallback. Only NPC call speech is voiced. Playback can be replayed. Hanging up, disabling the addon or changing chats stops the phone's voice channel. Browser autoplay restrictions may require a user tap.

## NPC activity and the activity capsule

Incoming messages, calls and social actions have separate permissions. Offscreen activity is separately configurable. The normal roleplay response can record a grounded NPC phone action; the addon validates the event, permissions and contact state before applying it. There is no unattended background model polling. If a completed scene confirms an incoming message but its event record is missing, the addon can make one background data request to reconcile that scene. It excludes private thoughts and unsent drafts. Legacy chats with an empty phone inbox check their latest completed scene once; failed or interrupted synchronization is retryable through the error notice or Settings → Check for missing recent messages. It does not replay the whole chat or invent a player message.

The activity capsule changes for ringing calls, active calls, messages and background replies. Motion, notification sound and the capsule itself are configurable. Notifications can be inspected without accepting a call. Quiet mode and block rules continue to apply.

## Harbor Store and social apps

Install or remove optional apps in Harbor Store. Removing an app preserves its data for reinstalling.

- **Gather:** private/group messaging, the same media and sticker library, group naming and membership.
- **Lumen:** image posts and stories, comments, likes, bookmarks, follows and private profiles. Stories use the story clock.
- **Murmur:** short posts, replies, likes, bookmarks, reposts and independently styled public identities.

Open your own or an NPC profile to edit it. Private follow requests can be approved. Confirmed scene actions may produce NPC posts, follows or unfollows. These are fictional services inside the story, with no real social accounts or external posting.

## Wallet and Drift

Wallet reads the configured RoleForge currency scheme. Select the denomination and account label; BANK/CASH/COIN in the demo are examples, not compulsory global units. Transfers use the existing money-transfer engine and available-funds checks. Phone receipts tell the model that a transaction has already settled so it should not debit a second time.

Drift is an in-world browser with news, search, tabs, favorites and history. News comes from story events. Night Arcade is a fictional site: register, log in, deposit world currency, play dice or slots, and withdraw. It uses the actual RoleForge wallet, not a second disconnected player balance. Deposits and withdrawals save the phone ledger and wallet together. Retry identifiers prevent a duplicate charge; failed saves show an error and do not count as success.

The site stores canonical credit values so changing the selected denomination does not multiply funds. The demo's account/PIN is fictional and local to this chat. These are not real banking credentials. Dice and slots show their payout rules; results are settled by the game engine rather than chosen by the language model.

## Everyday apps

Photos stores uploaded images; Notes keeps editable notes. Maps lists known RoleForge story locations and does not request real GPS. Settings includes Thai/English, light/dark appearance, wallpaper, activity permissions, reply behavior, Voice, motion and shortcut placement.

## Installation

Update RoleForge to **0.87.1 or later** through SillyTavern's extension updater, then reload SillyTavern. Open Workshop, install **Aster Phone**, enable it for the selected character and open **Configure**. Import the optional demo card through the normal character importer if you want a modern-city starting point.

The small Workshop package describes addon data; the native implementation ships with RoleForge. Installing only the phone package on an older runtime cannot add its code. Existing phone preview chats and character preferences are retained by the released runtime. Disabling the addon hides its UI without deleting saved phone data.
