# ROLEFORGE — v0.46.3

## v0.46.3 — Reliable summary scheduling and mobile module menus

- Memory Summaries checks SillyTavern's actual generation state instead of relying on a Start event that can stay set after a dry run or an interrupted command. A real story reply queues the summary; it starts automatically when the reply finishes, with no summary API timeout or summary request while waiting.
- **Main chat: current SillyTavern API and model** uses SillyTavern's native raw generation request, the same API and model as the story. A **Connection Manager** profile remains optional. Summaries are separate requests and do not add story messages. Requests target shorter output, use up to eight cited events, and request at most **2,400 output tokens**. New installations default to **five messages per batch**; saved preferences and completed chapters remain intact.
- A stalled summary tokenizer falls back after **two seconds**. Each validated batch is saved before the next request. If final memory-prompt preparation fails, the completed summaries stay saved and the UI shows a warning; that memory prompt is cleared until it can be rebuilt within its budget. Provider/API failures still stop at the saved checkpoint without a paid automatic retry.
- **Quick menu** opens without automatically focusing Search or opening the mobile keyboard. Its list scrolls within the available space, including **System Audit**, without the RoleForge footer covering the last items.

อ่าน [คู่มือ Memory Summaries](docs/memory-summaries-workflows.th.md) และ [วิธีเลือกรูปแบบหมวด](docs/navigation-options-preview.th.md)

## v0.46.2 — Faster module navigation and visible summary progress

- **Extension Settings → RoleForge → General & continuity → Module navigation** selects **Classic carousel**, **Quick menu** or **Module grid**. The original carousel remains the default. The menu groups and searches all modules; the grid opens a module directly with RoleForge's dark surfaces and gold SVG icons. The layout selector stays in extension settings to keep the RPG window clear. The saved preference applies across reloads without changing RPG records.
- Memory Summaries shows its current step, saved batches and elapsed time beside the **main-chat composer**, including while the RPG window is closed. Its own square Stop button cancels summary work and restores Send when finished; SillyTavern's story Stop keeps control of a story reply. Completed chapters and the unsent message draft remain intact.
- Summary API requests allow **240 seconds** by default, configurable from **60–600 seconds**. Errors distinguish API timeouts, request failures, token-counting problems and waiting for the story reply. A stalled summary tokenizer falls back to a conservative estimate; memory injected into story prompts still requires token counting within its budget.
- Every validated summary batch is saved before the next request. After an API timeout, **Retry / continue** uses smaller batches for the remaining sources and keeps the saved batch-size preference. RoleForge does not automatically make another paid request after a failure. Providers may still process and charge for a request already sent even after cancellation or timeout.

อ่าน [วิธีเลือกรูปแบบหมวดและดูสถานะสรุปใน Main Chat](docs/navigation-options-preview.th.md) และ [คู่มือ Memory Summaries](docs/memory-summaries-workflows.th.md)

## v0.46.1 — Saved summary batches and compact extension settings

- Memory Summaries processes a backlog in sequential batches of **10 original messages** by default. Choose **5, 10, 20 or 50**, or set **1–100 messages per batch**. Input budgets can make a request smaller; a very long message can span multiple requests. The automatic-summary interval remains a separate setting.
- Each validated batch is saved before the next request. Progress shows pending original messages, the current batch, completed saves and elapsed time. Cancel, API failure or reload retains completed chapters; **Retry / continue** processes the remaining sources. Summary preparation also uses these batches across explicitly linked history.
- Added bounded waits for summary stages and clearer errors instead of leaving token counting or requests indefinitely pending. Summarization still uses the configured separate API/profile and consumes that provider's tokens.
- Simplified the extension drawer to match SillyTavern settings. Fixed native `menu_button` minimum-content sizing that squeezed Open / Sync labels into vertical columns on mobile. Existing controls and collapsible groups remain available.

อ่าน [วิธีตั้งจำนวนข้อความต่อชุดและทำต่อเมื่อสรุปหยุด](docs/memory-summaries-workflows.th.md)

## v0.46.0 — NPC Alternate Information and organized settings

- One NPC can keep its original dossier and up to **20 alternate versions**, such as childhood, adulthood or a later chapter. Each version has its own profile fields, stats, abilities, relationship values, portrait and presentation style. Stable identity, encounter/hostile status, contacts, group links, diary and knowledge remain shared.
- **NPC Management → a character → Alternate Information** adds, edits, selects and removes versions. Selection is manual, saves immediately and updates NPC/chat presentation and the next model context. Draft edits save only when confirmed. Inactive biographies are kept in storage; prompts use current fields plus short version labels. Selecting a version does not rewind the chat or change scene time.
- Story patches and optional progression updates target the selected version without replacing the original or switching versions. Character-scoped updates merge per version and per field, so unrelated archive edits still reach other chats. Image backups, scope copies and continuity include alternate images. JSON export retains same-server image references, without embedding image bytes.
- Reorganized **Extension Settings → RoleForge** with Open / Sync at the top, separate General, Tracking, Chat/NPC, Optional Systems and Notifications groups, and collapsible appearance, presets, writing and diagnostics. Existing preferences and controls are retained, with layouts for mobile and narrow desktop drawers.
- Preserved the original Header / Dialogue / Narrative default, optional native regex preservation and native Edit/save/cancel protections.

อ่าน [วิธีใช้ Alternate Information และ Drawer ใหม่แบบเป็นขั้นตอน](docs/npc-alternate-information.th.md)

## v0.45.6 — Original story presentation by default

