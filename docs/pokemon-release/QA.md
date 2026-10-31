# First-release verification

## Passing checks

- **2,096 unit/host tests**, no failures or skips; JavaScript syntax checks and diff whitespace checks pass.
- Real SillyTavern 1.19.0 on Chromium desktop/mobile and WebKit desktop/mobile: individual stats, inventory transfers, medicines, Master Ball, Center gating, training, trainer/Gym battles, quests, equipment, story weather, trade-back evolution, reload, branch recovery and TH/EN.
- Character creation on desktop/mobile: deleting the greeting opens the appropriate creator, custom selectors work, opt-out/drafts remain intact, one chosen starter and the exact standard kit enter the engine, and the two-addon chooser works.
- Shared-inventory fault injection: an HTTP failure rolls back both the journal and generic inventory; the retry succeeds without duplication. Disable/re-enable hides/restores the shared stock.
- Aster K06 regression on the combined build: mobile handset fit, bare close control, scrolling, pickers, contact saving, keyboard viewport handling and fold/open pass.
- Mobile sizes 320 × 568, 390 × 844, 430 × 932 and 844 × 390: no horizontal overflow in the equipment screen. Missing artwork falls back without breaking the page.
- A synthetic **2,000-message** ST conversation: unchanged refresh processes zero replay rows; an appended message processes one. Only 16 checkpoints are retained. Editing/deleting the synthetic suffix returns exactly to the original game state.
- Character narration/scenery preferences survive a new chat while party/progression reset for the new chat.
- The actual extracted installer ZIP runs in a separate ST profile and passes the complete desktop/mobile gameplay/narration/reload/branch flow, plus long-chat, artwork, viewport and character-preference checks.
- Updated world cards: desktop/mobile import all three PNG cards, retain the embedded data and portraits, render all twelve authored openings with RoleForge blocks through native greeting swipes, and complete Sun & Dawn's blank-chat Pokémon creator with the selected region, partner, exact kit and ₽3,000 wallet. The creator response is controlled, not a live-model test. `node tools/build-pokemon-edition-cards.mjs --check` verifies PNG CRCs, embedded JSON and opening structure; packaging compares the supplied cover pixels exactly.
- World archive: the embedded library auto-installs in real SillyTavern on desktop and mobile, presents 2,857 references with distinct colors and Poké Ball icons and 186 grouped lore entries, and filters NPC and Lore records by `Ruby`. Both original profiles open, the opening's Professor Oak uses his Poké Ball icon, and the initial wallet displays 3,000. After reload and reselecting the card, the installed archive is reused. Focused archive, currency, Workshop and hidden-name checks (39 tests), identity/World Pack checks (60 tests, overlapping), and `npm run check` pass on RoleForge 0.90.2. These results concern the indexed references and supported mechanics; they are not an exhaustive canon verification.

Timing is environment-dependent: the source-profile performance run initially took about 57 ms; ten unchanged refreshes took about 177 ms total. See the delivered machine-readable reports for each run's measurements.

## Live model findings

Two real Gemini 3.8 responses were received, in English and Thai. The English response exposed literal line breaks inside JSON keys and receipt evidence that paraphrased the visible handover. The parser now safely repairs those JSON control characters and recovers only a visibly proven player-directed item handover. Both captured responses pass replay through the corrected parser. Regression tests reject hypothetical/NPC handovers, mismatched quantities, missing receipts, malformed schemas and unproven weather.

The provider subsequently returned **Unauthorized**, so the remaining live encounter, quest, cutaway and weather scenarios are **not claimed as passed live**. Those paths passed deterministic engine and controlled ST tests. The optional live test is `tests/pokemon-live.real.browser.mjs`; it uses the selected ST API secret, not a bundled credential. The temporary live-provider profile and helper were removed before packaging.

## Test limits

The ST interaction tests and showcase narration use controlled local model responses except the two explicitly identified live samples. Mobile captures use browser touch emulation; they are not physical iPhone recordings. WebKit recorded a host ResizeObserver warning without failed behavioral assertions. The game is adventure-focused singles, not a complete competitive Pokémon simulator; see FEATURES.md.

## Useful commands

```sh
npm test
npm run check
npm run test:pokemon:release
ST_REAL_URL=http://127.0.0.1:8000 node tests/pokemon-v2.real.browser.mjs
ST_REAL_URL=http://127.0.0.1:8000 node tests/pokemon-performance.real.browser.mjs
```

Run browser tests only in a disposable ST profile: they import synthetic cards and create test conversations.
