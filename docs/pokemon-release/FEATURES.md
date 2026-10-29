# Features and limits

| Area | First release |
| --- | --- |
| Data | Pinned Gen 1–9 snapshot: 1,025 species, 1,579 form entries. Browsing a form does not unlock its battle transformation. |
| Individuals | Seeded IVs, EVs, Nature, gender, Shiny state and one natural ability. New character registrations have distinct seeds. Legacy stats are preserved. |
| Combat | Adventure-focused singles: damage, type matchups, priority/speed order, PP, basic status/stat changes and supported move effects. Known unsupported special moves are locked. |
| Abilities | Explicit supported set shown in Services → Guide; includes starter boosts, immunities/absorption, Intimidate, Trace, stat and damage modifiers, status protection, contact effects, switching and weather abilities. Other named abilities remain reference-only. |
| Held items | Give/take a single owned item; supported recovery/berries, Choice items, Life Orb, Focus Sash, Rocky Helmet, Eviolite, type boosts and weather rocks. Consumed items really disappear. |
| Weather | Rain, sunlight, sandstorm, hail and snow affect supported battle mechanics. Weather may come from an established player scene, a supported move or an entry ability. |
| Items | 2,222 unique reference entries; 23 balls, supported medicines/berries, stones, matching TM/TR and supported held items have working effects. Catalogue size does not mean every item is usable. |
| Inventory | One Pokémon stock projected into RoleForge and the chatbar. Explicit legacy transfers require a successful server acknowledgement; failed saves roll back. |
| Progression | EXP, levels, compatible level/TM/Tutor learning, common conditional evolution and trade-back evolution with identity/stat preservation. |
| Adventures | Region/biome exploration, generic trainer teams, accepted story NPC challenges with one to six Pokémon, eight Kanto Gyms and accepted rare Pokémon quests. Other regions do not yet have full Gym campaigns. |
| Story sync | Validated event blocks for actual encounters, received items, offered quests, NPC trainer challenges and player-scene weather. Thai names can use `displayName` with stable IDs. Receipt IDs prevent duplicate rewards. |
| Recovery | Safe repair of literal JSON string line breaks and clearly proven player item handovers. Plans, offers, missing evidence and NPC-only encounters are rejected. |
| Persistence | Message-owned journals follow swipes, edits, deletion and branches. Character creation and settings use the current RoleForge integration. |
| Performance | Reference-based change detection, bounded replay checkpoints, suffix invalidation and unchanged-markup reuse. Browsing uses pagination and lazy images. |
| Battle images | Genuine player back views and opponent front views; paired pixel/model GIFs and game WebP animations, static pairs for all 1,579 form entries, exact-form/Shiny/female selection, and graceful placeholders. Motion off/reduced motion stop GIF/WebP too. [Coverage](../pokemon-facing-v0.90.10.md). |
| UI | Square Dossier frames for Original and Aperture, full-width desktop field above its commands, mobile 16:9 field, 20 separate animated background/base layers, compact HP plates, above-chatbar dock, Workshop configuration, TH/EN, equipment and a supported-feature guide. |

## Later releases

Mega Evolution, Terastallization, Dynamax/Gigantamax, breeding, PvP, general NPC-for-Pokémon trading, complete specialized/form evolution, every ability and every competitive move interaction are not simulated in this release. Trade-back evolution is a Center/Link Club service, not a multiplayer trade network. The guide and disabled controls expose these limits.

## Story event example

Visible narration must establish the completed event. Use the same stable receipt when referring to it again:

```html
คุณได้รับอัลตร้าบอล 3 ลูกจากศาสตราจารย์โอ๊ก
<!--roleforge_pokemon:{"version":3,"events":[{"type":"item","item":"ultra-ball","displayName":"อัลตร้าบอล","quantity":3,"receipt":"oak-first-kit","evidence":"คุณได้รับอัลตร้าบอล 3 ลูกจากศาสตราจารย์โอ๊ก"}]}-->
```

The local engine owns captures, damage, level gains and item consumption. The AI should narrate their result and must not award a second copy through RoleForge's generic inventory patches.