- Restored the original source-based **Header / Dialogue / Narrative** behavior for replies with RoleForge tags. Extra host wrappers, attributes, or display regex rewrites no longer silently suppress all three blocks by default.
- **Extension Settings → RoleForge**, beside NPC Management, adds **Preserve regex / HTML formatting (optional)**. It defaults OFF. Enable it to give native regex/HTML rendering priority for structured replies; unstructured messages keep their native DOM in both modes. The presentation switch still controls the format independently.
- A status line shows the loaded module version, selected presentation mode and whether the latest character reply has readable presentation blocks. No private story text is shown. Untagged saved replies stay plain; update/reload cannot add missing speaker/block tags. Generate a new reply or regenerate when structure was not emitted.
- Kept native Edit/save/cancel/autosave protection and source-aware restoration. An external formatter wrapping an existing story now settles without repeated remounting or duplicate headers.

อ่าน [การเลือกโหมดแสดงผลและวิธีตรวจข้อความเดิม](docs/optional-systems-and-regex.th.md)

## v0.45.5 — Restore Header / Dialogue / Narrative with regex

- Enabled display regex no longer disables RoleForge's story instructions or all structured story rendering. **Header / Dialogue / Narrative** remains controlled by its own switch. An unrelated or no-op regex can coexist with unchanged RoleForge story blocks.
- Presentation checks each message's actual native content. Custom HTML/widgets, transformed display text, bound actions and native message editing stay protected; ordinary protocol text can use RoleForge's character headers and narration/dialogue boxes.
- Existing replies with RoleForge tags can render again after reload. Replies generated without those tags during the regression remain plain; continue with a new reply or regenerate the affected reply to request structure again. The extension does not guess speakers or rewrite saved prose.

อ่าน [คู่มือการใช้ร่วมกับ regex และการตรวจข้อความเดิม](docs/optional-systems-and-regex.th.md)

## v0.45.4 — Native message editing

- Chat Presentation now recognizes SillyTavern's actual `#curEditTextarea.edit_textarea` editor and stops decorating a message while it is being edited. Native textarea identity, draft text, focus, cursor and save/cancel/autosave remain owned by the host; scene, mission and auction cards return after editing ends.
- RoleForge instructions explicitly keep bookkeeping in its marked JSON patch. Bare `SET clock.time`, `SET npc...` or `sex_stage` lines are not RoleForge's protocol and are preserved rather than interpreted or deleted. Their origin requires the source card/preset/regex; existing foreign command text is not automatically removed.

อ่าน [การแก้ข้อความและขอบเขตการแก้คำสั่งที่หลุด ภาษาไทย](docs/message-editing-and-protocol.th.md)

## v0.45.3 — Optional systems and native chat compatibility

- The Auction House uses a detailed wooden gavel with rounded striking faces, collars, a turned handle and a separate sound block, keeping the existing gold and dark aesthetic.
- **Extension Settings → RoleForge → Optional systems**, or **Control center → Optional systems**, provides six independent switches: Mission Board, Auctions, Story Memory, Appointments & Deadlines, Quest Objective Checklists and Memory Summaries. Missing preferences default to **OFF**; explicitly saved preferences remain unchanged. Turning a system off preserves its records and removes its cards, AI instructions and context. Memory Summaries also stops archive writes and summary API requests. Existing auction commitments can still be settled or left through the Wallet without reopening bidding.
- Event notifications default to OFF for new users; saved notification preferences and individual category switches remain available.
- Main-chat cards now decorate SillyTavern's rendered message instead of rebuilding it from raw text. Display regex output, custom HTML, tables, form state and handlers survive scene/board/auction updates. Enabled assistant display regex disables RoleForge story restyling instructions; native message edits and asynchronous renders remain authoritative. Covered global, character and preset regex behavior; other add-ons that replace the message DOM may still require a specific compatibility check.

อ่าน [คู่มือสวิตช์ระบบเสริมและการใช้ร่วมกับ regex ภาษาไทย](docs/optional-systems-and-regex.th.md)

## v0.45.2 — Auction House

- A confirmed arrival at an auction venue opens an **Auction House card in the main chat**, styled with RoleForge's dark surfaces, gold frames and existing UI fonts. Preview the catalog and revealed item details before joining; entry fee and refundable deposit are shown first. The normal story reply creates 1–8 lots and present rivals. No extra API request is made by auction buttons.
- Local rules own **joining, minimum/custom bids, fixed rival ceilings, three auctioneer counts, winners, payment and Inventory delivery**. Rounds advance only by player actions. Leading bids and deposits reserve funds; outbids release the leading commitment. Wallet edits, AI spending and guild founding cannot consume reserved funds. Currency changes wait until the event is finished or left.
- Won items and entry fees have permanent event/lot receipts. Closed lots cannot settle again; AI auction payout/item operations are rejected. Successful results emit auction, wallet and Inventory notifications. Failed saves restore currency, items, receipts and the reply checkpoint, with an inline retry message. Unrelated metadata saves wait until the auction commit finishes.
- Active sessions survive reload and state export/continuity. **Ranks & Progression → Auctions** resumes an event when its original chat card is unavailable. Returning to the actual venue is required for new bids; existing commitments can still be resolved. Leaving while leading is blocked. The catalog/history and completed results remain readable.

อ่าน [คู่มือระบบประมูลและ workflow ภาษาไทย](docs/auction-workflows.th.md)

## v0.45.1 — Mission Board and growth notifications

