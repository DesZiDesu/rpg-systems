# RoleForge

**Public release: 0.67.1** · An RPG extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern) · English and Thai · Desktop and mobile

[คู่มือภาษาไทย](docs/getting-started.th.md) · [UI screenshots](docs/previews/commerce-stock-v0562/index.html) · [Development history](docs/archive/README-v0.56.2-development.md)

RoleForge brings an RPG workspace into your SillyTavern chat. Track your character, inventory, powers, skills, techniques, NPCs and the current scene while role-playing normally. Optional systems add shops, auctions, mission and recruitment boards, memory summaries and ElevenLabs voices.

The extension adds instructions for enabled systems to your existing text-generation connection and reads structured updates from completed AI replies. You do not need to write JSON yourself. The model still determines the story and must supply readable data for trackers to update.

## Character and Lore management

**New in 0.66.0:** find disabled NPCs or Lore with counted **All / Enabled / Disabled** filters, then toggle them directly from each row. Disabled records have a dashed border, muted styling and an explicit label. Select several records, the current page or all filtered results across pages; enable/disable them together and undo the latest status change. Each page contains 20 records, and changing pages keeps your selection.

The list fills the mobile window with one scrolling area. Page controls and batch actions stay below it; secondary tools, imports and scope settings live in the top **⋯** menu. NPC Chat/Character scope and character-card Lore storage stay the same. Bulk changes preserve profile data and use the existing Lore budget checks. Browsing and toggling do not call AI. [Mobile / PC preview](docs/previews/archive-qol/index.html) · [Offline preview](docs/previews/archive-qol/standalone.html) · [Thai guide](docs/archive-qol-v0.66.0.th.md).

**Added in 0.66.1:** Lore storage defaults to **Unlimited entries**. Set an optional maximum in **Lore Management → ⋯ → Lore storage & delivery**. Lowering it keeps existing records readable/editable and only blocks further growth. This setting follows chat/world presets and one-card setup; Import/Export and card reload keep entries beyond the former 200-record ceiling. Large exports offer numbered files within the existing 12 MB import limit. AI delivery still uses its separate mode and context budget; choose Relevant for large worlds. [Lore capacity guide](docs/lore-capacity-v0.66.1.th.md) · [Mobile settings preview](docs/previews/lore-capacity/settings-390.png).

**Added in 0.66.2:** select NPCs or Lore across pages, then choose **⋯ → Delete selected** in the bottom selection bar. Confirmation identifies the count and destination. NPC deletion uses the chosen Chat/Character scope; Lore deletion affects the current card’s shared archive. Unselected records, other scope copies, portraits and chat messages are kept. Failed saves retain selection for retry; Undo still restores enabled states, and deleting records clears the prior Undo action. [Bulk deletion guide](docs/archive-delete-v0.66.2.th.md) · [Mobile menu preview](docs/previews/archive-delete/npc-menu-390.png).

## Chat designs

**Extensions → RoleForge → Chat appearance & NPCs** offers **RoleForge Original** and **The Mage’s Folio**. Folio has a right-hand square portrait, book-style nameplate, real NPC badge, rounded speech slip and a pen signature. Each speaker’s identity color tints their Header and Dialogue; red characters use red accents and a dark red speech frame with readable light text. The badge can show occupation + overall NPC rank, or a selected skill + its mastery level. Missing facts are hidden, and nonmagic settings work too.

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

**Added in 0.59.0:** train HP/MP/ST maximums and numeric stats from the main chat, configure custom stats and 1–3 currency units, and use animated 8-bit money icons. Status and Training default to **C / Tactical Strip**, with A and B retained as separate selectable layouts in **Extensions → RoleForge → User stats**. All composer windows start minimized on chat entry. [Update notes and screenshots](docs/stats-currency-v0.59.0.th.md).

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

Version **0.67.1** passes **1,235 unit/host tests** and syntax checks. Browser checks verify five portrait designs at 48/72/144px on 320/390/768/1280px screens, the production NPC editor, late-loaded legacy CSS, player Markdown and native widget preservation. Full theme, Regex/MVU, player lifecycle and current/legacy startup checks pass. [Validation record](docs/validation-chat-fixes-v0.67.1.json).

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

Run `npm run test:lore-capacity` for large Lore libraries, capacity settings, chunked exports and one-card round trips.

Run `npm run test:archive-delete` for NPC/Lore batch deletion, cancellation, failed saves and storage/context guards.

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
