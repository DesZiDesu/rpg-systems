# Host and iOS acceptance checks

## v0.39.2 Writing prompt and request display

- Open Extensions → Tretaresia RPG → View & edit writing prompt. With NSFW Enhance off, the preview must contain no adult-style text or chosen tags. Toggle it on, select a tag, switch story language and verify the preview updates without an AI request. Type a short replacement style and verify preview updates without saving on each keystroke; leave the textarea and check it persists after reload. Reset style, check the default returns and the selected tag stays selected. On iPhone, both textareas must fit the drawer width without pushing main chat sideways.
- Before and after a normal role-play reply, inspect the RPG-initiated request counter. A fully reported scene needs no separate Scene completion call; a reply missing scene fields may add one. Manual Sync and UI actions should update their own breakdown. Reload the page and confirm the counter starts again at zero.

## v0.39.1 Localized adult tags

- Set the extension interface language to Thai and open NSFW Tags. Every built-in tag should show a Thai explanation above its English name. Search for both `Kissing` and `การจูบ`; each finds the same toggle. Select it, change interface language to English without closing the drawer and confirm the list updates immediately and the selection remains checked. Return to Thai and confirm the saved tag is still `Kissing` and no save occurs simply from a search or list redraw. Imported and custom tags remain as entered.

## v0.39.0 NSFW Enhance and bilingual narrative

- Open SillyTavern Extensions → Tretaresia RPG drawer. Confirm NSFW Enhance starts off and no theme labels enter the model prompt. Switch on, select two tags, then switch off; selected tags should remain in the drawer while the style instructions and labels immediately leave the model prompt. Search by name and create, toggle and remove a custom tag.
- Import a plain text file with one tag per line or a JSON array. Searching should find imported names without saving a large catalog into extension settings. Reload in the same browser: imported names should remain. On a second device the imported catalog may be absent, while previously selected labels remain visible as settings data.
- With roleplay language Auto, send a Thai user message and then an English one; the next generated stories should follow each respective language, without changing the interface language. Verify the explicit Thai/English overrides and return to Auto.
- In the chat presentation, check stored and fresh messages containing `*quiet*`, `**urgent**` and literal HTML-shaped text. Only the first two should become italic/bold; HTML-shaped text must stay inert. On an iPhone width, confirm sound brackets 「...」 and emphasized Thai text wrap within the chat column.

## v0.38.1 NPC creation and iPhone keyboard

- In NPC Management on iPhone, focus the long brief, Name, Appearance and a lower attribute field. The keyboard should leave a compact title and most of the visible area for the focused input; scrolling should keep it above the keyboard. Dismiss the keyboard and confirm tabs, scope, AI/Save buttons and status return without losing the draft. Repeat with the keyboard's Next button.
- Select a separate reference image near Generate and a different saved portrait under Chat Appearance. With Image inlining and a vision-capable chat model, Generate should write a brief visual description into Appearance; Save should keep the saved portrait and Appearance, without storing the separate reference image. Opening a fresh draft should have no old reference image.
- Repeat with a model that cannot read images: report the image error and keep the existing form unchanged. Turn off image reading, type the appearance in the brief and Generate using text. Force a short, incomplete but valid JSON response and confirm useful fields are retained; malformed JSON should retry once, then leave the draft untouched with an error if still invalid. Confirm a 524 does not trigger a retry loop.

## v0.31 list navigation and scopes

1. Open Management with an empty chat and again with existing NPCs. Only the list/empty state should be visible; no editor should open automatically. Selecting a row opens a read-only dossier. Edit and Create are explicit actions. Back returns to the list and warns before abandoning an edited draft.
2. Load 45 NPCs, search by alias/name/role, and use the three pages. At 320px and 390px widths, records must remain stacked vertical rows, never a horizontal tab strip. The scope selector and Back must remain accessible.
3. Create one Chat NPC and one Character NPC on card A, with portraits. Open a different chat on card A: only the Character record should follow. Return to the original chat: both records must still exist. Switch to card B (also give it the same display name): A's Character record must not appear. A group chat must disable Character scope.
4. Edit the Character template on card A. Reopen its other chat and check shared biography/color/portrait updates. Change the same NPC's location in a normal AI reply: that scene change must remain local to that chat and leave the Character dossier/template unchanged. New AI NPCs must always be Chat-scoped.
5. Copy a Chat NPC into Character with the dossier action. Confirm both records remain, with copied image/framing. Same-name Chat takes precedence only in its own chat. Duplicate destination names must be reported without overwrite. Copy back to another chat and verify image storage is independent.
6. Enable auto-continuity and start a new chat from an old pre-0.31 chat. Player/world continuity may carry over but Chat NPCs/linked contact memberships must not. Existing old chats must keep their own records.
7. Import Character Life in each scope; verify the destination heading, fields, images and duplicate checks. Switch chats/cards or press Back during slow file/AI/image work: late results must not write into the newly selected scope/chat.
8. Swipe an AI reply after saving a Character template edit or creating a new Character NPC. Shared changes must survive; per-chat story deltas should follow the selected reply.