- A confirmed visit to a mission/quest board now produces **1–4 paper cards in the main chat** from the normal reply's structured patch. Click a paper to read the description, issuer, objective checklist, difficulty, reward and stated deadline. **Back** returns to the papers; **Accept mission** saves one Active mission locally, with no immediate reward or extra API request. The canonical quest enters the next generation's context.
- Board offers are scoped to the source chat and reply variant. Reading does not accept a mission. Duplicate acceptance, old controls, a superseded board, being at another location and acceptance during generation are blocked. Reload preserves the board; swipe rollback follows its source variant. Save failure restores the unaccepted state for retry.
- Main-chat notifications now separate **new skills**, **training/skill progress**, **purchases** and **items received/removed**. Diffs use saved quantities and proficiency increases, including SET/upsert updates and actual capped gains. An unchanged skill refresh produces no learned notification. Custom power rank progression is supported; replenishing resources is not training. Multiple events queue in groups of up to four, so busy turns do not discard later inventory events. Each category can be disabled in extension settings.
- Verified existing behavior: AI can update an enabled, manually created NPC from friendly to **Hostile** and back via its stable ID. The dossier remains in NPC Management; hostile characters are excluded from friendly rosters. No change to the hostility system was needed.

อ่าน [คู่มือ Mission Board, notifications และ NPC Hostile ภาษาไทย](docs/mission-board-workflows.th.md)

## v0.45.0 — Memory Summaries and new-chat history

- **Memory Summaries** archives loaded user/character messages in browser IndexedDB, including captured replaced/deleted versions. Separate API requests create cited chapter summaries, a continuity recap and searchable people/place/event entries. Original text remains searchable when a minor encounter was omitted from the event index.
- Choose the current SillyTavern API or a **Connection Manager** profile for summarization. Automatic mode defaults to one batch after 15 pending character replies; manual summarization processes the current backlog, and **Prepare for a new chat** completes linked ancestor backlogs too.
- Persistent job status and notifications report waiting, summarizing, validating, saving, success, partial coverage, failure, cancellation and interrupted reloads. Failed requests retain prior chapters and expose retry. Summary requests and prompt token counts are visible; budgets are configurable.
- Continuity carries the exact RPG state and an archive ancestry link. Before each normal generation, relevant history is selected within overview/retrieval token budgets. Historical memory never executes state patches or grants rewards. NPC knowledge remains limited to established witnessed/told facts. Alternative branches are excluded unless explicitly linked.
- Edited/swiped/deleted sources invalidate their summaries and dependent recaps; delayed results cannot cross chats. Summary edits retain up to 20 earlier revisions. Export the **full memory archive** separately from RPG state to back up originals or move devices; IndexedDB does not sync across browsers automatically.
- Update and reload once. Real-model summary quality and billing depend on the selected API; matching source quotes validate provenance, not every semantic interpretation.

อ่าน [คู่มือ Memory Summaries ภาษาไทย พร้อม workflow การย้ายแชต การค้นสถานที่ และ notifications](docs/memory-summaries-workflows.th.md)

## v0.44.9 — Story memory, quest steps and narrative deadlines

- **Story Memory** keeps confirmed facts, promises, secrets and unresolved threads per chat. Edit, pin, resolve, archive or reopen records. Normal prompts select relevant memories and active pinned records within a bounded context; resolved and archived records are past outcomes. A saved secret does not grant NPC knowledge.
- **Quests** now include required and optional objective checklists. Progress derives from completed required steps; skipped required steps remain unsatisfied. Reaching 100% makes a quest ready for confirmation, without completing it or paying automatically. Confirming completion through the UI grants no reward; confirmed story rewards still use the once-only payment receipt.
- **Appointments & Deadlines** use the current story day and `HH:mm` clock. Upcoming, today, due, overdue and unspecified times update with the narrative clock. Vague timing stays as written until clarified. Reaching a deadline never automatically fails a quest, spends money or completes a meeting.
- Normal tracking uses the main reply without extra AI requests. Add/edit forms save locally. **Manual Sync** explicitly checks a selected chat range and preserves newer story records and player corrections when auditing older replies.
- All three belong to the existing RPG state, including reload, Export/Import, Continuity and turn/swipe history. Existing chats need no reset or automatic guessed backfill. Update the extension and reload once.

อ่าน [คู่มือภาษาไทยแบบทีละขั้น พร้อมตัวอย่างการใช้ทั้งสามระบบร่วมกัน](docs/story-systems-workflows.th.md)

## v0.44.8 — Quest payment receipts and story locations

- Quest rewards now keep a payment receipt independent of reward wording, amount and the visible quest archive. A paid quest cannot pay again through a later reply, balance replacement, Manual Sync or deleting/recreating its archive entry. Distinct reward components can be granted together in the first payment; completion without payment can receive its first reward later. Each quest payment must identify one known quest.
- Removed the bundled World Map, atlas assets, coordinate tracking, NPC map markers and geography reference injected into AI prompts. **Central Crown** came from the old atlas's default starting city. New locations follow the story; region and continent are optional. Local room layouts remain available.
- Saved atlas locations, travel geography and scene history migrate locally: repeated breadcrumbs and the old default Central Crown/Crown Heartlands/Central Continent are cleared while actual place names, character data, room layouts and balances are retained. Confirmed geography entered after migration stays usable.
- Existing balances are not recalculated or reduced: old transaction descriptions alone cannot prove which money was duplicated. Update the extension and reload SillyTavern once; no saved-data reset is needed.

## v0.44.7 — Safer H-Stats and existing group recovery

