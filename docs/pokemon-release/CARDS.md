# Pokémon RPG — world card editions

Import one **PNG** into SillyTavern: each contains the supplied cover, character data and a compressed RoleForge World Pack. The matching JSON files contain the same roleplay data without a card portrait. Update RoleForge to **0.90.1** and install Pokémon **1.0.0** in Workshop.

| Edition | Language | Opening |
| --- | --- | --- |
| [Red Sunken Sun](Pokemon-Sunken-Red-Sun.th.png) | Thai | Six RoleForge-formatted openings |
| [Dawn Midnights](Pokemon-Dawn-Midnights.en.png) | English | Six RoleForge-formatted openings |
| [Sun & Dawn](Pokemon-Sun-and-Dawn.png) | Your chosen creation/settings language | No first message; opens Pokémon Character Creation |

Use SillyTavern's greeting arrows before sending a message to select any of the six openings. Each uses RoleForge header, narrative and dialogue blocks. The sixth is an optional introductory cutaway: Gazette appears in Red Sunken Sun and Alfmorii in Dawn Midnights, followed by a scene at Oak's laboratory. The cutaway does not automatically make the player meet them. The player chooses what to do, and is not assigned a partner or dialogue.

The named editions start with five Poké Balls and two Potions. Sun & Dawn starts with no greeting, party or items and lets Pokémon Character Creation choose the opening, partner and kit. The addon creator can be toggled in Workshop. Your usual SillyTavern API generates new narration.

## World archive

Each card contains **3,415 indexed character and Pokémon references**, **798 alternate profiles**, and **186 grouped lore entries**. The snapshot draws on game and animation source lists and is searchable by series: search `Ruby` in NPC Management or `[Ruby]` in Lore Management. It includes core world summaries and source-group lists. Many minor entries are deliberately brief: this is a broad reference index, not a claim that every character, episode, full biography or game mechanic in the franchise has been catalogued. Some source lists group characters by the title in which they first appeared. Later or unreleased titles are identified as such.

Every reference has a distinct color and a Poké Ball PNG icon. Gazette and Alfmorii have editable original profiles and portraits based on the user-supplied covers. Their unnamed legendary companions have separate **narrative references** only. No unapproved species name, type, stats, moves or abilities have been invented or added to the Pokémon addon. A playable custom species can be added later once its artwork and details are supplied.

All three cards use the regular RoleForge currency ledger, configured as **Poké Dollars (₽)** with a starting balance of **₽3,000**. The currency scheme and amount can be edited through RoleForge. No conversion to other Pokémon currencies is assumed.

The embedded library installs automatically in the browser when the card is opened; first import takes longer than subsequent opens. NPC and lore records are editable in management. If you edit the library and want the changes to travel with the card, use RoleForge's World Pack **Update embedded archive** or **Export self-contained card** before exporting.

## Sources and files

The frozen source index and original summaries are in `cards/pokemon-rpg/data/`. Game names/groups draw on [Bulbapedia's game character list](https://bulbapedia.bulbagarden.net/wiki/Game_characters), animation names/groups on [its animated character index](https://bulbapedia.bulbagarden.net/wiki/List_of_animated_series_characters), and an additional [character index](https://tltcg.com/characters); the summaries are not copied biographies. Pokémon and its character artwork belong to their respective rights holders. The Poké Ball sprite is bundled from the game's sprite collection mirrored by PokeAPI; see [asset credits](../../src/workshop/pokemon/CREDITS.md). All three cover images were supplied by the user. Edition names and the two original trainers are not official Pokémon releases.

The historical filenames `Pokemon-Sunken-Red-Sun.th.*` and `Pokemon-First-Journey.th/en.json` remain compatible with existing links. Import just one PNG or its corresponding JSON, not both. [Four NovelAI V5 design prompts](../../cards/pokemon-rpg/NovelAI-5-Pokemon-Prompts.md) are provided for the two original legendary designs.

To rebuild or validate:

```sh
node cards/pokemon-rpg/tools/build-world.mjs
node tools/build-pokemon-edition-cards.mjs --check
```

The frozen source snapshot makes the rebuild independent of network access. The checker validates embedded metadata, image integrity and all twelve formatted openings. Browser tests require a disposable SillyTavern profile.
