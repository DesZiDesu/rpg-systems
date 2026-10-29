# Pokémon data and artwork

Fan-made RoleForge addon preview. No affiliation with Nintendo, Game Freak or The Pokémon Company.

- Data: [PokeAPI](https://github.com/PokeAPI/pokeapi), BSD-3-Clause. Pinned commits and coverage are in `data/source.json`.
- Art and sprites distributed by [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Pokémon and associated artwork belong to their respective owners.
- The catalogue reflects this data snapshot. It does not claim content absent from that source or a full competitive battle simulator.
- Most artwork loads on demand from the pinned public sprite repository. Starter and showcase images are local. Unavailable exact form images remain unavailable rather than silently showing a different form.
- Battle field and its floor platforms: 20 original Pokémon FireRed terrain/palette combinations (outdoor, indoor, Gym, Gym Leader, Elite Four and Champion), decoded from the pinned [pret/pokefirered](https://github.com/pret/pokefirered) tilemap and palettes. Item sprites: original game sprites mirrored by PokeAPI/sprites. These community repositories are not official hosting. Source URLs, pinned revisions and SHA-256 checksums are in `data/game-assets.json`; rebuild with `python tools/build-pokemon-game-assets.py` (Pillow required).

Legendary/Mythical portrait reference: 94 unique species, based on the bundled PokeAPI flags. Original Pokémon artwork is mirrored by the pinned PokeAPI/sprites repository; image URLs and SHA-256 hashes are recorded in `docs/pokemon-preview/reference-art.json`.

Expansion 0.2.0: item catalogue (2,223 records), training, gender ratios, EV yields, move metadata, machines and regional Pokédex memberships use the same pinned PokeAPI commit. Rebuild with `tools/build-pokemon-expansion-data.py`. Game sprite bundle now includes 59 items. Four local original Shiny portraits and their checksums are listed in `data/shiny-art.json`; other exact Shiny images load on demand from the pinned mirror.

First-release contact, punch, bite, sound and powder move flags come from `move_flag_map.csv` and `move_flags.csv` at the same pinned PokeAPI commit `2bf639e5572812a67d2b94903fdcb9d095f5aeb2`, under the bundled PokeAPI license. `move-flags.js` stores only these derived identifier sets.

Field layers: `assets/battle/layers/` separates the decoded FireRed fields above into reconstructed horizontal background bands and transparent player/opponent bases. The original combined files are retained. Layer extraction is reproducible with `tools/build-pokemon-field-layers.py`; loop movement is implemented by CSS rather than claiming original animated game footage.