- Open **H-Stats → Directory layout** to try **Name tabs** (recommended for quick switching), **Portrait cards** (choose by picture), or **Compact selector** (save space with many characters). The preference is remembered across reloads and applies to each chat's own roster. Existing NPCs, H-Stats and portraits are preserved.
- Character selection has no remove button. Open **Manage directory**, choose **Hide** beside a name, then confirm the named character. Cancel leaves the roster intact. **Undo hide** restores the previous order and selection; hidden characters can also be added back through the picker. Hiding changes the current chat's directory only and keeps every NPC record and H-Stats value. Pending confirmation and Undo reset when switching chats.
- The directory remains usable while an initial H-Stats profile is loading. Controls have at least 44px touch targets and support Thai/English UI preferences.
- Party/Guild tracking now recognizes explicit existing membership in common Thai/English narration and player statements even when the AI omits group operations or the extra membership flags. Normal turns and Manual Sync share the same validation. NPC leadership and the player's membership role are retained; recovering an existing guild does not charge a founding fee. Invitations remain offers to accept or decline.
- Opening or switching to an existing chat locally checks up to 300 recent messages for missing group membership, after the player has replied. It also reads an opening message inside that range. Later departures, explicit deletion, saved removal audits and turn records prevent restoring groups the player already left. The recovery is saved per chat and makes no extra AI request. Statements outside this range or unclear membership descriptions are not guessed.
- Try the production-based demo in [docs/previews/preview-h-stats.html](docs/previews/preview-h-stats.html) using a local static server (for example, `python3 -m http.server 8000` in the repository root). Open `http://localhost:8000/docs/previews/preview-h-stats.html`. The demo uses sample characters; changing its directory does not affect a SillyTavern chat.

## v0.44.6 — Established groups and selected H-Stats NPCs

- If the current story or player role-play already establishes membership in a party or guild, the tracker records it immediately with the stated leader, role, and known membership details. A new invitation still shows Accept/Decline and does not join automatically. Joining an existing guild does not charge the founding fee.
- H-Stats starts with an empty NPC roster. Add a met NPC from its picker or the NPC Management H-Stats action, then remove it from the roster when desired. Existing chat-specific selections stay visible; other met NPCs remain available to add without displaying their dossiers automatically.

## v0.44.5 — Character Forge presets

In **Extensions → RoleForge → Character Forge Presets**, choose **Original Preset** to keep the Tretaresia Origin, social standings, skill categories, mastery names and Path ranks, or choose **Custom** to define each list for another character card. Each custom list starts empty. Enter one choice per line, then save. Original can be exported as editable JSON and imported again. Presets belong to the character card; existing chat profiles stay intact.

The character form now lets you type an Origin location, skill category and mastery name directly, including names absent from the configured lists. Birthplace is saved separately from the current scene. Custom Path ranks keep their names in the RPG progression display and prompt. Switching back to Original restores the bundled choices without deleting the custom definitions.

## v0.44.4 — Selective NSFW Enhance prompts

NSFW Enhance now defaults to **Auto** when enabled. Auto checks the four most recent chat messages locally and leaves the saved adult writing style and tags out of ordinary turns. During a relevant scene it selects sections from Markdown headings, using the section title or an explicit `[section:core]`, `[section:romance]`, `[section:voice]`, or `[section:intense]` label. Unsectioned custom prompts remain intact and are sent only while a relevant scene is detected. **Always** restores the previous behavior of sending the entire saved style and all selected tags on every active turn. The settings preview shows the exact prompt and how many sections and tags Auto selected. No extra AI call is made; the separate story-language instruction still follows its own setting. Recent-chat matching can miss subtle scene transitions, so choose Always when you want to force the complete prompt.

## v0.44.3 — Flexible character turns

A character may open the scene with a header before narration or speech, or the scene may begin with narration before the first header. Each uninterrupted character turn can include multiple separate narration and dialogue boxes under one header. A different speaker gets a new header. Existing dialogue-only replies remain compatible.

## v0.44.2 — Consistent interface language

English/Thai interface preferences now cover the settings drawer, character creation, RPG labels, power editor, NPC/Lore management, invitations, help and status messages. Switching UI language does not select the story language or translate saved names, descriptions, custom powers, chat text or editable prompt content. Story language remains an independent preference. Existing data is retained; reload after updating.

## v0.44.1 — Power settings in the extension drawer

Manage presets, definitions and JSON Import/Export in **Extensions → RoleForge → Power Presets**. The RPG Powers page now contains character power values only. Character creation contains power choices only; the unstyled white management button has been removed. Existing presets and values are preserved.

## v0.44.0 — Custom Power Presets

- Character creation, RPG UI and wand menu now use RoleForge branding.
- In **Extensions → RoleForge → Power Presets**, choose **Original Preset** for the existing Tretaresia powers or **Custom** to start with an empty list.
- Create, rename, edit and delete power definitions. Supported types: number, resource, rank and toggle. Configure descriptions, limits, starting values, rank names, icons, colors and availability during character creation.
- Definitions belong to the active character card; power values belong to each chat. Custom choices appear in character creation, the Powers page and normal AI state updates. Custom resources also appear on Status.
- **Export JSON / Import JSON** transfer the power preset. Exporting Original produces an editable Custom copy. Import replaces definitions only after confirmation; matching IDs retain existing chat values. Deleting a definition hides it while preserving its archived values.
- Custom supports up to 64 definitions, 2,000 description characters per power and a 1 MiB import file. JSON uses `roleforge-power-preset` version 1.
- Existing saves and Original power values remain compatible. Internal storage keys and AI patch tags retain their legacy identifiers. Updating does not require clearing saved data.
- Custom changes power systems; bundled maps, ranks and other world-specific modules are not a complete world editor.


## v0.43.8 — Lore Import / Export

