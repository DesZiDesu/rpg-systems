# RoleForge

**Public release: 0.73.0** · An RPG extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern) · English and Thai · Desktop and mobile

[คู่มือภาษาไทย](docs/getting-started.th.md) · [UI screenshots](docs/previews/commerce-stock-v0562/index.html) · [Development history](docs/archive/README-v0.56.2-development.md)

RoleForge brings an RPG workspace into your SillyTavern chat. Track your character, inventory, powers, skills, techniques, NPCs and the current scene while role-playing normally. Optional systems add shops, auctions, mission and recruitment boards, memory summaries and ElevenLabs voices.

The extension adds instructions for enabled systems to your existing text-generation connection and reads structured updates from completed AI replies. You do not need to write JSON yourself. The model still determines the story and must supply readable data for trackers to update.

## NPC icon updates for existing cards

**New in 0.72.0:** Import an image-only NPC update in **Presets & character cards → Pack setup into a character card**. Review ten rows per page, preserve existing custom images by default, download an undo file and apply to the existing card without replacing its avatar or chats. Both native archives and self-contained World Packs are supported. World Pack updates stage a new revision containing saved NPC/Lore edits before atomically saving its reference and payload. [Thai step-by-step guide and Fate coverage](docs/fate-servant-icons-update.th.md).

## NPC class images and compact powers

**Updated in 0.73.0:** a separate wand-menu **Story / Mission Manager** creates reusable mission/story templates with confirmed-state triggers, objectives, once-only EXP/money/item rewards and chat-specific progress. Stories round-trip through JSON, World Presets, native cards and compressed World Packs. Active missions keep their accepted rules when templates change. Saved-chat Header/Dialogue/Narrative now restore without Edit → Cancel. [Thai guide, schema and real SillyTavern previews](docs/story-mission-manager.th.md).

**Updated in 0.72.1:** the bundled Servant-class gallery appears only for Fate cards. Other cards keep the standard role symbols and generic custom-image upload. Existing Fate v3 Core/Native and self-contained cards are recognized without reimporting; new cards can opt in with `data.extensions.roleforge_icon_packs: ["fate-servant-classes"]`. An explicit empty array hides the gallery. Existing saved images are kept. [Card scope and real application checks](docs/card-icon-packs-v0.72.1.th.md).

**New in 0.71.0:** NPC role symbols can optionally use an uploaded image or one of **161 gears Servant-class icons**. Each alternate can inherit the base icon or use its own; custom images travel with native character exports and embedded archives. Original role symbols remain available. The Power page now shows compact acquired/selected records with expandable details; **Manage → Current powers** opens value editing in native settings. Existing Resource powers keep their current/max gauges. [Guide and screenshots](docs/npc-class-icons-powers.th.md).

## Large NPC / Lore libraries

**New in 0.69.0:** Management uses cached summary rows and loads dossiers when opened or relevant to the outgoing chat. Runtime state and new checkpoints store NPC changes separately from the reference archive. On-demand lookup preserves disabled/unmet state and manual version selection; unloaded records are never treated as deletions.

**New in 0.70.0: self-contained World Pack cards.** Import one character card and open its chat: RoleForge automatically installs its embedded `gzip-base64` archive in a Worker, with progress and cancellation. Ready revisions are reused without decoding again. **Update embedded archive / Export self-contained card** includes this card's saved NPC/Lore edits and atomically saves a new pinned reference plus payload. The payload stays in the card for moving devices; previous installed revisions remain available. [Usage and authoring contract](docs/inline-world-packs.th.md).

Reference-only cards and **World Pack ZIP/folder** import/export remain supported. A Worker validates hashes, indexes and all versions before publishing browser-local IndexedDB readiness. Explicit migration can move native embedded arrays only after storage and card writes succeed. **Export / Backup** includes all versions, Lore, supplements and card-specific edits. A reference-only Core card still requires its separate archive. [ZIP guide](docs/world-packs.th.md) · [0.69.0 validation](docs/world-packs-validation.th.md).

## Extension settings

**Fixed in 0.68.3:** normal AI reply tracking is enabled by default and saved once for all chats and character cards. Switching cards, resetting world presets or importing an older card cannot change this preference. You can turn tracking off globally in **Tracking & notifications**; existing global off choices are preserved. Tracking still reads the normal AI reply without an extra AI request.

**New in 0.68.0:** the native SillyTavern drawer starts with six groups: **General play**, **Windows & appearance**, **World & rules**, **Presets & character cards**, **Tracking & notifications**, and **Advanced & diagnostics**. Search in English or Thai for a system or setting, such as Header, currency, HP or Regex. Editors open across the drawer's full width with a sticky Back button; switching pages preserves unsaved fields and returns to the previous search or menu. Navigation does not write settings or call AI.

