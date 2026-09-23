# Tretaresia RPG System

### v0.37.1 — Scene Tracker synchronization

- Same-reply `sceneTracker` location/environment facts now update canonical state; explicit state operations win. Scene-only patches are accepted, unknown values do not erase established facts, and non-atlas places can seed a scene.
- Scene panel and footer hide unconfirmed atlas bootstrap locations. The inline card uses canonical scene facts and avoids duplicate `Day 1` labels.
- Manual **Sync latest turn** reads up to 12 recent messages (6,000 characters per message), strips old patches, and refreshes the latest reply's scene card. Older context establishes scene continuity only. Changes while a sync request is running cause its result to be discarded.
- After updating and reloading, use **Sync latest turn** once for an existing chat whose location is missing. This is an explicit AI request; automatic tracking still uses the normal reply only. Unknown weather/temperature stay unknown until established. Earlier scene cards remain historical snapshots.

### v0.37.0 — Smaller settings saves

- Character NPC and Lore archives now live in the selected character card's extension fields. Existing archives are copied from global extension settings in the background. Each old archive remains readable until its card write succeeds; failed migrations leave the original intact. After confirmation, its old settings copy is removed. Archives now travel with exported character cards, which can increase their file size. Chat-specific NPC developments continue to live in chat metadata.
- A normal assistant turn now saves its checkpoint, scene, and reconciled state together at the end of processing instead of writing chat metadata at each intermediate step. Restoring a reply variant likewise saves the final state once.
- Theme sliders and colors update the preview while being adjusted and request one global settings save when the control is released. Character Lore save errors keep the editor and draft available for retry.
- These changes reduce the extension's contribution to settings requests; they cannot fix a rejected SillyTavern settings request caused by an expired session, CSRF error, unavailable server, or another extension. Update normally and reload; do not clear Safari website data.

### v0.36.0 — Scene Tracker, NPC baselines, and lighter generation

- The former **World Map** tab is replaced by the **Scene Tracker**. The chosen horizontal archive panel appears above each new AI reply, fits the width of a mobile chat, expands for details, and follows the configured Tretaresia accent, background, and text colors. Turn and swipe variants keep separate compact scene snapshots in chat metadata. The existing Scene tab still edits the location and clock. Old map data remains in saved chats so upgrading does not erase it.
- An arrived journey no longer reapplies its old destination on later saves. Before the opening location is confirmed, the default Central Crown coordinates are treated as internal placeholders, not established story canon. The tracker only displays confirmed location data.
- Both Chat and Character dossiers can be enabled or disabled. A Character dossier is the reusable default; changes during play are saved as chat-specific deltas. The dossier shows which fields differ in the current chat and offers **คืนข้อมูลแชทนี้เป็นค่าเริ่มต้น**. A new chat hydrates the original Character default. Disabled profiles remain stored, cannot be reactivated by an AI patch, and remain in the identity index to block translated-name duplicates.
- Lore's **เฉพาะที่เกี่ยวข้อง** mode now finds distinctive terms in titles and content even when the keyword box is empty. Manual aliases and pinned entries still work. Select this recommended mode in Lore Management to reduce prompt usage; the existing all-enabled setting is preserved for current users. The per-card budget is still adjustable up to 8,000,000 characters.
- Text-only NPC generation uses SillyTavern's raw generation API when available, with a short explicit story excerpt only for fill/attribute modes. Image reference is optional and is sent only when its checkbox is selected. Generation errors distinguish upstream HTTP 524 from malformed/truncated JSON and leave the draft intact. Color/range changes save on release instead of every input movement, reducing repeated global settings writes; other SillyTavern or provider save failures may still need separate diagnosis.
- Update the extension and reload to load v0.36.0. Existing chats, portraits, and Character archives are retained.

### v0.35.0 — Lore budgets and NPC management fixes