In **NPC Management → Lore Management**, use **Export JSON** to download all saved Lore for the current character card, including disabled entries, keywords and pinned flags. Use **Import JSON** to select a Tretaresia Lore JSON file and confirm the destination and new-entry count. Imports append to the current card, skip exact duplicates, and never overwrite existing records. Titles shared by different entries are retained. Imported IDs are regenerated.

Files use `{ "format": "tretaresia-lore", "version": 1, "entries": [...] }`; arrays of native Lore records are also accepted. SillyTavern World Info files are not this format. Limits remain 200 entries per card, 160 characters per title, 12,000 characters per entry, 30 keywords and 12 MB per file. Invalid files, over-capacity imports and active-budget failures leave saved Lore unchanged. The card's budget and selection mode stay unchanged. Export saves entries, not unsaved edits or chat/NPC data.


ส่วนเสริมสำหรับ SillyTavern ที่แสดงสถานะ RPG, ฉาก, NPC และกลุ่มสังคมร่วมกับ Main Chat รองรับภาษาไทยและอังกฤษ รวมถึงหน้าจอมือถือ

### แก้ไข v0.43.6

- แยก Name (ชื่อบุคคล), Title (ตำแหน่ง/ฉายา), Occupation (อาชีพ) และ Relationship (ความสัมพันธ์) ให้ชัดเจนในคำสั่งทั้ง Main Chat และ NPC Management
- หัวบทพูด Father/พ่อ, Innkeeper, Gate Keeper จับคู่กับชื่อจริงจากความสัมพันธ์/อาชีพที่มีอยู่เมื่อมีผู้ตรงกันเพียงคนเดียว ไม่เดาเมื่อมีหลายคนในบทบาทเดียวกัน
- ป้องกันการสร้าง dossier ใหม่ที่ใช้คำเรียกบทบาททั่วไปเป็นชื่อ และแก้ dossier เดิมเป็นชื่อจริงได้เมื่อ AI อ้าง id เดิม โดยรักษาภาพและข้อมูลเดิม
- การเจนผ่าน NPC Management ส่งข้อมูลข้อความจากการ์ดตัวละครประกอบด้วย ตรวจชื่อก่อนเปลี่ยนร่าง และลองใหม่หนึ่งครั้งด้วยชุดช่องข้อมูลที่เล็กลงเมื่อ JSON ไม่สมบูรณ์หรือชื่อไม่ถูกต้อง รองรับทั้ง Generate และเติมช่องว่าง
- หากยังไม่สำเร็จจะเก็บร่างเดิมไว้ ไม่บันทึกอัตโนมัติ ตัวละครที่ตั้งใจปิดบังชื่อยังใช้คำบรรยายในเรื่องจนกว่าจะเปิดเผยตัวตน

### แก้ไข v0.43.4

- NPC Management เปิดอ่านภาพอัตโนมัติเมื่อเลือกรูปตัวละครหรือเปิดร่างที่มีรูป ผู้ใช้ยังปิดเพื่อเจนจากข้อความได้
- รูปลักษณ์จากภาพใช้คำบรรยายที่อ่านได้โดยตรง ไม่ต่อท้ายรูปลักษณ์ที่ AI ขั้นสร้างประวัติแต่งขึ้นอีกครั้ง
- ขอรายละเอียดภาพชัดเจนขึ้น ไม่ตัดคำบรรยายทิ้งที่ 450 ตัวอักษร และกำชับไม่ดัดแปลงภาพตามโลกแฟนตาซีหรือบริบทแชต
- ยังต้องใช้โมเดลที่รองรับภาพและเปิด Image inlining; หากอ่านภาพไม่ได้จะคงร่างเดิมไว้ ความถูกต้องของการมองภาพยังขึ้นอยู่กับโมเดล

### เพิ่มเติม v0.43.3

- จำกัดความกว้างหน้าต่างและคอลัมน์ภายในให้พอดีหน้าจอมือถือ ป้องกันเนื้อหาหรือฟอนต์ของธีมดันปุ่มปิดออกนอกจอ
- สงวนพื้นที่ปุ่มปิด 44px และปรับความกว้างตาม viewport เมื่อหมุนจอ

### เพิ่มเติม v0.43.2

- ปิด wand menu ทันทีเมื่อเปิด RPG รวมถึงบนมือถือ และไม่ให้เมนูกลับมาทับหน้าต่างระหว่างเปิดใช้งาน
- ใช้เหตุการณ์ MESSAGE_RECEIVED ยืนยันว่าคำตอบหลักเสร็จแล้ว แม้สถานะ Waiting for AI ของโฮสต์จะค้าง จากนั้นบันทึกฉากและไดอารี เปิดปุ่มคำเชิญ และอัปเดตสถานะใน UI โดยไม่เรียก AI เพิ่ม
- ไม่ตีความคำพูดเชิญเข้าปาร์ตี้ว่าเป็นการตอบรับหรือสร้างปาร์ตี้ของผู้เล่น การเข้าปาร์ตี้ NPC เกิดเมื่อผู้เล่นกดรับคำเชิญเท่านั้น
- เพิ่มคำสั่งตรวจข้อมูล Scene Tracker ที่ท้ายพรอมต์ เพื่อเน้นให้เติมรายละเอียดฉากที่ยังขาดภายในคำตอบเดียว

### เพิ่มเติม v0.43.1

- สรุป Scene Tracker, Diary, Party/Guild และการเปลี่ยนสถานะที่ยืนยันใน patch เดียวท้ายคำตอบหลัก เพื่อให้ UI อัปเดตทันทีโดยไม่เรียก AI รอบสอง ตัวอ่านรวมข้อมูลฉากจากหลาย patch ที่อาจพบในข้อความเก่า และอ่านคำเชิญตรงจากบทพูดภาษาไทย/อังกฤษได้กว้างขึ้น