Stats, currency, Power, Character Creation and presets have their own management pages. Existing settings and chat data keep the same storage and save handlers. To configure chat frames, use **Windows & appearance → Chat cards & NPCs**. Voice and Memory remain separate native addon drawers. [Mobile / PC review](docs/previews/settings-drawer-review/index.html) · [Screenshots](docs/previews/settings-drawer-review/mobile-organization.png) · [Thai guide](docs/settings-drawer-v0.68.0.th.md).

**Fixed in 0.68.1:** settings routes keep padding and spacing when a custom theme gives native buttons opaque backgrounds and removes separators. The search input and Clear button stay aligned when the theme forces input margins. Theme colors, rounded buttons and native extension headers are preserved. Verified on a real **SillyTavern 1.19.0** installation using the supplied **Minimalism Tone** theme, all 20 pages at 320/390/768/1440px, large text, draft retention and real server saves across reload. Native Dark Lite also passes. [Real application screenshots](docs/previews/settings-theme-fix/index.html) · [Thai guide](docs/settings-theme-fix-v0.68.1.th.md).

## Currency units

**New in 0.68.2:** add any number of currency units per chat, with independent names, symbols, rates, colors and animated icon sets. Expand a unit to edit or remove it; search and 10-unit pages keep large schemes manageable. Wallets, group funds, transactions, quests, shops, auctions and refundable deposits use configured protocol IDs. Existing value and legacy 1–3-unit presets remain compatible; currency Import/Export and one-card setup retain every unit. [Thai tutorial](docs/currency-multi-unit-v0.68.2.th.md) · [Real SillyTavern mobile/desktop GIFs](docs/previews/currency-multi-unit/index.html).

## Character and Lore management

**Fixed in 0.68.5:** NPC/Lore selection menus keep their choices available when a mobile tap blurs the menu without focusing a new control. Outside taps, keyboard navigation and Escape still dismiss the menu. One handler per manager also avoids accumulating listeners when Lore rebuilds its tools. [Fix and real application checks](docs/archive-menu-v0.68.5.th.md) · [Mobile / desktop results](docs/previews/archive-menu-fix/index.html).

**New in 0.68.4:** Character storage defaults to **Unlimited entries**. In **NPC Management → ⋯ → Character capacity**, set an optional maximum for each Chat/Character library. The setting follows the current chat, reusable presets and one-card setup. Enabled and disabled records both count toward storage capacity. Lowering the limit keeps existing records readable/editable and blocks further growth; imports preserve disabled switches and archives beyond the former 200-record ceiling.

Disabled characters remain available as canon references: RoleForge keeps their name/alias index and retrieves up to 16 dossiers, prioritizing names mentioned in the recent chat. Reading a dossier does not enable its tracking or permit AI changes to its Stats. Detailed tracking only includes enabled characters. Keeping 500 characters with 20 enabled reduces tracking work, but stored archives, saving and the reference index still use memory and context. [Thai guide](docs/npc-capacity-v0.68.4.th.md) · [Real SillyTavern screenshots](docs/previews/npc-capacity/index.html).

**New in 0.66.0:** find disabled NPCs or Lore with counted **All / Enabled / Disabled** filters, then toggle them directly from each row. Disabled records have a dashed border, muted styling and an explicit label. Select several records, the current page or all filtered results across pages; enable/disable them together and undo the latest status change. Each page contains 20 records, and changing pages keeps your selection.

The list fills the mobile window with one scrolling area. Page controls and batch actions stay below it; secondary tools, imports and scope settings live in the top **⋯** menu. NPC Chat/Character scope and character-card Lore storage stay the same. Bulk changes preserve profile data and use the existing Lore budget checks. Browsing and toggling do not call AI. [Mobile / PC preview](docs/previews/archive-qol/index.html) · [Offline preview](docs/previews/archive-qol/standalone.html) · [Thai guide](docs/archive-qol-v0.66.0.th.md).

**Added in 0.66.1:** Lore storage defaults to **Unlimited entries**. Set an optional maximum in **Lore Management → ⋯ → Lore storage & delivery**. Lowering it keeps existing records readable/editable and only blocks further growth. This setting follows chat/world presets and one-card setup; Import/Export and card reload keep entries beyond the former 200-record ceiling. Large exports offer numbered files within the existing 12 MB import limit. AI delivery still uses its separate mode and context budget; choose Relevant for large worlds. [Lore capacity guide](docs/lore-capacity-v0.66.1.th.md) · [Mobile settings preview](docs/previews/lore-capacity/settings-390.png).