## Existing chat / portrait features

Automated Node tests exercise the production schema, patch parser, prompt integration, image geometry and Character Life import. They do not replace a live SillyTavern/iPhone test.

1. Update the extension, reload SillyTavern normally, open an existing chat. Open NPC Management from both the NPC Codex and settings. Existing NPCs must appear without migration or cache clearing.
2. Create and edit an NPC with identity, title, occupation, race, relationship, all five long profile fields, custom color, role icon and abilities. Reopen the chat; fields must survive. Old Codex diary, knowledge, stats and map coordinates must remain intact.
3. Upload a portrait. On iPhone Safari, drag with one finger, pinch with two, lift one finger and continue dragging. Move each X/Y/zoom slider and use keyboard arrows when available. Portrait stays square with no exposed edge. Save, reload, remove portrait, save; no empty frame and no linked portrait should reappear. No page zoom/scroll while dragging the canvas; normal page scrolling outside it.
4. With Auto Track enabled, send a normal story turn that introduces a named NPC. Its model patch should populate Management. Swipe/regenerate/delete the turn; the original host rollback behavior should remain intact. Hostile NPCs must remain out of friendly social lists.
5. Click AI fill with several fields prefilled. Verify those facts are unchanged and new text is only a draft until Save. Test disconnected AI and malformed JSON: draft remains editable with an error. Close/switch chats while AI is pending: no late draft/save should enter the new chat.
6. Import a direct Character Life JSON, an old JSON backup with embedded portraits and a v3 ZIP with portrait files. Check active-form image/framing, shared fields and missing-image notice. Unrelated settings must not import. Existing duplicate names must be disabled/skipped. Reject invalid JSON, compressed/unrelated ZIP and oversized files without partial metadata updates.
7. New tagged replies show a borderless header, parchment quotation dialogue, gold engraved unboxed narrative, and optional framed portrait. No-image speakers show no image placeholder. HTML from model text must not execute. Existing untagged replies stay unchanged. Turn presentation off/on and check restoration, streaming, edits, swipes and chat switching.
8. At 390px and 320px widths, editor fields, archive list and sticky save controls must remain accessible. Test portrait and landscape, keyboard open, safe-area insets, dialog focus/escape and reduced motion. Header gradient animation must stop under reduced-motion preference.

Known boundaries: images are device-local browser storage, not embedded into model prompts or server chat metadata. ID-only imports cannot recreate absent image bytes without Character Life's bridge. Model-generated NPC data depends on the model returning the documented valid patch. New module assets have versioned URLs; server/host caching of the entry script remains controlled by SillyTavern.
# v0.32.0 update and server-media acceptance

- Update from v0.31.0, then normal reload once (do not clear Safari data). Verify footer v0.32.0, list-first manager and Chat/Character picker.
- On a later version bump, update through SillyTavern and verify Apply update appears. An open draft must remain untouched until the user confirms the reload. After reload verify fresh runtime, base styles and NPC styles; no duplicate event listeners/UI.
- Temporarily disconnect the server during startup: visible loader error, no cache deletion and no stale-runtime fallback. Restore connection and normal reload.
- Upload JPEG/PNG/WebP from iPhone Photos, including a large photo and a transparent PNG. Inspect stored file <=256 KiB, long edge <=1024. Test an HTTP LAN URL (without crypto.subtle) as well as HTTPS. Pan/pinch, save, reopen and verify crop.
- Migrate legacy Chat and Character portraits with the backup button. Confirm successes and missing-image count. Switch chat during migration: no profile changes in the destination chat. Original local images remain available on failure.
- Using a disposable test profile/server backup only, clear browser website data **after successful migration**, sign back into the same server account and verify portraits plus framing return in both scopes. Never do this to the user's real cache for routine updates.
- Interrupt image upload: no false server reference is saved. Retry works. Copy a server-backed NPC to the other scope: same server path, independent profile/frame.
- Delete a portrait from one profile: another profile using that path retains its image. Moving to a different SillyTavern server requires copying server images too.


## v0.35.0 acceptance
- On iPhone Safari, open an NPC editor with a long status message. Scroll to both ends, expand all sections, focus a textarea to open the keyboard, and rotate the phone. Save/AI must remain below the status, outside the form scroller, with no fields covered. Save still submits; both actions disable during AI work.
- In each scope, cancel deletion and verify the dossier remains; then confirm. Reopen, reload, and swipe the current turn: the deleted dossier and social links must not return from saved snapshots. A distinct copy in the other scope stays intact. Inspect a second chat after deleting a shared NPC.
- Set Lore budget to 2,000,000 characters, save >60,000 characters across entries, reopen and switch cards. Verify budget isolation. Enable relevant mode, set Thai keywords and a pinned rule, and inspect the prompt on a matching/nonmatching message and NPC-generation request. Disabled/duplicate/over-budget entries should be omitted without extra model calls. This budget is not an exact token count.
- Send a simulated new-ID upsert for โคฮาคุ when Kohaku exists: one ID, unchanged canonical biography/stats/portrait, Thai alias added. Click Thai dialogue and confirm it opens that dossier. Explicit aliases support other translations; ambiguous or unsupported transliterations must not guess a match.
## v0.37.0 acceptance

