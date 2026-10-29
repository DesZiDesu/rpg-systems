# Pokémon 1.5.0 · RoleForge 0.90.9

Original and Aperture use the Dossier structure with square frames and detailed corner rules. Both desktop palettes place the command station **below** a field that spans the content frame. The right navigation remains available. Tall desktop viewports use a taller window; smaller viewports can scroll to the controls. Starting battle motion brings the field back into view automatically. Mobile retains a 16:9 battlefield and its bottom navigation.

Compact HP plates stay clear of Pokémon artwork. The Party navigation and battle command use a custom monochrome Poké Ball SVG matching the surrounding icons. All 20 scenery choices split their animated background and standing bases into independent layers. Bases remain fully inside the field; alpha padding in artwork is accounted for when placing each Pokémon. Motion preferences and reduced motion stop the loops. Capture motion hides only HP, keeps commands visible and disabled, and drops its ball onto the opponent's base.

## NPC trainer challenges

Visible story narration can offer a named trainer challenge with its location and actual one-to-six-member team. Review it under **Services → Trainers** and accept at that location. Team balls show the opponent's active and fainted Pokémon. Their next healthy member enters after a defeat. Trainer Pokémon cannot be caught. These challenges do not invent item rewards; progress follows the chat's event journal and branch history.

The AI receives the event protocol and current offers. As with wild encounters, a model must emit a valid, evidence-backed event; a purely prose challenge is not guaranteed to create an offer. For example:

```html
Mira challenges you on Route 1 with Pikachu and Eevee.
<!--roleforge_pokemon:{"version":3,"events":[{"type":"trainer","name":"Mira","place":"Route 1","team":[{"speciesId":25,"level":12},{"speciesId":133,"level":10}],"evidence":"Mira challenges you on Route 1 with Pikachu and Eevee."}]}-->
```

## Update

Update RoleForge from `main` and reload SillyTavern, then update Pokémon to **1.5.0** in Workshop. Existing character preferences and chat progress remain. Runtime imports, styles and replay dependencies use fresh release URLs so an older cached reducer cannot silently ignore the new trainer events.

## Validation

- Pokémon and Workshop unit tests: 121 passed, including package checksums, trainer acceptance, full-team victory and replay deletion.
- Loader and host integration: 241 passed.
- `npm run check` and `git diff --check` passed.
- SillyTavern 1.19.0 browser coverage: desktop and touch/mobile emulation, both palettes, 20 fields and widths 320–1600 px. 108 geometry checks cover 16:9, complete bases, clear HP, full field width and commands below it.
- Motion loops, Motion off, capture HP visibility and locked commands tested. Workshop update and first-partner creation tested in TH/EN.

Mobile verification uses browser emulation, not a physical iPhone. Trainer story messages in automated tests use controlled event fixtures, not a live model response. Screenshot and video artifacts are separate from the installed addon.