**Added in 0.66.2:** select NPCs or Lore across pages, then choose **⋯ → Delete selected** in the bottom selection bar. Confirmation identifies the count and destination. NPC deletion uses the chosen Chat/Character scope; Lore deletion affects the current card’s shared archive. Unselected records, other scope copies, portraits and chat messages are kept. Failed saves retain selection for retry; Undo still restores enabled states, and deleting records clears the prior Undo action. [Bulk deletion guide](docs/archive-delete-v0.66.2.th.md) · [Mobile menu preview](docs/previews/archive-delete/npc-menu-390.png).

## Chat designs

**Extensions → RoleForge → Windows & appearance → Chat cards & NPCs** offers **RoleForge Original** and **The Mage’s Folio**. Folio has a right-hand square portrait, book-style nameplate, real NPC badge, rounded speech slip and a pen signature. Each speaker’s identity color tints their Header and Dialogue; red characters use red accents and a dark red speech frame with readable light text. The badge can show occupation + overall NPC rank, or a selected skill + its mastery level. Missing facts are hidden, and nonmagic settings work too.

**Added in 0.67.0:** **The Gilded Chapter** brings a left square portrait and chamfered walnut speech frame; **The Royal Codex** has a right square portrait, double gold bookplate and right pen rail; **Aincrad Interface** uses silver speech panels, orange selections and green NPC HP/Lv accents. All three use existing NPC facts, character colors and live Voice controls. Their Header and Narrative remain transparent, and each frame can be disabled independently. Original remains the default and Folio stays available. [Mobile / PC preview](docs/previews/chat-designs/index.html) · [Offline preview](docs/previews/chat-designs/standalone.html) · [Download previews](docs/previews/chat-designs/roleforge-chat-designs-preview.zip) · [Thai guide](docs/chat-designs-v0.67.0.th.md).

Aincrad’s optional HP/Lv display reads `NPC.stats.hp` and `NPC.stats.level`; unknown values are hidden and HP 0 remains visible. Its HP underline is decorative, without an invented maximum or percentage. Entrance motion finishes in 330ms, respects Reduce Motion, and only plays for the latest fresh reply or a design switch; streaming and state/Voice refreshes do not replay it. New font assets are local to the extension and only load when used. Appearance, badge, motion and HUD choices follow chat/world presets and one-card setup.

Enable **Header**, **Dialogue** and **Narrative** independently. Disabling Dialogue displays `"text"` in the speaker’s color; disabling Narrative displays italic text; Header becomes a plain speaker name. Header and Narrative stay transparent. Choices are saved per chat and included in presets and one-card setup. Original remains the default, retired themes migrate to Original, and retired color-mode fields are ignored. User UI stays on the right. Shared mode preserves native Regex/MVU widgets and Voice controls; saved story and spoken text stay unchanged. [PC / mobile / color preview](docs/previews/chat-folio/index.html) · [Thai guide](docs/chat-designs-v0.65.0.th.md).

**Fixed in 0.67.1:** All five designs now honor the 48–144px NPC portrait frame setting, and the NPC editor previews the actual chat frames. Player narration reads from the left within its right-side block, with matching theme ornaments and compact spacing. NPC injuries, corpses and dialogue no longer trigger guessed player HP loss or conditions; expired conditions no longer tick. Recognizable legacy keyword conditions are removed conservatively without inventing a historical HP refund. [Mobile / PC fixes preview](docs/previews/chat-fixes/index.html) · [Thai guide](docs/chat-fixes-v0.67.1.th.md).

## Install

1. Open **Extensions → Install extension** in SillyTavern.
2. Paste **https://github.com/DesZiDesu/rpg-systems**.
3. Install from **main**, then reload SillyTavern.
4. Open **Extensions → RoleForge** to choose your language and settings. Use the RoleForge launcher to open the RPG workspace.

Keep the installation folder named **third-party/rpg-systems**. No build step, npm installation or ElevenLabs account is required to use the RPG features.

Use a current SillyTavern installation with extension support and a connected text-generation model. The project has not established a minimum SillyTavern version; browser checks exercise the extension APIs with a controlled host. A recent desktop or mobile browser is recommended.

## Chat presets

**Extensions → RoleForge → World rules & presets → Chat presets** stores reusable named configurations for Powers, Character Creation, currency, stat training, Lore options, world-system switches and chat appearance. Load a saved set into one chat, rename/update/export it, or delete its library copy without changing chats that already use it. Defaults are frozen on first open; existing card-wide presets remain the migration fallback. Currency-only JSON import/export is also available in Currency setup. Player balances and progress are retained; finish pending trades/training before loading incompatible settings. See [Thai guide](docs/chat-presets-v0.62.0.th.md).