- **NPC Management → Lore Management → งบ Lore** accepts 1,000–8,000,000 **characters**, independently per card. The default remains 60,000 characters; this is not a model token limit. A 2,000,000-token model still needs space for instructions, history and output. The budget covers title/content, not JSON/prompt overhead. Existing lore is preserved.
- Choose **เฉพาะที่เกี่ยวข้อง** to send entries whose title or comma-separated keywords appear in the last eight messages or the current NPC request. **ให้ความสำคัญก่อนเสมอ** prioritizes essential entries within the budget. No extra AI calls are made. Disabled, duplicate-content and over-budget entries are omitted; whole entries are used, never cut mid-fact. This is keyword retrieval, not semantic search: use aliases/Thai keywords and pin essential world rules. The all-enabled mode remains the default.
- NPC editor Save/AI actions have their own bottom footer outside the scrolling form, including mobile safe-area spacing. **ลบตัวละคร** is available in the dossier for both Chat and Character, with scope-specific confirmation. Copies in the other scope, message history, correspondence and shared portrait files remain. Deleted IDs are unlinked from social rosters and current turn snapshots; a later story can introduce a character again.
- NPC patches and chat headers resolve stable IDs and aliases consistently. The model receives a compact complete name/alias index, even for NPCs outside the detail window. Fully vowel-marked Thai transliterations such as **โคฮาคุ / Kohaku** have a conservative unique-match fallback; arbitrary translations still need explicit aliases. An alias-based creation cannot rename/reset an existing dossier. Existing duplicate records are not automatically merged; inspect and delete unwanted copies in Management.
- Update the extension and reload normally to load v0.35.0. No browser-data clearing is required.

### v0.34.0 — Character Lore Management (original release)

Open **NPC Management → Lore Management** to create, edit, search, delete, or toggle lore entries. Each entry has a title and content. Enabled entries are included on every generation (no keyword trigger), in main chat, NPC generation/fill/attribute repair, and manual RPG sync. Disabled entries remain stored but are excluded from future prompts; toggling cannot remove facts already present in chat history.

Since v0.37.0, Lore is saved in the selected character card's extension fields and shared across its chats. Older extension-settings archives migrate automatically after the card accepts a write. Other cards and group chats do not receive it. Exported cards now include their Lore, so large archives increase exported file size. Existing lore starts empty; add your world's facts rather than loading invented canon.

Storage limits: 200 entries per card and 12,000 characters per entry. The active title/content budget now defaults to 60,000 characters and is configurable in v0.35.0. Over-limit saves report an error without replacing saved data. Lore drafts warn before closing/switching tabs; a card change prevents a stale save. The UI displays the active count and context size. Model context limits still apply.


A persistent, responsive SillyTavern RPG interface built specifically for the world of Tretaresia. It is a separate extension from Tensei System and can be installed alongside it without sharing settings, chat state, storage keys, prompts, or UI IDs.

**Current version: 0.37.1**

### v0.32.0 — Fresh-release loading and server-backed NPC portraits

- A stable `loader.js` checks the installed server manifest with `cache: no-store` and a unique request URL, then imports the versioned main runtime and styles. All release assets must have their version bumped together. No browser storage is cleared.
- SillyTavern's extension update hook offers **Apply update**. Save drafts and finish generation before accepting the reload; hot-importing a second runtime would duplicate listeners. On the first upgrade from an older release, use the host's Update action and reload the page normally once to activate the new loader. Already-running old JavaScript cannot upgrade itself retroactively. The NPC Management footer displays the running version.
- New, imported and copied NPC portraits are saved through SillyTavern's authenticated `/api/images/upload` endpoint in the current user's `user/images/tretaresia-npc` folder. Profiles contain a small same-server path, not image bytes. They survive Safari website-data deletion, provided the server files and chat/settings data remain intact. They are not publicly hosted and are not automatically portable to another server.
- Uploads are re-encoded (metadata removed), at most 1024 pixels on the long edge and **256 KiB per file**, WebP with JPEG fallback. Large images are downscaled further as needed. Content-addressed filenames reuse identical encoded bytes on HTTPS/localhost; plain-HTTP LAN connections use random filenames when Web Crypto hashing is unavailable. Copies reuse existing server references, and adjusting the crop alone does not upload another image. Original high-resolution source files are not stored on the server.
- For existing local images: open **NPC Management → สำรองภาพเก่าไปยังเซิร์ฟเวอร์** in each Chat and Character scope that contains portraits. Wait for the success count before deleting any browser data. Each old chat must be opened to migrate its records. Upload failures/missing images are reported; original local files are never deleted by migration. Images whose only local copy was already deleted cannot be recovered by this update.
- Back up the SillyTavern user data directory as well as chats/settings. Removing a portrait from a profile does not delete its server file (other profiles may share it). Music remains device-local; this migration concerns NPC portraits.