### เพิ่มเติม v0.43.0

- ตำแหน่งสมาชิก Party เป็นช่องกรอกข้อความอิสระพร้อมรายการคำแนะนำ และรักษาชื่อตำแหน่งที่กำหนดเองไว้หลังบันทึกหรือโหลดใหม่ ตำแหน่งจากคำเชิญ Party/Guild ยังคงเป็นข้อความอิสระ และคำเชิญแสดง Reputation เมื่อมีข้อมูล
- Scene Tracker รับคีย์สั้น เช่น `loc`, `t`, `who` ในข้อมูลฉาก โดยขอข้อมูลครบ 21 ช่องในฉากแรก และส่งเฉพาะข้อมูลที่เปลี่ยนในฉากถัดไป ช่องที่ไม่ส่งสืบทอดจากฉากก่อนหน้า UI ยังแสดงช่องทั้งหมด
- Scene Tracker, Diary และคำเชิญใช้ข้อมูลในคำตอบหลัก แสดงตัวอย่างระหว่างข้อความกำลังมา และบันทึกเมื่อข้อความจบโดยไม่เรียก AI เสริม การ์ดคำเชิญกดได้หลังข้อความจบ
- ถอดแท็บ World Map และช่องพิกัด X/Y จากแบบฟอร์ม Scene Tracker สถานที่กรอกเป็นข้อความ ระบบยังอ่านข้อมูลแผนที่เก่าที่บันทึกไว้เพื่อความเข้ากันได้ แต่ไม่ใช้แผนที่โลกเป็น UI สำหรับโรลต่อไป Local room layout แยกต่างหากและยังใช้งานได้

### เพิ่มเติม v0.42.0

- Party และ Guild มีแรงก์กลุ่มและจำนวนภารกิจที่สำเร็จ แสดงทั้งในการ์ดคำเชิญใน Main Chat และหน้าจัดการกลุ่ม โดยเก็บต่อเนื่องในสถานะการเล่น
- ผู้เล่นตั้งชื่อ Party/Guild เมื่อสร้าง และแก้ชื่อภายหลังได้ในหน้าจัดการกลุ่มที่ตนเป็นเจ้าของ พร้อมกำหนดแรงก์และจำนวนภารกิจสำเร็จ สำหรับกลุ่มที่ NPC เชิญจะไม่ให้ผู้เล่นแก้ข้อมูลของหัวหน้ากลุ่มผ่านแบบฟอร์มนี้
- คำเชิญเก็บแรงก์และยอดภารกิจตามข้อเท็จจริงในเนื้อเรื่อง หากยังไม่ทราบจะแสดงว่าไม่ทราบ จำนวนสมาชิกยังแยกจากรายชื่อที่รู้จัก และผู้เล่นไม่ถูกตั้งเป็น Leader เมื่อเข้าร่วม
- เมื่อภารกิจของกลุ่มสำเร็จอย่างยืนยันได้ AI สามารถอัปเดตยอดภารกิจด้วยการแก้สถานะกลุ่มในคำตอบหลัก โดยไม่เรียก AI เพิ่ม

### แก้ไข v0.41.1

คืนไฟล์ CSS ที่ตำแหน่งเดิมเพื่อรองรับ `loader.js` รุ่นเก่าที่ Safari ยังเก็บไว้ พร้อมให้ runtime ตรวจการโหลด CSS หลักโดยตรงก่อนเปิด UI แก้ปุ่มเปิด RPG ที่อาจสั่งปิดเมนูส่วนเสริมซ้ำจนเปิดเมนูกลับ และเลิกให้คำขอเว็บฟอนต์ทำให้การโหลดหน้าต่างช้า ทดสอบการเปิดทุกแท็บและ NPC Manager ใน Chromium ขนาดมือถือและเดสก์ท็อปทั้งตัวโหลดเก่าและใหม่

## สิ่งที่เปลี่ยนในเวอร์ชันนี้

- **ติดตามจากคำตอบหลัก:** Scene Tracker, Diary, คำเชิญ Party/Guild และการอัปเดตสถานะอัตโนมัติไม่เรียก AI รอบเสริม ระบบกู้ข้อมูล NPC/ฉากเบื้องหลังเดิมถูกยกเลิก
- **แสดงระหว่างสตรีม:** Scene Tracker เริ่มจากฉากล่าสุด แล้วเปลี่ยนเมื่อข้อมูลฉากใหม่มาถึง บทบรรยายและบทพูดแสดงได้ก่อนปิดแท็ก คำเชิญและ Diary ขึ้นทันทีที่ได้รับข้อมูลครบของรายการนั้น
- **คำเชิญที่ตอบได้:** แสดงชื่อกลุ่ม ผู้เชิญ ตำแหน่ง จำนวนสมาชิก และปุ่มยอมรับ/ปฏิเสธใน Main Chat การ์ดแสดงระหว่างเจนได้ แต่ปุ่มเปิดใช้งานหลังข้อความจบและบันทึกแล้ว เพื่อป้องกันการเข้ากลุ่มจากข้อความที่ยังเปลี่ยนได้
- **แยกผู้สร้างกับผู้เข้าร่วม:** ผู้สร้างกลุ่มเองเป็น Leader ส่วนผู้ตอบรับคำเชิญเป็นสมาชิกตามตำแหน่งที่เสนอ โดยไม่เปลี่ยนเป็น Leader อัตโนมัติ
- **จำนวนสมาชิกสมจริง:** แยกจำนวนทั้งหมดออกจากรายชื่อที่รู้จัก กิลด์ที่มี 120 คนยังคงมี 120 คนแม้รู้จักเพียงผู้เชิญ เมื่อเข้าร่วมจะเป็น 121 คน ไม่สร้าง NPC เปล่าเพื่อเติมจำนวน หากไม่ทราบยอดจริงจะแสดงว่าไม่ทราบ ไม่ถือว่ามีเพียงคนที่รู้จัก
- **Narrative ต่อเนื่อง:** รวมกรอบบรรยายที่ติดกันเป็นกรอบเดียวโดยคงย่อหน้า แก้การแยกข้อความเมื่อแท็กซ้อน ปิดผิดประเภท หรือยังส่งมาไม่ครบ
- **จัดโครงสร้างไฟล์และอัปเดต cache version:** โมดูลอยู่ใน `src/`, CSS อยู่ใน `styles/`, HTML อยู่ใน `templates/` และเอกสารเก่าอยู่ใน `docs/archive/` ไฟล์ CSS ขนาดเล็กที่ root เป็นทางเข้าของตัวโหลดรุ่นเก่าที่ยังอยู่ในแคช