RoleForge does not run on `chat.rolezy.com` or its child domains. The loader shows an unsupported-public-server notice before loading the runtime, styles or API clients. Installation itself is controlled by SillyTavern's server.

## Start playing

- Choose a character and chat, then describe your role normally. **Auto Track**, **Chat Presentation** and the **Scene Tracker** are enabled by default.
- Open RoleForge to inspect or edit your character, resources, equipment, inventory, powers, abilities and NPC records. The interface defaults to English and can be switched to Thai.
- Enable optional systems in Extension Settings. Their windows share the space above the chat input with tabs, expand/collapse, minimize and close controls.
- Continue through text or use the relevant action buttons. Browsing or selecting goods does not itself spend money or transfer ownership.

For blank character chats without a card greeting, Character Forge provides the starting profile. Configure its choices in **Extensions → RoleForge → Character Forge Preset**. Custom uses individual editable choices for social standing, Arsenal types, skills, ranks and alignment. Rank headings can be renamed or hidden. Origin Skill is optional; Guild and Party are separate fields. The drawer follows your SillyTavern theme while the creation form keeps the Forge theme. Existing presets and chat drafts are retained. See [the 0.58.8 update notes](docs/character-forge-v0.58.8.th.md).

Saved replies without RoleForge presentation tags remain ordinary text. Generate a new reply to apply enabled instructions. Missing or invalid model data may leave a tracker unchanged or show a diagnostic; a transaction described only in narration is not necessarily recorded.

Enable **User-only Dialogue / Narrative / Inner thought UI** in **Extensions → RoleForge → Chat appearance & NPCs** to format sent player messages: `"speech"` or `“speech”`, `*narrative*`, and `|inner thought|`. Player blocks align right and follow the selected theme. This independent option defaults off, preserves original message text and native rich Markdown/regex widgets, and never interprets assistant shorthand. [Preview and validation notes](docs/user-chat-v0.58.15.th.md).

**New in 0.61.0:** import a RoleForge character pack through SillyTavern's normal card import to load its NPC/Lore archives, Power and Character Forge presets, Lore retrieval settings and starting world state together. Saved progress and explicit user overrides take priority. Authors can use **Extensions → RoleForge → World rules & presets → RoleForge Character Card Pack** to save setup into the card, then export it normally. [One-card guide](docs/character-pack-v0.61.0.th.md).

This release also preserves MVU/Tavern Helper frontends across presentation modes and streaming, respects thinking/hide Regex, and reduces repeated work after replies. Tracker data stays separate. [MVU compatibility and performance report](docs/mvu-regex-coexistence.th.md).

**Added in 0.60.0:** **RoleForge + Regex · Shared** keeps native Regex HTML and bound controls while adding NPC, Dialogue, Narrative and Voice UI. Whole-message cards retain their own layout with separate NPC/speech controls. Choose the mode in **Extensions → RoleForge → Chat appearance & NPCs**; existing users who explicitly enabled native preservation retain that preference. [Compatibility guide and validation](docs/regex-shared-v0.60.0.th.md).

**Added in 0.59.0:** train HP/MP/ST maximums and numeric stats from the main chat, configure custom stats and configurable currency units, and use animated 8-bit money icons. Status and Training default to **C / Tactical Strip**, with A and B retained as separate selectable layouts in **Extensions → RoleForge → User stats**. All composer windows start minimized on chat entry. [Update notes and screenshots](docs/stats-currency-v0.59.0.th.md).

## Features

| System | What it does |
| --- | --- |
| Character and scene | Player resources, progression, equipment, scene status, location and story time. |
| NPCs and world | Profiles, portraits, alternate information, relationships, diary, knowledge, parties, guilds and lore tools. |
| Powers and abilities | Powers, skills and techniques with persistent mastery, training and optional incantations. Skill Storage includes automatic categories and responsive pagination. |
| User stats and currency | Practice with confirmed permanent gains, configurable custom stats, three composer layouts, exact currency rates and eight animated pixel icon sets. |
| Inventory and Loot | Loot from completed encounters and exploration; collect selected items, use/eat/drink/drop/gift, configure multiple stat effects, and track temporary overflow buffs. |
| Shops and auctions | Buy/sell and negotiate, select multiple items and quantities, bid in auctions, and keep confirmed receipts. Support property keys, rentals, access rights and prepaid services. |
| Boards and story tools | Optional mission/recruitment boards, story memory, agendas and quest objectives. |
| Memory Addon | Optional summaries and searchable archives in a dedicated settings drawer. |
| Voice Addon | Optional dialogue/narrator playback, individual voices, male/female defaults and editable speech drafts. |

