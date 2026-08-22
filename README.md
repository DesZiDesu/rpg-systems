# Tretaresia RPG System

A persistent, responsive SillyTavern RPG interface built specifically for the world of Tretaresia. It is a separate extension from Tensei System and can be installed alongside it without sharing settings, chat state, storage keys, prompts, or UI IDs.

## Core features

- One-normal-reply automatic tracking: the extension asks the active role-play model to append a hidden, validated state patch to its normal response. This adds no background generation and no extra API call.
- Optional Manual Sync using one quiet generation when a reply did not provide a patch.
- Per-chat character profile, portrait, independent desktop/mobile framing, HP, Aura/Mana, stamina, condition, race, profession, title, guild, party, level, power type, and Origin skill.
- Tretaresia power mastery for False Magic, True Magic, Aura, Formless Aura, Blood Aura, Sage Mana, Divine Mana, Constructs, and Divine Constructs.
- Extensible custom powers, combat disciplines, acquired skills, and techniques with proficiency and semantic icon presets.
- Tretaresia adventurer ranks: Rookie, Basic, Intermediate, Ember, and individually named Custom Rank.
- Dungeon records supporting every grade from E- through SS.
- Long-distance journey tracking with origin, destination, road/caravan/sea/off-road route, estimated duration, remaining days, delays, and arrival state. Selecting a destination begins a journey instead of teleporting the scene.
- Region-aware currency ledger with a named local currency and three flexible denominations.
- Scene tracker with time, day, continent, region, exact place, position, weather, extreme temperatures, and AI-assisted multi-floor local maps.
- Interactive atlas for all six continents and key Tretaresia landmarks.
- Inventory, quests, NPC Codex, relationship meters, abilities, revealed stats, private diary entries, contacts, physical letters, and local-device music playlists.
- English and Thai interface/action support, hidden/visible/draft action delivery, mobile safe-area layout, touch controls, and configurable appearance.

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

## Version 0.1.0

Initial Tretaresia-native release, based on the proven interaction and persistence architecture of Tensei System but isolated under a new extension namespace and redesigned for Tretaresia's world, progression, powers, ranks, dungeons, currencies, and travel.

## License

MIT
