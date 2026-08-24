# Tretaresia RPG System

A persistent, responsive SillyTavern RPG interface built specifically for the world of Tretaresia. It is a separate extension from Tensei System and can be installed alongside it without sharing settings, chat state, storage keys, prompts, or UI IDs.

**Current version: 0.12.0**

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
- Region-aware currency ledger with a named local currency and three flexible denominations.
- Scene tracker with time, day, continent, region, exact place, position, weather, extreme temperatures, and AI-assisted multi-floor local maps.
- A huge image-tile world atlas using the supplied fantasy map, with all six continents, 126 named locations, coordinate-level selection, bounded pan/zoom, freeform pins, an exact player-position beacon, and a dedicated fullscreen viewer.
- iOS-friendly Canvas tile rendering: four WebP detail levels load only the visible 512 px tiles and visible place labels while zooming or panning, avoiding one enormous SVG scene.
- Broad action-based EXP tracking for studying, learning, training, crafting practice, combat, kills, discoveries, quests, and other genuine growth; level rollover happens when EXP is exactly equal to or greater than the current requirement.
- Main-chat system notifications for EXP, learning, training, combat, kills, level-ups, mission/quest receipt and status changes, and money changes. Every tracked currency notification identifies why money was gained or spent, with configurable event types and auto-dismiss time.
- Inventory, quests, NPC Codex, relationship meters, abilities, revealed stats, private diary entries, contacts, physical letters, and local-device music playlists.
- Friendly-only NPC Codex plus per-chat Party, paid Guild, and Household rosters. Parties are free; creating a Guild costs 10 Gold; Household members can be assigned roles such as partner, spouse, child, parent, sibling, or guardian.
- Automatic social roster updates from confirmed role-play outcomes, including joins, departures, invitations, dissolutions, and family changes without requiring UI buttons.
- Character Life compatibility: exact NPC links reuse Character Life portraits and framing, Character Life skills appear in RPG skill views, and RPG-tracked skills sync back to Skill Storage without an extra model request.
- English and Thai interface/action support, hidden/visible/draft action delivery, mobile safe-area layout, touch controls, and configurable appearance.
- Automatic same-character continuity when starting a new chat, including same-device copying for locally stored NPC portraits and music.
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
- The World Map can show tappable NPC markers, Party members follow the player unless separated by the story, and all NPC markers have a master visibility control.
- The zero-extra-call tracking prompt advances plausible off-screen NPC routines when world time changes while respecting occupation, distance, duties, danger, relationships, and paused/story-only modes.

## Version 0.9.1

- Compact full-feature tracking protocol and relevance-prioritized state payload.
- Extension-started request counter and duplicate Manual Sync protection.

## Version 0.9.0

Adds the social systems layer: friendly NPC filtering, Party create/invite/dissolve, Guild create/invite/dissolve with a 10 Gold creation fee, three-denomination currency display, and a Household family roster. Hostile NPCs remain story encounters but are excluded from the visible NPC Codex and social invitation lists.

## Version 0.8.0

Replaces the former map artwork with the supplied 4:3 fantasy atlas and a new 4096×3072 tile pyramid. All 126 travel destinations are hand-positioned on visible land or islands and appear progressively across world, regional, and local zoom levels. Panning is clamped to the atlas edges, the compass has been removed, and the map now includes an iOS-friendly fullscreen viewer with an X close button and Escape support.

The control center is mounted outside the transformed application panel so its settings dialog displays reliably on iOS Safari instead of being clipped behind the interface.

## License

MIT