Automated coverage includes the existing scope and Safari-safe-mode regressions, server upload/path validation, size limits, empty browser storage, release URLs and loader behavior. Real iOS Safari acceptance is a separate manual check.

### v0.31.0 — List-first NPC Management and isolated scopes

- Management opens to a full-width **vertical list**, including an empty state when no NPC exists. Search covers names, aliases, roles and factions; pagination shows 20 records per page. Select a row to read its dossier, then choose **Edit**. Creation is an explicit separate action. Mobile no longer turns NPCs into horizontal tabs above an editor.
- The scope selector chooses **Chat** (this chat only) or **Character** (every chat using the same character card). Character ownership uses the card's avatar/filename, not its display name or array index. Group chats have Chat scope only because no single card is selected. Existing NPCs stay in their original Chat scope without automatic promotion.
- Since v0.37.0, Character libraries are persisted on the selected card and included when that card is exported. Legacy settings libraries are migrated after a confirmed card save, retaining the old settings data on failures. Identical display names do not share a library. Older portraits use separate Chat and Character browser keys; v0.32.0 adds server storage and migration.
- Both scopes are available to chat headers, model context and the existing Codex. A same-name Chat record wins **in that chat only**; it does not overwrite the Character record. The dossier offers **Create a copy in Character/Chat**, with confirmation, duplicate checks and portrait copying; the source remains unchanged.
- New AI-created NPCs use the chosen destination (Chat by default). If the Character archive cannot be saved, a new story NPC stays in Chat. Story changes to an existing Character NPC are stored as per-chat differences; they do not rewrite the shared card library or leak into another chat. Explicit edits in Character Management update the shared template. The Character dossier displays that template; live scene/relationship differences can be inspected in the current chat's Codex.
- Automatic new-chat continuity now excludes Chat NPCs and their linked social/contact references, including when restoring an older continuity cache. It keeps other player/world continuity features. An AI may still introduce an NPC mentioned in a new story/summary as a new Chat record.
- Imports go to the scope selected before opening the import dialog. All NPC fields, mobile portrait controls, AI assistance and Character Life JSON/ZIP import remain available. Each scope supports up to 200 records.

The scope regression suite covers card isolation, legacy Chat records, same-name precedence, per-chat AI overrides, portrait keys, continuity and swipe rollback. Browser/iPhone visual acceptance remains a separate manual check.

### v0.30.2 — Safari recovery URL

- Append `?tretaresia-safe=1` to the SillyTavern address to load the host without starting Tretaresia's UI, event handlers, prompts or generation interceptor.
- Safe mode does not clear Safari storage, NPC records, chat metadata, portraits or extension preferences. Remove the parameter to start Tretaresia normally.
- This provides a recovery path for opening Extension Manager and disabling, updating or reinstalling Tretaresia when its normal startup cannot complete.

### v0.30.1 — iOS settings-save hotfix

- NPC Management, Character Life import and AI profile assistance no longer persist diagnostic request counters through SillyTavern's global settings endpoint. This stops repeated **Settings could not be saved** notifications caused by those nonessential writes.
- The counter remains available for the current page session. NPC records, chat metadata, portraits and existing extension preferences are not cleared or migrated.
- All NPC module URLs are versioned at `v0.30.1`, so using **Update** in SillyTavern followed by a normal page reload is sufficient; deleting Safari website data is not required.

### v0.30.0 — NPC archive and engraved chat

