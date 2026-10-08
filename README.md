# RoleForge

**Public release: 0.61.0** · An RPG extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern) · English and Thai · Desktop and mobile

[คู่มือภาษาไทย](docs/getting-started.th.md) · [UI screenshots](docs/previews/commerce-stock-v0562/index.html) · [Development history](docs/archive/README-v0.56.2-development.md)

RoleForge brings an RPG workspace into your SillyTavern chat. Track your character, inventory, powers, skills, techniques, NPCs and the current scene while role-playing normally. Optional systems add shops, auctions, mission and recruitment boards, memory summaries and ElevenLabs voices.

The extension adds instructions for enabled systems to your existing text-generation connection and reads structured updates from completed AI replies. You do not need to write JSON yourself. The model still determines the story and must supply readable data for trackers to update.

## Install

1. Open **Extensions → Install extension** in SillyTavern.
2. Paste **https://github.com/DesZiDesu/rpg-systems**.
3. Install from **main**, then reload SillyTavern.
4. Open **Extensions → RoleForge** to choose your language and settings. Use the RoleForge launcher to open the RPG workspace.

Keep the installation folder named **third-party/rpg-systems**. No build step, npm installation or ElevenLabs account is required to use the RPG features.

Use a current SillyTavern installation with extension support and a connected text-generation model. The project has not established a minimum SillyTavern version; browser checks exercise the extension APIs with a controlled host. A recent desktop or mobile browser is recommended.

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

The extension runs directly from **manifest.json** and **loader.js**. Runtime modules are in **src/**, styles in **styles/**, and settings/Character Forge templates in **templates/**. Small CSS files at the repository root support cached older loaders and must remain.

Node.js **24** is the tested development environment. Unit/host tests use Node's built-in runner:

    npm run check
    npm test

Browser tests also need Playwright and Chromium:

    npm install --no-save --package-lock=false playwright
    npx playwright install chromium
    node tests/startup.browser.mjs

For suites that expect system Chromium, set **CHROMIUM_EXECUTABLE** to your browser's absolute path. **npm run test:commerce-stock** covers both historical unknown-stock purchases and current AI-stock selection.

Version **0.60.0** has **1,162 passing unit/host tests** and syntax checks. Shared rendering is tested at 320/390/1280px with the actual pinned SillyTavern Regex engine, MessageFormatter, Markdown and sanitizer pipeline in a controlled host. Browser checks cover native widgets/listeners, tables, links, source/display rules, user-only shorthand, Voice, edit/swipe/reparenting, settings and composer windows. Broader regression checks cover items/Loot, commerce, Character Forge, skill storage, scenes, stats/currency and memory. [Compatibility and validation report](docs/regex-shared-v0.60.0.th.md).

Run `npm run test:regex` for the focused compatibility suites. The shared suite downloads pinned upstream test dependencies with `curl` into a temporary cache; `ST_REGEX_CACHE` can point to a prepared cache. This does not install runtime dependencies or change SillyTavern.

Provider responses use controlled fixtures; live Proxy model compatibility and Safari on a physical iPhone remain unverified. All 20 release browser suites pass, including combined commerce and inn flows. Legacy fixtures now use explicit trade intent, real next-user generation and minimized panels; their outdated expectations were compared with unchanged 0.58.15. Historical results remain in the [development README](docs/archive/README-v0.56.2-development.md).

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