## ติดตั้งและอัปเดต

1. เปิด Extensions → Install extension ใน SillyTavern
2. ใส่ URL `https://github.com/DesZiDesu/rpg-systems`
3. ใช้ branch `main` แล้วโหลดหน้าใหม่

สำหรับผู้ติดตั้งแล้ว ให้กด Update ในรายการ Extensions แล้วโหลดหน้าใหม่เมื่อ AI เจนเสร็จและเก็บข้อความร่างเรียบร้อย หากมีปุ่ม **Apply update** สามารถใช้ปุ่มนั้นได้ ไม่ต้องล้างข้อมูล Safari

ชื่อโฟลเดอร์ติดตั้งมาตรฐานคือ `third-party/rpg-systems` ระบบใช้ stable loader อ่านเวอร์ชันจาก `manifest.json` และโหลด JavaScript/CSS ด้วย URL ของเวอร์ชันนั้น

## ใช้งาน Main Chat

เปิด Auto Track เพื่อบันทึกข้อมูลจากคำตอบหลัก เปิด Chat Presentation เพื่อแสดง Narrative/Dialogue และเปิด Scene Tracker เพื่อแสดงข้อมูลฉากเหนือคำตอบ

ข้อมูลจะปรากฏได้เมื่อโมเดลส่งมาแล้วเท่านั้น ไม่สามารถรู้คำเชิญหรือบันทึกที่ยังไม่ได้เจน การพรีวิวไม่เปลี่ยนสถานะถาวร การบันทึกจริงเกิดเมื่อจบข้อความ โดยใช้ประวัติแต่ละข้อความและ swipe เพื่อป้องกันการบวกสถานะซ้ำ

หากโมเดลไม่ส่งข้อมูลครบ ระบบเก็บข้อเท็จจริงเดิมและแสดงช่องที่ยังขาด ไม่เรียก AI เพิ่มและไม่เดาข้อมูลที่ยืนยันไม่ได้ คุณยังใช้ **Manual Sync** เพื่อสั่งตรวจข้อมูลเองได้

### Party และ Guild

- สร้างกลุ่มเองจากหน้า Party/Guild ได้: Party ไม่มีค่าก่อตั้ง ส่วน Guild ใช้ค่าก่อตั้งตามระบบเดิมที่แสดงใน UI
- ผู้สร้างแก้ชื่อกลุ่ม แรงก์ และยอดภารกิจที่สำเร็จได้ในหน้าจัดการ Party/Guild; กลุ่มที่ NPC เชิญเก็บข้อมูลที่ยืนยันจากคำตอบหลักและผู้เล่นไม่ได้รับสิทธิ์แก้การจัดการกลุ่มของผู้อื่น
- เมื่อ NPC เชิญเข้ากลุ่ม การ์ดคำเชิญจะแสดงในข้อความที่เชิญ ผู้เล่นเลือกยอมรับหรือปฏิเสธเอง
- รองรับผู้เชิญที่ระบุด้วย NPC ID, ชื่อจริง หรือชื่อเรียกอื่น และใช้ตำแหน่ง Member หากไม่มีตำแหน่งระบุ
- มีตัวตรวจบทพูดเป็นทางสำรองสำหรับคำเชิญโดยตรงที่ระบุชื่อกลุ่มในเครื่องหมายคำพูด เช่น `I invite you to join the guild "Dawnspire".` หรือ `ขอเชิญคุณเข้าร่วมกิลด์ “รุ่งอรุณ”` ไม่ใช่ตัวเข้าใจภาษาธรรมชาติทุกสำนวน ข้อมูล structured จากคำตอบหลักเป็นช่องทางหลัก
- ปฏิเสธแล้วไม่เพิ่มสมาชิก ไม่เก็บค่าก่อตั้งสำหรับการเข้าร่วม และไม่ยอมรับซ้ำในรายการเดิม
- เข้าร่วม Party ได้ครั้งละหนึ่งกลุ่ม แต่มี Guild ได้หลายกลุ่มตามระบบเดิม
- กลุ่มที่เข้าร่วมมีคำสั่งออกจากกลุ่ม แทนการยุบกลุ่มของคนอื่น และไม่แสดงปุ่มไล่สมาชิก
- เก็บยอดสมาชิกทั้งหมดและสมาชิกที่ยังไม่ทราบชื่อแยกจากรายชื่อ NPC ในฉาก สำหรับกลุ่มใหม่ในโลกสมมติ prompt ขอจำนวนที่สอดคล้องกับขนาดและชื่อเสียง ส่วนข้อมูล canon ที่ยังไม่ทราบจะไม่ถูกแทนด้วยจำนวนแต่งขึ้น

