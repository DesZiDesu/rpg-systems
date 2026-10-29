# Pokémon 1.6.0 · RoleForge 0.90.10

The player's Pokémon now uses a genuine back view. Opponents use front views. Battle images are separate from the artwork in the Pokédex, party, starter picker and chatbar dock. Where catalogue artwork is absent or fails to load, those surfaces can now use an exact static front sprite as a fallback. Original and Aperture retain their Dossier layouts, full-width desktop field with commands below, and mobile 16:9 field.

## Selection and coverage

The pinned index selects matching front/back pixel GIF pairs first, then model GIF pairs, then exact paired animated WebP renders from Generation IX games, then an exact static image. Images are loaded on demand rather than downloading the entire sprite library on opening the addon. Sprite dimensions and transparent margins are fitted to each standing base. Back images are not horizontal flips of front artwork.

| Coverage at the bundled sprite revision | Base species | All form entries |
| --- | ---: | ---: |
| Catalogue | 1,025 | 1,579 |
| Paired pixel GIF files | 818 | 1,066 |
| Paired model GIF files | 1,011 | 1,427 |
| Additional paired game WebP files | 14 | 134 |
| At least one animation pair | 1,025 | 1,570 |
| Static front/back pairs | 1,025 | 1,579 |

These are indexed file availability counts. They do not mean that every form or every file is an original official game animation. The pinned PokeAPI mirrors include community pixel sprites and model renders. All 1,579 indexed forms now have standard-color static front/back images. Nine entries use static sprites with gentle idle motion rather than source animation: Arceus Unknown, Spiky-eared Pichu, Pikachu Libre, Gigantamax Venusaur, Blastoise, Rillaboom, Inteleon, and both Gigantamax Urshifu styles. Image download failures still use an explicit placeholder. An ordinary-color image for a Shiny or a flipped front image is not silently substituted. Exact-form metadata is in `src/workshop/pokemon/data/battle-sprites.json`.

Shiny variants and available female variants preserve their identity through the fallback chain. When a GIF fails, the renderer tries the next indexed source and then its correct static direction. Failed URLs are skipped for the lifetime of that addon instance; reloading can retry them. A fully unavailable image uses a placeholder while battle controls and game data remain usable.

Static battle sprites have a subtle breathing loop when Motion is enabled. Motion off and operating-system reduced motion replace GIF/WebP sources with PNGs and stop idle/field CSS motion. Reduced-motion changes apply immediately to an open window. Closing/destroying the addon removes its observers and media listener.

## Additional source audit

The supplied [Pokémon Database gallery](https://pokemondb.net/sprites) and DeviantArt pages were checked. Flabébé Red already has a paired model animation; the four other flower colors were omitted because their catalogue artwork URL was empty, not because their sprites did not exist. Exact canonical filename suffixes now recover all five colors. The supplied [front](https://www.deviantart.com/diegotoon20/art/Flabebe-red-Animated-544276329) and [back](https://www.deviantart.com/diegotoon20/art/Flabebe-red-back-Animated-544296994) by diegotoon20 and [sprite sheet by TheCynicalPoet](https://www.deviantart.com/thecynicalpoet/art/Flabebe-Sprite-659845231) were reviewed as references; no duplicate or signed DeviantArt image URL is required at runtime.

The newer game folders at the same pinned PokeAPI/sprites revision provide the previously missing Koraidon/Miraidon travel forms and Mega Zygarde. Only matching front/back files are admitted. Thirty-six small PNGs (about 1.5 MB total) were extracted from their standard/Shiny WebP first frames so Motion off works locally. Source paths and SHA-256 hashes are in `localStillSources` in the index. Rebuild these with `--build-stills` (Pillow required). Animated model files remain lazy remote downloads and some are several MB.

Forty internal Mothim/Scatterbug/Spewpa origin entries share their documented identical appearance. This is an explicit species allowlist; [Scatterbug/Spewpa forms](https://bulbapedia.bulbagarden.net/wiki/Scatterbug_(Pokémon)#Form_data) determine future Vivillon patterns without changing their current appearance. Vivillon patterns, Wormadam cloaks, Flabébé colors and Unown letters retain distinct sprites. Their game keys and saved data are never changed.

## Update

Update RoleForge from `main`, reload SillyTavern, and update Pokémon to **1.6.0** in Workshop. Existing party data, chat history, character preferences and chosen theme remain intact.

## Validation

- 370 unit/host tests passed, including all 1,025 base species with both static camera directions, exact cosmetic forms, Shiny/female selection, and unavailable-image behavior.
- Browser tests on SillyTavern 1.19.0 cover Original/Aperture, desktop and iPhone-sized touch emulation: pixel GIFs, model GIFs, static idle, Unown B, Flabébé Yellow, Koraidon Gliding, female Shiny, Motion off, live reduced-motion changes, failed animation fallback, total back-image failure, and enabled battle controls after image failure.
- Battle layout and capture-motion regression tests also cover field ratios, HP clearance, command locking and branch rollback.
- `npm run check` and `git diff --check` pass.

Mobile verification is browser emulation, not a physical iPhone. QA uses disposable cards and controlled story events rather than a live model. It does not delete real user chats. Build the availability index with `python tools/build-pokemon-battle-sprites.py`; `--trees-dir` can use cached source path lists for an offline rebuild.

## Desktop and mobile captures

| Theme | Desktop | Mobile (390 × 844) |
| --- | --- | --- |
| Original | [Open](previews/pokemon-facing-sprites/desktop-original-pixel.webp) | [Open](previews/pokemon-facing-sprites/mobile-original-pixel.webp) |
| Aperture | [Open](previews/pokemon-facing-sprites/desktop-classic-dark-pixel.webp) | [Open](previews/pokemon-facing-sprites/mobile-classic-dark-pixel.webp) |

[Flabébé Yellow](previews/pokemon-facing-sprites/mobile-original-flabebe-yellow.webp) · [Koraidon Gliding](previews/pokemon-facing-sprites/desktop-original-koraidon-gliding.webp) · [Modern form with Motion off](previews/pokemon-facing-sprites/mobile-modern-motion-off.webp) · [Validation results](previews/pokemon-facing-sprites/validation.json).
