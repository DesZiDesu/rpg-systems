# Host and iOS acceptance checks

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