Stock and purchase quantity are separate. A shop can have **12 healing potions and 8 antidotes**, while your request for **three of each** opens a **3 + 3** basket. Accepted offers await confirmation; validated purchases deduct the agreed total and update inventory and known stock once. [Shop workflow](docs/commerce-ai-stock.th.md) · [Loot and items](docs/items-update.th.md)

## Optional addons and API usage

**Memory and Voice default to off.** Shops, auctions, incantations, boards and optional story tools also start disabled. Saved opt-in settings survive updates. Enable each system in Extension Settings; expand the Memory or Voice drawer when needed.

Normal role-play uses your existing SillyTavern text connection. Valid inline tracker, shop and item data is processed from that reply. Missing Loot data offers an explicit **AI: check loot from the latest reply** button after completed combat or exploration; it makes one repair request and records an empty result to avoid repeated checks. Normal tracking does not automatically start a Loot/auction repair request. Explicit actions such as trade buttons, training, item-detail generation and memory summarization can make additional text-model requests. RoleForge shows notifications at additional API request boundaries. Browsing and local selections do not make model requests. Some tasks use several batches; a request can fail without a saved result.

The **Voice Addon needs its own ElevenLabs API key**. Choose available voices and assign male, female, narrator or individual NPC voices. Model/voice access and credits depend on your account. Voice is manual by default; generating audio consumes provider credits, while replaying cached audio does not request a new clip. Editing a speech draft leaves the AI's original text intact. [Voice setup](docs/voice-addon.th.md) · [Memory setup](docs/memory-addons.th.md)

## Updates and saved data

Use **Update** in SillyTavern's extension list. Finish generation and save your draft before reloading, or use **Apply update** when it appears. A normal update does not require resetting RPG state or clearing browser data.

RPG state is stored with chat metadata; NPC records can use chat or character scope. Memory archives and voice caches also use browser storage. Use **Export state** before migrating important data, and export Memory separately when enabled. Clearing browser storage or changing browsers can remove local archives and caches. Keep API keys out of shared chats and exports. Optional remembered voice-key encryption requires HTTPS or localhost.

## Troubleshooting

| Symptom | First check |
| --- | --- |
| An optional window is missing | Enable that system and generate a new relevant reply. |
| A tracker or shop does not update | Check the completed reply and diagnostic. The AI must supply readable data; planning text is not a saved transaction. |
| A purchase cannot be confirmed | Check selected quantities, stock, terms, funds and the agreed price. Review the error before retrying. |
| Styling looks outdated | Update, wait for generation to finish and reload. Keep the standard installation folder name. |
| Regex cards disappear or show plain code | Select **RoleForge + Regex · Shared** under **Chat appearance & NPCs**, then reload. |
| Voice generation fails | Check the Voice toggle, dedicated ElevenLabs key, selected voice/model and provider quota. |

Check the browser console for loading failures. To temporarily skip RoleForge startup, add **tretaresia-safe=1** to the SillyTavern URL query and reload. This skips the extension without erasing chat data.