- Back up the SillyTavern user data before upgrading. Start with a card that already has Character NPCs and Lore, then open its chat after installing v0.37.0. Confirm both archives appear, a new chat on the same card sees the same defaults, and another card sees neither. Check the card extension fields `tretaresia_rpg_npcs` and `tretaresia_rpg_lore` after migration; the corresponding large entries in global extension settings should disappear only after their server writes succeed.
- Simulate a rejected `/api/characters/merge-attributes` response while migrating, then reload. Original settings archives must still appear. Reconnect and retry; confirm that a new Character NPC or Lore edit is visible in a fresh chat and that a rejected Lore save keeps the draft on screen for retry. Export the updated card and verify the exported file carries NPC/Lore records (portraits still use server image paths).
- In Network tools, adjust a theme color/slider through many `input` events: preview updates during movement, and one settings save is requested after release. Complete an assistant turn with and without state changes, then swipe/regenerate: the extension should make one metadata save for each completed reconciliation or rollback, plus SillyTavern's own chat saves. When the server rejects `/api/settings/save` with 403, treat that as a separate session/CSRF problem; the extension cannot make the host accept it.

## v0.36.0 acceptance

- On a phone-sized chat, compare the Scene Tracker with the selected horizontal ledger mockup. It should sit above each new assistant reply, stay inside the chat column, open its details, and follow all light/dark Tretaresia UI presets and custom colors. Switch a message swipe: its location/weather should follow that variant and return when swiping back.
- Confirm an opening chat does not assert Central Crown as a visited scene before it is established in the story. Mark a journey Arrived, then move to another location; later state saves must not restore the old destination. The old saved map data must still load after upgrade even though the World Map tab is removed.
- In both NPC scopes, disable and re-enable a profile. Disabled records remain searchable but leave friendly social rosters. Try a translated spelling of a disabled existing name; it must not create or re-enable a copy. In Character scope, let a story change a dossier, inspect its current-chat differences, reset them, and confirm a fresh chat still uses the shared baseline.
- With Lore in relevant mode and no keywords, mention a distinctive fact from one entry: only that entry should be sent. Pin an essential entry and verify it is always selected within the configured budget. Confirm all-mode remains available and existing mode selections are preserved.
- Generate an NPC from text with a long chat: the request should use raw generation if the host exposes it. Adding a portrait must not send it until the image checkbox is selected. A 524 or invalid JSON must leave the draft untouched and show an actionable error. Drag color and range controls and confirm global settings save once when released.

## v0.38.0 Scene Tracker

- In a normal role-play chat, send a message that changes location and one that stays in the same room. Each answer should include a separate full scene card, while older cards retain their earlier place. Scene panel details should show calendar, season, lighting, participants and atmosphere.
- Force a reply without a sceneTracker payload. The extension should make one scene-only request, save the result with that reply, and make no extra request for a fully populated normal reply.
- If that request returns 524, the reply should still show the known facts and PARTIAL status, with no invented temperature. Switch chats while a request is pending and confirm that no result lands in the new chat.

## v0.41.0 — streaming and consent

- With streaming enabled, send a normal turn: Scene Tracker should show the previous scene while the new scene comment arrives. Narrative text should update continuously inside one card for adjacent narrative paragraphs.
- Trigger a named friendly NPC's Party and Guild invitations. Check cards arrive with the relevant event data, buttons remain disabled while generating, and become usable after completion. Accept one; decline the other. Reload and check status persists, no duplicate membership or fee, and the player is not Leader.
- A guild with 120 members should show 120 → 121, preserving unnamed members. Unknown total must not display 2 merely because only the inviter is named.
- Change swipe, regenerate, stop mid-comment, switch chat while generating: no previous chat's transient invitations or diary should leak; no gameplay changes from a partial preview.
- Compare the extension request counter before/after several normal replies, including missing scene data and explicit diary requests. It must not increase. Manual Sync and other explicitly requested AI actions may increase it.
- Update from v0.40.10, reload without clearing Safari, and check Settings, Character Forge, NPC portraits, world maps and CSS resolve from their new folders.

Browser automation requires a local Chromium installation. Node tests cover the actual host processing, preview guards, metadata parsing and state transitions; they do not substitute for a live SillyTavern/iOS check.