- Open **NPC Management** from the NPC Codex tab or extension settings. Manual and AI-created NPCs use the same per-chat records; hostile characters are visible in Management but remain excluded from friendly/social rosters.
- Borderless gradient character headers, optional framed square portraits, character-colored parchment dialogue with quotation marks, and unboxed engraved-gold narration. Click a header to edit that character. New model replies use `<tr-narrative>` and `<tr-dialogue name="Exact Name">` blocks; existing untagged messages are left unchanged. Presentation/effects can be disabled separately in extension settings; reduced-motion preferences are respected.
- Edit identity, profile details, aliases, 12 role-icon presets, color, portrait size, attributes and abilities. Existing diary, knowledge, map and relationship systems are preserved. A local uploaded portrait takes priority over Character Life; removing it does not silently restore a linked image.
- Portrait editor: one-finger/mouse dragging, two-finger pinch zoom, keyboard arrows and accessible X/Y/zoom sliders. Images remain 1:1 in chat, and no empty frame is rendered. Framing from this editor is shared across desktop/mobile. Requires modern Safari with Pointer Events and native dialog support (iOS 15.4+); real-device Safari verification is still recommended.
- **AI เติมช่องว่าง** uses one explicit quiet generation to fill missing profile details from the form and recent main chat. It preserves supplied values and produces an editable draft, not an automatic save. Automatic NPC creation uses the normal reply's existing validated state patch; **Auto Track must be enabled**. There are no polling generations.
- Import Character Life JSON (single record, arrays, `npcs`, or backup libraries) and the uncompressed v3 backup ZIP. A selection screen skips existing names without overwriting them. Only shared fields are mapped; settings, custom CSS and unrelated profile fields are ignored. Embedded raster portraits and ZIP portrait files are supported; ID-only references can be resolved through an installed Character Life bridge when available. Missing/invalid images are reported rather than replaced with fabricated URLs. Limits: 200 NPCs, JSON 24 MB, archive 100 MB, portrait 16 MB / 40 MP.
- NPC modules and their stylesheet have versioned URLs so future version bumps refresh those assets after a normal reload. No cache/storage-clearing operation is performed. A host that keeps serving an old entry script still needs its own extension-update/reload flow.

Run the regression suite with `npm test` (Node 20+). `npm run check` checks production JavaScript syntax. See `tests/manual-qa.md` for host/iPhone checks.

- v0.29.3 adds a mobile-friendly Mana limit editor with Auto, forced Finite, and forced Infinite modes. Manual modes override story detection until the user changes the mode.

- v0.29.2 gives partially depleted Divine Mana a normal dark empty track, explains the exact missing Scene diagnostic field, and recognizes Limitless, Boundless, Unlimited, and Infinite Aura/Mana as roll-confirmed aliases of the same inexhaustible state.

- v0.29.1 imports structured player registration data from existing chat history, repairs stale Identity fields, recognizes Divine Mana from registration/proficiency/confirmed use, and renders its flowing rainbow bar immediately.

The tracking protocol uses a compact, relevance-prioritized state payload instead of repeatedly sending the entire archive. Settings show extension-started request attempts, and repeated Manual Sync taps are deduplicated.

## Core features

