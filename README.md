# Tretaresia RPG System

A persistent, responsive SillyTavern RPG interface built specifically for the world of Tretaresia. It is a separate extension from Tensei System and can be installed alongside it without sharing settings, chat state, storage keys, prompts, or UI IDs.

## Core features

- One-normal-reply automatic tracking: the extension asks the active role-play model to append a hidden, validated state patch to its normal response. This adds no background generation and no extra API call.
- Optional Manual Sync using one quiet generation when a reply did not provide a patch.
- Per-chat character profile, portrait, independent desktop/mobile framing, HP, Aura/Mana, stamina, condition, race, profession, title, guild, party, level, power type, and Origin skill.
- Tretaresia power mastery for False Magic, True Magic, Aura, Formless Aura, Blood Aura, Sage Mana, Divine Mana, Constructs, and Divine Constructs.
- Extensible custom powers, combat disciplines, acquired skills, and techniques with proficiency and semantic icon presets.
- Tretaresia adventurer ranks: Rookie, Basic, Intermediate, Ember, and individually named Custom Rank.
- Mission, quest, contract, and dungeon records supporting every grade from E- through SS. New tasks are captured as soon as the story offers, assigns, or confirms receipt of them, then updated through accepted, active, progress, completion, failure, or hold states.
- Long-distance journey tracking with origin, destination, road/caravan/sea/off-road route, estimated duration, remaining days, delays, and arrival state. Selecting a destination begins a journey instead of teleporting the scene.
- Region-aware currency ledger with a named local currency and three flexible denominations.
- Scene tracker with time, day, continent, region, exact place, position, weather, extreme temperatures, and AI-assisted multi-floor local maps.
- A completely rebuilt world atlas using the supplied 16:9 Tretaresia artwork, with all six continents, 126 named locations, coordinate-level selection, freeform pins, an exact player-position beacon, and a heading-aware world compass.
- iOS-friendly Canvas tile rendering: four WebP detail levels load only the visible 512 px tiles and visible place labels while zooming or panning, avoiding one enormous SVG scene.
- Broad action-based EXP tracking for studying, learning, training, crafting practice, combat, kills, discoveries, quests, and other genuine growth; level rollover happens when EXP is exactly equal to or greater than the current requirement.
- Main-chat system notifications for EXP, learning, training, combat, kills, level-ups, mission/quest receipt and status changes, and money changes. Every tracked currency notification identifies why money was gained or spent, with configurable event types and auto-dismiss time.
- Inventory, quests, NPC Codex, relationship meters, abilities, revealed stats, private diary entries, contacts, physical letters, and local-device music playlists.
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

## Version 0.5.0

Replaces the extension shell with a complete responsive command-console design: grouped desktop navigation, a mobile module strip below the header, reframed content surfaces, redesigned status/music/notification views, and a bounded control center that can always scroll and close on small screens. Every existing module and interaction remains available. The loading sequence is replaced by a smooth ease-in/ease-out reveal with a single opening color pulse, while automatic new-chat continuity and portable JSON export/import keep the same character across chats.

## License

MIT
