# Pokémon 1.0.0 release report

Pokémon 1.0.0 is available on `main`, with RoleForge 0.90.0. It was verified on `release/pokemon-first` before promotion. It combines the parked Pokémon preview with the existing RoleForge 0.89.3 changes, including the current Aster K06 fixes.

## Changes made for the first release

- **Character creation:** the selected starter enters once; an explicit starter kit replaces default stock instead of adding another kit. Choosing no kit stays empty. Registration seeds produce distinct individuals and stay stable on replay. Existing individuals retain their genes and stats.
- **Battle mechanics:** added an explicit supported set of 90 abilities and 45 held items, weather, entry/switch/end-turn effects, item consumption and common trade-back evolution at Centers/Link Clubs. Unsupported special moves stay locked. Temporary effects, including Trace copies, reset on leaving battle. Entry order preserves Intimidate and weather suppression.
- **Story synchronization:** Thai names use stable species/item IDs plus the visible localized name. Evidence and quantities must describe an actual completed player event. Stable receipt IDs prevent repeated gifts. The parser safely recovers the malformed JSON string line breaks seen in a real model reply and accepts a paraphrased item receipt only when the visible text independently proves the exact handover. Plans, NPC-only cutaways and unsupported schemas remain rejected.
- **Inventory:** Pokémon and RoleForge display one Pokémon stock. Reviewed legacy transfers save atomically; failed server saves roll back instead of consuming or copying items. AI is instructed not to award engine-resolved items twice.
- **Persistence and speed:** bounded replay checkpoints reuse unchanged history, invalidate edited/swiped/deleted suffixes and keep branch progress separate. A 2,000-message test processed zero rows on unchanged refresh and one row on append. Character narration/scenery preferences survive new chats while gameplay resets.
- **Interface:** Pokémon-themed desktop/mobile layouts now include equipment and a capability guide, TH/EN labels, missing-artwork fallbacks, accurate release-scope text, correct equip/take journal messages and an explicit empty held-item bag state. Workshop supports enablement, configuration, launchers and optional Pokémon character creation.
- **Narration:** continue without inserting a fake player message, preserve the player's draft and allow the window to close during generation. A narration-path error found during mobile release recording was corrected before the installer checks.
- **Delivery:** importable Thai/English First Journey cards, installation instructions, documented limits, desktop/iPhone screenshots, and two chaptered video showcases with large Thai captions.

## Verification

2,096 unit/host tests passed without failures or skips. The extracted runtime installer passed the complete desktop/mobile SillyTavern flow, including battles, training, equipment, weather, Gym rewards, rare quests, inventory, narration, reload and branch rollback. Separate checks cover creation, failed-save rollback, WebKit, image failures, compact/landscape viewports and existing Aster K06 behavior. See QA.md and the machine-readable reports in the review download.

The videos were recorded in actual SillyTavern with controlled model responses. Touch/mobile captures are browser emulation, not physical iPhone recordings. The final empty-bag styling and scope/journal wording were refined after the long showcase recordings; current screenshots and the separate final UI checks reflect those refinements.

Two live Gemini 3.8 replies were received and both pass the corrected parser. The provider subsequently returned Unauthorized. Remaining live encounter/quest/cutaway/weather scenarios are not claimed as passed live; their controlled ST and deterministic tests passed. No API credential is included in the downloads.

## Scope

Data covers the pinned Gen 1–9 snapshot: 1,025 species, 1,579 form entries and 2,222 unique item entries. Data coverage does not mean every form, item or ability has a simulated effect. This is an adventure-focused singles release. Kanto has eight functional Gyms. Mega/Tera/Dynamax, breeding, PvP, general NPC trading and every competitive interaction remain outside this release. See FEATURES.md and the in-app Guide for the supported set.