Report issues with your RoleForge version, SillyTavern version, browser, reproduction steps and panel diagnostic if available. Remove API keys and private chat details before posting to [GitHub Issues](https://github.com/DesZiDesu/rpg-systems/issues).

## Development and validation

Version **0.72.0** passes **1,318 unit/host tests** and syntax checks. Real **SillyTavern 1.19.0** checks on Chromium and WebKit verify image-only updates on the supplied **800 NPC / 1,771 versions / 178 Lore / 4,329 supplements** Fate data, existing-chat/checkpoint preservation, saved NPC/Lore edits, idempotence, guarded undo, reload/swipe and self-contained card transfer. Native optional-reference fallback, cancellation/owner changes and injected quota/card-write failures also pass. Existing class-image/Power browser regressions pass. No provider calls or physical phone tests. [Guide](docs/fate-servant-icons-update.th.md) · [Validation](docs/validation-npc-icon-update-v0.72.0.json) · [Mobile/desktop previews](docs/previews/fate-servant-icons-0720/index.html).

Version **0.71.0** passes **1,306 unit/host tests** and syntax checks. Real **SillyTavern 1.19.0** on Chromium and WebKit verifies optional NPC class images across all five chat themes, alternate inheritance, image upload, native card export/import, compact Power records and existing Resource gauges. Mobile/desktop layouts and portrait regressions pass. No separate Custom Status subsystem was added. [Guide, validation and screenshots](docs/npc-class-icons-powers.th.md).

Version **0.70.0** passes **1,296 unit/host tests** and syntax checks. Real **SillyTavern 1.19.0** runs on Chromium and WebKit verify one-card automatic installation, waiting generation preparation, reload reuse without decoding, NPC/version/Lore edits, self-contained JSON transfer into empty browser contexts, swipe/rollback, owner switching, cancellation and injected storage/card-save failures using the supplied **800 NPC / 1,771 versions / 178 Lore / 4,329 supplements** Fate pack. Legacy ZIP and native-card migration checks also pass. No model/provider requests or physical iPhone tests. [Validation, changed files and limits](docs/inline-world-pack-validation.th.md) · [Screenshots](docs/previews/inline-world-packs-0700/index.html).

Version **0.69.0** passes **1,287 unit/host tests** and syntax checks. Real **SillyTavern 1.19.0** checks on Chromium and WebKit use the supplied **800 NPC / 1,771-version** Fate archive, preserve all **178 world Lore / 4,329 supplements** in Worker backups and restore them in a clean browser profile. Checks cover bounded preparation, manual version selection, owner switching during retrieval, import cancellation, injected quota failure, native migration/save failure and the NPC/Lore bulk menus at mobile/desktop widths. These browser checks make no provider generation requests. [Validation and limits](docs/world-packs-validation.th.md).

Version **0.68.5** passed **1,263 unit/host tests**, syntax checks and archive QoL/deletion browser regressions. Real **SillyTavern 1.19.0** checks use WebKit touch at 390px and Chromium touch/mouse at 390/1440px, with 500 NPCs and 4,019 Lore entries. They cover native unassigned focus loss before a tap, page/all/filtered selection, cross-page selection, clearing, disable/Undo, cancellation/confirmation of deletion and actual server reloads. WebKit on Linux is supplemented with explicit native `blur()` to exercise iOS-style focus loss; a physical iPhone remains unverified. No provider generation requests are made. [Validation record](docs/validation-archive-menu-v0.68.5.json).

Version **0.68.4** passed **1,263 unit/host tests**, syntax checks and preset regressions. Real **SillyTavern 1.19.0** checks at 390/1440px import 500 NPCs with 20 enabled, test finite/unlimited capacities, preserve records when lowering limits, edit over-limit archives, reload real server saves, isolate chats and export one-card setup. A 320px viewport checks settings fit. The real generation interceptor retrieves a mentioned disabled dossier without enabling it; these checks make no provider generation requests. [Validation record](docs/validation-npc-capacity-v0.68.4.json).

Version **0.68.3** passed **1,253 unit/host tests**, syntax checks, preset regressions and the settings navigation suite. Real **SillyTavern 1.19.0** checks at 390/1440px verify default-on tracking with legacy off presets, global on/off persistence across cards and actual server reloads, unchanged RPG progress and separate world settings. These preference checks make no AI calls. [Validation record](docs/validation-tracking-global-v0.68.3.json).

Version **0.68.1** passes **1,235 unit/host tests** and syntax checks. Real SillyTavern checks import the full user-supplied theme through the native theme UI, retain its exact CSS, exercise all 20 settings pages at 320/390/768/1440px, resize text and save/reload a dummy character's stats through the real server. Native Dark Lite and the original settings navigation suite also pass. [Validation record](docs/validation-settings-theme-v0.68.1.json).

Version **0.68.2** passed **1,250 unit/host tests**, syntax checks and Stats/Currency browser regression at 320/390/1280px. Real **SillyTavern 1.19.0** checks at 390/1440px exercised adding six units, editing custom balances and transaction history, native Import/Export, actual server saves/reloads, 37-unit pagination/search/draft deletion and chat isolation. Currency settings also fit the default and Minimalism themes at 320/390/1440px. These configuration checks make no AI calls. [Validation report](docs/validation-currency-multi-unit-v0.68.2.json).

Version **0.68.0** passed **1,235 unit/host tests** and syntax checks. Settings browser checks at 320/390/768/1440px exercised all 20 pages, bilingual search, Back, scrolling, retained drafts, actual saves and zero AI calls. Startup, presentation/Regex, Stats/Currency, preset import/export and language regressions passed. [Validation record](docs/validation-settings-drawer-v0.68.0.json).

Version **0.67.1** passed **1,235 unit/host tests** and syntax checks. Browser checks verified five portrait designs at 48/72/144px on 320/390/768/1280px screens, the production NPC editor, late-loaded legacy CSS, player Markdown and native widget preservation. Full theme, Regex/MVU, player lifecycle and current/legacy startup checks passed. [Validation record](docs/validation-chat-fixes-v0.67.1.json).

The extension runs directly from **manifest.json** and **loader.js**. Runtime modules are in **src/**, styles in **styles/**, and settings/Character Forge templates in **templates/**. Small CSS files at the repository root support cached older loaders and must remain.

Node.js **24** is the tested development environment. Unit/host tests use Node's built-in runner:

    npm run check
    npm test

Browser tests also need Playwright and Chromium:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium
    node tests/startup.browser.mjs

For suites that expect system Chromium, set **CHROMIUM_EXECUTABLE** to your browser's absolute path. **npm run test:commerce-stock** covers both historical unknown-stock purchases and current AI-stock selection.

Version **0.66.2** passes **1,225 unit/host tests** and syntax checks. Bulk deletion browser checks at 320/390/1280px cover cross-page selection, filtered targets, confirmation cancellation, failed-save retry, scope isolation, empty-page clamping, cleared Undo and context changes. Host checks cover acknowledged NPC storage, failed Chat metadata rollback, turn snapshots and accepted Character writes. [Bulk deletion guide](docs/archive-delete-v0.66.2.th.md) · [Validation record](docs/validation-archive-delete-v0.66.2.json).

Version **0.67.0** passes **1,227 unit/host tests** and syntax checks. New design browser checks cover 320/390/768/1440px, all eight frame combinations, three character colors, square portraits, missing/zero NPC values, long text, actual Voice controls and finite/reduced motion. Native settings checks cover all five designs, per-chat persistence, card defaults and failed-save rollback. Regex/MVU suites retain native node/iframe state; a 200-reply Aincrad history only rereads the updated tail and does not animate the backlog. The portable production preview makes zero network requests. [Validation record](docs/validation-chat-designs-v0.67.0.json).

Lore checks retain 5,000 records, validate configurable/unlimited capacities, preserve archives when lowering limits and round-trip large Unicode exports in byte-bounded parts. Production browser checks at 320/390/1280px cover 2,500-record editing/creation, chat settings, one-card export/reimport and numbered-file downloads. Relevance checks skip word segmentation for impossible content matches while preserving Thai, Unicode normalization and word boundaries. [Lore capacity guide](docs/lore-capacity-v0.66.1.th.md) · [0.66.1 validation record](docs/validation-lore-capacity-v0.66.1.json).

Archive browser checks exercise the production NPC/Lore workspaces at 320/390/1280px in Thai and English, including 200 NPCs, touch scrolling, keyboard resizing, cross-page selection, Undo, storage scopes, failed saves and Lore budget limits. NPC generation, portraits, alternate profiles, Lore import/export and one-card setup also retain their browser regression coverage. [QoL guide](docs/archive-qol-v0.66.0.th.md) · [0.66.0 validation record](docs/validation-archive-qol-v0.66.0.json).

The preceding **0.65.0** browser checks cover both chat designs at 320/390/768/1280px, all eight independent frame combinations, square portraits, three Folio character colors, readable speech contrast, long names, live Voice controls, per-chat settings, reload, card/preset defaults and failed-save rollback. Native widgets keep their node identity, bound actions and iframe state through switching/restoration. Speech drafts survive visual theme refreshes while edits/swipes still invalidate their old source. The Original gallery also checks both host palettes and OS appearances. Browser checks use the production renderer and controlled SillyTavern hosts; the preview’s outer chat shell is a mock. [Chat design guide](docs/chat-designs-v0.65.0.th.md) · [Validation record](docs/validation-chat-designs-v0.65.0.json).

The broader 0.62.0 checks, including the original uploaded Madoka card, remain recorded in [the preceding validation report](docs/validation-chat-presets-v0.62.0.json).

Shared rendering is tested at 320/390/1280px with the actual pinned SillyTavern Regex engine, MessageFormatter, Markdown and sanitizer pipeline in a controlled host. Browser checks cover native widgets/listeners, tables, links, source/display rules, user-only shorthand, Voice, edit/swipe/reparenting, settings and composer windows. [Compatibility report](docs/regex-shared-v0.60.0.th.md).

Run `npm run test:regex` for the focused compatibility suites. The shared suite downloads pinned upstream test dependencies with `curl` into a temporary cache; `ST_REGEX_CACHE` can point to a prepared cache. This does not install runtime dependencies or change SillyTavern.

Run `npm run test:archive` for the Character/Lore filters, bulk controls, persistence and mobile layout checks.

Run `npm run test:settings` for native drawer navigation, English/Thai search, all settings pages, draft retention, scrolling and real save handlers.

Run `ST_REAL_URL=http://127.0.0.1:18174 ST_THEME_FILE=/path/to/theme.json npm run test:settings-theme:real` against a real SillyTavern server with RoleForge installed and a separate test data directory. This creates a dummy character and saves test preferences. [Real application test setup](docs/settings-theme-fix-v0.68.1.th.md).

Run `npm run test:lore-capacity` for large Lore libraries, capacity settings, chunked exports and one-card round trips.

Run `ST_REAL_URL=http://127.0.0.1:18174/ npm run test:npc-capacity:real` against a real, isolated SillyTavern test profile. It creates dummy cards and imports 500 test dossiers; it does not contact a text provider.

Run `npm run test:archive-delete` for NPC/Lore batch deletion, cancellation, failed saves and storage/context guards.

Run `ST_REAL_URL=http://127.0.0.1:18174/ npm run test:archive-menu:real` against a real, isolated SillyTavern test profile, with Playwright Chromium and WebKit available. It imports dummy cards with large archives and tests native touch, focus transitions, batch controls and server saves/reloads.

Run `npm run test:themes` for chat designs and native settings. `npm run preview:chat-designs` rebuilds the production gallery, portable HTML and screenshots; this also needs `esbuild` alongside Playwright (`npm install --no-save --package-lock=false esbuild playwright`).

Run `npm run test:themes` for Original color modes, frame-toggle and per-chat appearance checks. Run `npm run test:presets` for the preset library and blocked-host checks. Provider responses use controlled fixtures; live Proxy model compatibility and Safari on a physical iPhone remain unverified. Historical release results remain in the [development README](docs/archive/README-v0.56.2-development.md).

[Repository audit](docs/repository-audit-v0.56.2.th.md) · [Completed cleanup](docs/repository-cleanup-v0.56.2.th.md) · [Full audited inventory](docs/repository-audit-v0.56.2.json)

## License

[MIT](LICENSE) · Copyright © 2026 DesZiDesu

Loot and mobile item panel fixes in 0.56.3: [Thai diagnosis and validation report](docs/loot-items-fix-v0.56.3.th.md).

Multi-stat consumables and automatic Loot recovery in 0.57.0: [Thai update and validation report](docs/items-loot-v0.57.0.th.md).

Item-granted abilities and per-chat Memory deletion in 0.58.0: [Thai update and validation report](docs/item-learning-memory-v0.58.0.th.md).

Thai purchase routing and missing commerce UI in 0.58.1: [Thai fix and validation report](docs/commerce-pending-v0.58.1.th.md).

Explicit AI fill-offer button in 0.58.2: [Thai usage and validation report](docs/commerce-repair-v0.58.2.th.md).

Commerce API isolation, all-three selection and actionable diagnostics in 0.58.3: [Thai diagnosis and validation report](docs/commerce-api-v0.58.3.th.md).

Cross-system API and Memory cancellation audit in 0.58.4: [Thai audit and validation report](docs/system-audit-v0.58.4.th.md).

Itemized Thai book bundles and gateway-timeout guidance in 0.58.5: [Thai report](docs/commerce-timeout-v0.58.5.th.md).

Complete shop item definitions and validated bundle totals in the normal reply in 0.58.6: [Thai report](docs/same-reply-shop-v0.58.6.th.md).

Skill Storage pagination and automatic categories in 0.58.7: [Thai report](docs/skill-storage-v0.58.7.th.md).

Character Forge horizontal-scroll fix, removed corner ornaments and live theme colors in 0.58.9: [Thai report](docs/character-forge-v0.58.9.th.md).

Character Forge iPhone keyboard focus/viewport fix in 0.58.10: [report](docs/character-forge-v0.58.10.md).

Scene Tracker completeness, AI scene repair and paged Location List with route distances in 0.58.11: [Thai report](docs/scene-locations-v0.58.11.th.md). Run **npm run test:locations** for the production-loader scene/legacy checks.

Memory summary JSON transport, local format recovery and failure diagnostics in 0.58.12: [Thai report](docs/memory-summary-response-v0.58.12.th.md).

Memory API compatibility and Bad Request continuation in 0.58.13: [Thai report](docs/memory-api-compatibility-v0.58.13.th.md).

Downloadable, named MP3 test audio in Voice Addon in 0.58.14: [Thai report](docs/voice-mp3-v0.58.14.th.md).

User-only Dialogue/Narrative/Inner thought UI in 0.58.15: [Thai report and preview](docs/user-chat-v0.58.15.th.md).