### Diary

บันทึกเฉพาะ NPC ที่พบแล้ว เป็นมิตร และอยู่ในฉากหรือถูกกล่าวถึงในข้อความนั้น ตั้งความถี่ได้ Off / Rare / Normal / Often บันทึกผูกกับข้อความต้นทาง เปิดอ่านผ่านปุ่ม Diary ใต้ข้อความ ไม่ใช้ AI รอบเสริม

### Narrative และ Dialogue

ใช้หนึ่งกรอบ Narrative สำหรับย่อหน้าบรรยายที่ต่อเนื่อง สลับกรอบเมื่อมีบทพูด ไม่ต้องสร้างกรอบใหม่ทุกย่อหน้า ระบบแสดงข้อความด้วย text nodes ไม่รัน HTML ที่โมเดลส่งมา

## ฟังก์ชันอื่นที่ยังใช้งานได้

สถานะผู้เล่น, พลังและความชำนาญ, คลังสิ่งของ, ภารกิจ, เงิน, การเดินทางแบบชื่อสถานที่, NPC Management แบบ Chat/Character, รูปตัวละคร, Lore, Character Forge, Household และการเชื่อมต่อ Character Life ยังคงใช้ข้อมูลและการตั้งค่าเดิม

**การใช้โควต้า:** คำตอบหลักยังใช้โทเคนของโมเดลตามปกติ รวมข้อมูล tracker ที่แนบมาด้วย การกด Manual Sync, เจน NPC/รูป/โปรไฟล์, เปิดเรื่อง หรือคำสั่งที่ให้ AI เขียนข้อความ ยังอาจเรียก AI เพิ่ม ตัวนับใน Settings เป็นยอดสะสมของหน้านั้น ไม่ใช่จำนวนคำขอต่อข้อความ

## โครงสร้าง Repository

| ตำแหน่ง | หน้าที่ |
|---|---|
| `manifest.json`, `loader.js` | จุดเริ่มโหลดส่วนเสริมและเวอร์ชัน |
| `index.js` | เชื่อมกับ SillyTavern, state, prompt, events และหน้าหลัก |
| `ui-polish.css`, `style.css`, `npc-ui.css` | ทางเข้ารูปแบบเดิมสำหรับเบราว์เซอร์ที่เก็บตัวโหลด/โมดูลเก่า |
| `src/` | โมดูล NPC, Scene Tracker, คำเชิญ, Lore และส่วนประกอบ UI |
| `styles/` | CSS หลักและรูปแบบส่วนประกอบ |
| `templates/` | Settings และ Character Forge |
| `assets/` | ภาพประกอบและไฟล์เดิมเพื่อความเข้ากันได้ |
| `tests/` | ชุดทดสอบและขั้นตอนตรวจด้วยมือ |
| `docs/previews/` | หน้าพรีวิวสำหรับนักพัฒนา |
| `docs/archive/` | README เก่าสำหรับอ่านอ้างอิง ไม่ถูกโหลดเป็น runtime |

## สำหรับผู้พัฒนา

ต้องใช้ Node.js ที่รองรับ ES modules และ `node:test` (ทดสอบด้วย Node 24)

```sh
npm run check
npm test
```

Browser regression ต้องติดตั้ง Playwright และ Chromium ก่อน:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/npc-workspace.browser.mjs
node tests/startup.browser.mjs
```

รูปแบบข้อมูลจากโมเดลเป็น HTML comment ที่ซ่อนจากการแสดงผล เริ่มฉากก่อนเนื้อเรื่อง และส่ง event หลังบทที่เกี่ยวข้อง ข้อมูลแต่ละ operation ควรส่งครั้งเดียว:

```html
<!--tretaresia_patch:{"ops":[],"sceneTracker":{"loc":"Moon Hall","t":"08:00","who":["Rhea"]}}-->
<tr-narrative>แสงเช้าส่องผ่านหน้าต่าง

Rhea หยุดตรงหน้าคุณ</tr-narrative>
<tr-dialogue name="Rhea">ขอเชิญคุณเข้าร่วมกิลด์ “Dawnspire”</tr-dialogue>
<!--tretaresia_patch:{"ops":[["offer","guildInvitation",{"npcName":"Rhea","name":"Dawnspire","role":"Initiate","memberCount":120}]]}-->
```

ตัวอย่างย่อด้านบนละข้อมูลฉากบางช่องเพื่อให้อ่านง่าย ฉากแรกต้องครบ 21 ช่อง ส่วนฉากถัดไปส่งเฉพาะช่องที่เปลี่ยน โดยสืบทอดช่องเดิม ข้อมูลคำเชิญไม่ใช่คำสั่งให้เปลี่ยนสมาชิกทันที

## เอกสารย้อนหลัง

[README ก่อน v0.41.0](docs/archive/README-v0.40.10.md) เก็บรายละเอียดและประวัติเวอร์ชันเดิม เอกสารนี้เป็นคำอธิบายพฤติกรรมปัจจุบัน

License: [MIT](LICENSE)

### NPC role artwork (0.43.6)
NPC Management → CHAT APPEARANCE offers Classic (12 original icons), Medallion and Emblem (54 roles each). Select a style and role, then save. Existing NPC roleIcon values are retained without migration; AI updates cannot replace an existing NPC icon. New roles include Politician, Knight, Prisoner, Slave, Master (lord/owner), Clergyman and Nun. Clergyman is separate from the fantasy Priest role. Artwork is bundled locally and follows each NPC identity color.
