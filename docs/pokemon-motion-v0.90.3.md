# Pokémon 1.1.0 — battle motion

RoleForge 0.90.3 adds a presentation layer for saved Pokémon outcomes. Update RoleForge, reload SillyTavern, then update Pokémon to 1.1.0 in Workshop. Existing game journals remain compatible.

The scenes cover encounter entry, ball throws, failed captures, successful captures, victory, defeat and leaving a wild encounter. They use the actual Pokémon, selected ball and current battle scenery. A catch animation runs only after the chat save succeeds. Skipping changes no inventory, party, HP or rewards. A failed save restores the original action journal and shows no scene.

Desktop uses a centered scene above the Pokémon interface. Mobile uses the available viewport. The top control skips the scene; Escape also dismisses it. Pokémon Settings → Battle animations stores an on/off preference for the character, shared by its chats. The operating system's reduced-motion preference skips playback. Swipes, edits, deletion, card/chat changes, disabling the addon and disposal cancel playback. Reloading or restoring a swipe does not replay historical captures. Scenes require a visible Pokémon window or dock.

Artwork is taken from the same sources as the addon. Missing Pokémon artwork has a neutral fallback; unavailable ball artwork falls back to the ordinary Poké Ball. Motion uses CSS transforms and bounded timers, with no video download or AI request. It currently has no additional audio. Ball shakes are a visual sequence for the committed result; the engine does not expose an individual canonical shake roll.

## Suggested next effects

These are recommendations, not features included in this update:

- Attack wind-up, contact and type-colored impact, with restrained cues for critical hits, misses and type effectiveness.
- Fainting, recall and switching Pokémon, including the opponent sending out its next trainer-team member.
- EXP gain and level-up, learning a move, and a dedicated evolution sequence that preserves the actual evolved individual.
- Rare or Shiny encounter reveals, using the individual's actual recorded form and Shiny state.
- Pokémon Center restoration, Gym Badge awards and rewards, and a brief transfer-to-storage confirmation when a catch goes to a full team's box.
- Light weather and status effects, with clear settings to limit persistent movement.

The highest-value next additions are attack feedback, faint/switch sequences, and evolution/level-up. They make existing outcomes easier to read. Decorative ambient effects can follow later.

## Verification

The real-host browser test uses a disposable SillyTavern 1.19.0 profile and the actual reducer/save endpoints on desktop and mobile touch emulation. The scenarios cover encounter entry, failed capture, Master Ball success, battle end, skip, persistent settings, save failure, swipe cancellation and reduced motion. No model or voice provider is called. Mobile recordings are browser emulation, not recordings from a physical iPhone.

```sh
node --test tests/pokemon-motion.test.mjs tests/pokemon.test.mjs tests/pokemon-release.test.mjs tests/pokemon-persistence.test.mjs tests/workshop.test.mjs
ST_REAL_URL=http://127.0.0.1:18403 node tests/pokemon-motion.real.browser.mjs
```