- One-normal-reply automatic tracking: the extension asks the active role-play model to append a hidden, validated state patch to its normal response. This adds no background generation and no extra API call.
- Optional Manual Sync using one quiet generation when a reply did not provide a patch.
- Per-chat character profile, portrait, independent desktop/mobile framing, HP, Aura/Mana, stamina, condition, race, profession, title, guild, party, level, power type, and Origin skill.
- Tretaresia power mastery for False Magic, True Magic, Aura, Formless Aura, Blood Aura, Sage Mana, Divine Mana, Constructs, and Divine Constructs.
- Extensible custom powers, combat disciplines, acquired skills, and techniques with proficiency and semantic icon presets.
- Tretaresia adventurer ranks: Rookie, Basic, Intermediate, Ember, and individually named Custom Rank.
- Mission, quest, contract, and dungeon records supporting every grade from E- through SS. New tasks are captured as soon as the story offers, assigns, or confirms receipt of them, then updated through accepted, active, progress, completion, failure, or hold states.
- Five responsive quest archives: Story, Side-Story, Active Mission, Completed Mission, and Failed Mission. Completed missions are locked to 100% and their rewards are claim-once records.
- Long-distance journey tracking with origin, destination, road/caravan/sea/off-road route, estimated duration, remaining days, delays, and arrival state. Selecting a destination begins a journey instead of teleporting the scene.
- Region-aware currency ledger with clearly labeled Gold, Silver, and Copper balances plus a reasoned transaction history for every tracked gain, expense, and manual adjustment.
- Scene tracker with time, day, continent, region, exact place, position, weather, extreme temperatures, and AI-assisted multi-floor local maps.
- The atlas contains two timeline geographies: **Present World / Present Era** has 126 destinations. **Alternate Present World TRETARESIA / Alternate Present Era** preserves all 126 of those named places—including Central Crown, Sunscar Port, the Great Academy, and every other original destination—remapped onto the expanded land, then adds **180 Alternate-exclusive destinations**. The Alternate atlas therefore contains **306 destinations total**, with 51 in each of its six major regions. The alternate floating castle is named **Chaos Breaker**, domain of Dragon King Kaliasna Oryu.
- Four world-map artworks are available: Present World day/night and Alternate Present World day/night. Day/night changes automatically from the Scene clock; each world's two lighting variants share that world's location data and coordinates without leaking destinations into the other geography.
- The two map buttons are safe atlas-browsing controls and do not teleport the character. During roleplay, the active map changes only after an explicit, completed world crossing (for example entering an established portal, rift, dimensional gate, or teleport passage). The normal reply then writes `world.id` and the confirmed destination into the same hidden patch; returning explicitly switches it back to Present World.
- **NPC Atlas Knowledge** injects only the active world's canonical destination catalog into the normal roleplay prompt: 126 Present destinations or 306 Alternate destinations, never both. It is geographic canon rather than universal personal knowledge, so individual NPC awareness still respects origin, occupation, travel, education, discoveries, and confirmed inter-world experience.
- Map discoveries are stored independently under each `world.id`. Switching timelines swaps the active discovery list, map markers, destination knowledge and travel catalog without carrying Alternate-exclusive names into Present World.
- iOS-friendly Canvas tile rendering: four WebP detail levels load only the visible 512 px tiles and visible place labels while zooming or panning, avoiding one enormous SVG scene.
- Broad action-based EXP tracking for studying, learning, training, crafting practice, combat, kills, discoveries, quests, and other genuine growth; level rollover happens when EXP is exactly equal to or greater than the current requirement.
- Main-chat system notifications for EXP, learning, training, combat, kills, level-ups, mission/quest receipt and status changes, and money changes. Every tracked currency notification identifies why money was gained or spent, with configurable event types and auto-dismiss time.
- Inventory lifecycle tracking follows pickups, purchases, crafting, consumption, drops, gifts, and sales from the normal role-play reply—including acquire-and-consume actions in one turn.
- Editable Journey Logs automatically capture significant story milestones in concise entries of up to 500 characters; entries can also be added, edited, or deleted manually.
- Inventory, quests, NPC Codex, relationship meters, abilities, revealed stats, private diary entries, contacts, physical letters, and local-device music playlists.
- Friendly-only NPC Codex plus per-chat Party, paid Guild, and Household rosters. Parties are free; creating a Guild costs 10 Gold; Household members can be assigned roles such as partner, spouse, child, parent, sibling, or guardian.
- Automatic social roster updates from confirmed role-play outcomes, including joins, departures, invitations, dissolutions, and family changes without requiring UI buttons.
- Character Life compatibility: exact NPC links reuse Character Life portraits and framing, NPC dossier fields synchronize safely in both extensions, Character Life skills appear in RPG skill views, and RPG-tracked skills sync back to Skill Storage without an extra model request.
- English and Thai interface/action support, hidden/visible/draft action delivery, mobile safe-area layout, touch controls, and configurable appearance.
- Automatic same-character continuity when starting a new chat, including same-device copying for locally stored NPC portraits and music.
- Direct compatibility with `nutho-start-new-chat-with-summary`: RPG state is captured before its summary/new-chat flow, restored after `CHAT_CHANGED`, and kept separate from the carried memory summary.
- Portable JSON state export/import from the interface header. Player state and the embedded player portrait travel with the file; server-backed NPC paths work on the same server. Copy server image files separately when moving servers.

## Tretaresia-aware behavior

The injected rules preserve the setting's power-sensing restrictions, the rarity and secrecy of Formless Aura and Divine Mana, the difference between False and True Magic, vampire power mutation, Sage Mana, Constructs, regional currencies, the full dungeon scale, enormous travel distances, and the six-continent geography. The tracker records only outcomes supported by the story and will not reveal a hidden power merely because an observer is nearby.

## API and privacy

Tretaresia RPG uses SillyTavern's active provider and selected model. It never requests or stores a separate API key. Automatic tracking shares the normal character response, so there is no second quota-consuming request. NPC portraits are stored on your SillyTavern server from v0.32.0; older local images need migration. Music remains device-local. Image bytes are excluded from prompts.

## Install

1. Open **Extensions** in SillyTavern.
2. Select **Install extension**.
3. Paste `https://github.com/DesZiDesu/rpg-systems`.
4. Reload SillyTavern if prompted.

Open it through **Extensions → Tretaresia RPG** or the wand menu.

## Version 0.29.0

