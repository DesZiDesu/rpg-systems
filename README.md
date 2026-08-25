# Tretaresia RPG System

A persistent, responsive SillyTavern RPG interface built specifically for the world of Tretaresia. It is a separate extension from Tensei System and can be installed alongside it without sharing settings, chat state, storage keys, prompts, or UI IDs.

**Current version: 0.17.0**

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
- Portable JSON state export/import from the interface header. Player state and the embedded player portrait travel with the file; device-only NPC media stays local.

## Tretaresia-aware behavior

The injected rules preserve the setting's power-sensing restrictions, the rarity and secrecy of Formless Aura and Divine Mana, the difference between False and True Magic, vampire power mutation, Sage Mana, Constructs, regional currencies, the full dungeon scale, enormous travel distances, and the six-continent geography. The tracker records only outcomes supported by the story and will not reveal a hidden power merely because an observer is nearby.

## API and privacy

Tretaresia RPG uses SillyTavern's active provider and selected model. It never requests or stores a separate API key. Automatic tracking shares the normal character response, so there is no second quota-consuming request. Portraits and music remain local to the device and are excluded from prompts.

## Install

1. Open **Extensions** in SillyTavern.
2. Select **Install extension**.
3. Paste `https://github.com/DesZiDesu/rpg-systems`.
4. Reload SillyTavern if prompted.

Open it through **Extensions → Tretaresia RPG** or the wand menu.

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
