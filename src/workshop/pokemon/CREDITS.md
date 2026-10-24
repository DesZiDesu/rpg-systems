# Pokémon data and artwork

Fan-made RoleForge addon preview. No affiliation with Nintendo, Game Freak or The Pokémon Company.

- Data: [PokeAPI](https://github.com/PokeAPI/pokeapi), BSD-3-Clause. Pinned commits and coverage are in `data/source.json`.
- Art and sprites distributed by [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Pokémon and associated artwork belong to their respective owners.
- The catalogue reflects this data snapshot. It does not claim content absent from that source or a full competitive battle simulator.
- Most artwork loads on demand from the pinned public sprite repository. Starter and showcase images are local. Unavailable exact form images remain unavailable rather than silently showing a different form.
- Battle field and its floor platforms: original Pokémon FireRed grass terrain, decoded from the pinned [pret/pokefirered](https://github.com/pret/pokefirered) tilemap and palettes. Item sprites: original game sprites mirrored by PokeAPI/sprites. These community repositories are not official hosting. Source URLs, pinned revisions and SHA-256 checksums are in `data/game-assets.json`; rebuild with `python tools/build-pokemon-game-assets.py` (Pillow required).