- Added a per-turn State Inspector with before/after values, source, confidence, turn rollback, variant reapply, and a one-tap extension health repair.
- Added persistent injuries and status effects, turn-based damage/stamina costs, treatment, and full combat damage breakdown logs.
- Added player-versus-NPC combat comparison with unknown-stat protection, plus NPC-specific knowledge records that obey the epistemic firewall.
- Expanded Aura/Mana into output, control, efficiency, recovery, color, Divine rainbow presentation, and Boundless/Infinite behavior.
- Expanded Party formation, roles, and shared funds; expanded Guild level, reputation, headquarters, alliances, enemies, treasury, and guild quests.
- Added land-safe travel checkpoints, visible atlas route lines, regional weather memory, and synchronized journey progress across Scene and World Map.

## Version 0.13.1

- Fixed normal-reply patch recovery so scene, NPC, quest, clock, map, and other confirmed updates accept paired, bracketed, fenced, truncated, and object-operation payload variants.
- Direct travel actions in the user's main-chat role-play begin known-atlas journeys without an extra model request. Active journeys also read elapsed time, percentages, movement, delays, resumptions and arrival from user messages, with a one-percent-per-role-turn fallback and a bounded history catch-up so old journeys cannot remain frozen indefinitely.
- Scene cards always show the exact world coordinates; protocol cleanup now also covers the active swipe and `extra.display_text`.

## Version 0.13.0

- Added an explicit pre-capture hook for both SillyTavern's native New Chat button and the Nutho Start New Chat With Summary wand item.
- Restored RPG metadata remains independent from Nutho's summary backup and delayed memory write.
- Added local continuity lifecycle events/API so Character Life and other compatible extensions can coordinate without additional AI requests.

## Version 0.12.0

- Rebuilt the Quest Log into Story, Side-Story, Active Mission, Completed Mission, and Failed Mission sections.
- Completed missions always normalize to 100% progress and automatically open the Completed Mission archive when they finish.
- Added terminal-state protection so completed/failed records cannot be accidentally reactivated or have progress reset by a later partial patch.
- Added claim-once quest reward metadata and parser guards to prevent completed mission currency, EXP, item, rank, or loot rewards from being granted repeatedly.
- Active prompt state now excludes completed/failed mission details and sends a compact reward-claimed archive instead.

## Version 0.11.0

- Party and Guild leaders now display the active SillyTavern persona name instead of the RPG profile fallback, and leader badges respect the stored leader ID.
- Household now identifies the active persona as the household head.
- Confirmed role-play joins, departures, invitations, dissolutions, and family-role changes automatically update Party, Guild, and Household data; a missing friendly NPC can be created and joined in one patch.
- Character Life NPC records link by stable ID/scope or exact name/alias, reuse Character Life portraits and framing, and surface linked Skill Storage entries in RPG views.
- RPG user skills and NPC abilities sync into Character Life Skill Storage through its local extension API with no additional AI generation.

## Version 0.10.0

- Continuous journeys now store origin/destination coordinates and move the player marker according to elapsed world time and remaining travel days.
- Scene and World Map location stay synchronized while traveling and snap to the destination only after confirmed arrival.
- Friendly NPC dossiers now include a living-world mode, current activity, map coordinates, and an individual World Map visibility toggle.
- The World Map keeps lightweight tappable NPC positions and the player position; Party members follow the player unless separated by the story, and all NPC markers have a master visibility control.
- The zero-extra-call tracking prompt advances plausible off-screen NPC routines when world time changes while respecting occupation, distance, duties, danger, relationships, and paused/story-only modes.

## Version 0.9.1

- Compact full-feature tracking protocol and relevance-prioritized state payload.
- Extension-started request counter and duplicate Manual Sync protection.

## Version 0.9.0

Adds the social systems layer: friendly NPC filtering, Party create/invite/dissolve, Guild create/invite/dissolve with a 10 Gold creation fee, three-denomination currency display, and a Household family roster. Hostile NPCs remain story encounters but are excluded from the visible NPC Codex and social invitation lists.

## Version 0.8.0

Each of the four 4:3 atlases uses its own tile pyramid and retains its full canonical destination catalog for AI knowledge, quests, NPC movement and travel. The visual canvas intentionally draws only continent names plus player and enabled NPC positions; it no longer builds or paints hundreds of destination markers, labels, pin controls or travel-option nodes. During pan and pinch the current frame moves through a GPU compositor at the display refresh rate, tile loading and canvas redraw pause, and one sharp frame is rendered after release. Mobile defaults to DPR 1, two concurrent tile decodes, an eight-tile active-context cache and z2 maximum detail; z3 HD tiles are opt-in in extension settings. Switching world or day/night context immediately releases the inactive tile context.

The control center is mounted outside the transformed application panel so its settings dialog displays reliably on iOS Safari instead of being clipped behind the interface.

## License

MIT

### 0.33.0 — Portrait-aware NPC generation and reliable archives

- Upload a portrait, optionally describe your NPC, then **Generate NPC from description**. The prepared image is attached through SillyTavern's `quietImage` API to describe visible appearance. Requires Chat Completion, a vision-capable model, and Image inlining. Unsupported configurations stop with an explanation; no silent text-only fallback. Uploading alone does not contact AI. Portrait bytes are not added to settings or chat metadata.
- **เก็บ NPC ใหม่จากเนื้อเรื่องใน** chooses Chat or Characters for newly generated story NPCs. Characters is the existing per-card NPC archive, not a new SillyTavern character card. It persists across chats of that card; group chats use Chat. Existing records are not moved. Shared records' later story changes remain per-chat overrides. A full Character archive falls back to Chat with a warning.
- New manual drafts also have a destination selector. Scope lists show record counts. Known header clicks resolve the actual record by ID before name/aliases. An old unsaved header opens a named recovery draft instead of an unrelated empty list.
- With Auto tracking enabled, completed tagged dialogue registers missing named speakers when the AI omitted its NPC patch. It adds a provisional record without inventing biography or making an extra AI request. Player/narrator names and records deliberately removed that turn are excluded. Names appearing only in unstructured prose cannot be reliably recovered this way.
- Prompts request complete starting stats and relationship values. Missing values receive provisional baseline attributes (level 1, HP/stamina 100, MP 30, core stats 10, trust 10; other relationship meters 0), not inferred canon. Explicit zero remains valid and is displayed as zero. Existing zero-valued records are not silently rewritten.
- To repair an existing record, open **Edit → ATTRIBUTES → AI จัดค่าสถานะและความสัมพันธ์ใหม่**, review the proposal, then Save. This only replaces numeric attributes/rank in the draft, preserves other fields and portraits, and rejects incomplete/all-zero AI responses atomically. It is a deliberate per-NPC action, not an automatic bulk rewrite of old records.
- Versioned imports/CSS now include the scope and generation helpers. Update the extension and reload normally; no cache deletion is required by the update mechanism.
- Validation: Node regressions cover image transport/capability errors, scope routing, archive reload, missing speaker registration, numeric defaults, intentional zeros and existing behavior. The optional browser fixture also covers image-only generation, scope selection, record listing and attribute repair. It uses a mocked AI, not a live provider; real iOS Safari and provider image interpretation still require on-device verification.

### 0.32.1 — NPC creation and mobile workspace

- **Tretaresia NPC Manager** is available directly in the wand menu and follows the existing **Show launcher** setting.
- In **Create NPC**, describe the character and select **Generate NPC from description**. The connected SillyTavern AI fills the textual profile, aliases, abilities, relationship values, stats, hostility, color, role icon, and portrait size. Uploaded portrait images and framing are retained; this is not an image generator. Review the draft and press Save to persist it. Generating over an existing or edited profile asks before replacing its fields.
- Incomplete AI replies leave the current draft intact. Closing the manager or changing chats discards late AI results. The existing **AI fill empty fields** action remains available.
- Mobile dialog sizing follows the visual viewport, includes safe-area padding within its height, and removes the empty footer strip. Text controls use 16px text to avoid iOS focus zoom.
- Run `npm test` and `npm run check`. Optional rendered UI check: install Playwright/Chromium and run `node tests/npc-workspace.browser.mjs`. This simulated mobile check does not replace on-device iOS Safari verification.

### 0.32.2 — Consecutive dialogue headers

NPC dialogue now displays one header for the current speaker within each assistant message. Further dialogue from that speaker keeps its text and colors without repeating the header or portrait, even when narrative or plain prose intervenes. Switching A → B → A shows all three headers. Known aliases resolve to the same profile. An immediately preceding structured assistant message can continue the same speaker without a header. User/system turns and unstructured messages reset the sequence. Streaming/swipe rerenders recalculate the sequence, including changes to the previous speaker.
