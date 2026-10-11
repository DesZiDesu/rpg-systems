# The Mage’s Folio · production preview

`index.html` uses the installed RoleForge renderer, chat styles and Voice controls. The outer SillyTavern frame and NPC data are samples. It does not connect to the user's server or make AI/audio requests. `standalone.html` embeds captured production DOM, CSS, square portrait and the licensed preview icon font; its switches work without a server or network.

Choose RoleForge Original or The Mage’s Folio, PC/mobile, character color, badge source, portrait and each frame independently. Profile opens a sample record; Speech draft opens an explanation. Playback remains disabled without a configured Voice account, as in the installed addon.

The badge reads sample `occupation` / `stats.rank`, or the selected ability's `name` / `level`. Installed chats use their NPC facts and save design choices per chat. No magical fields or ranks are fabricated.

Run `node tests/chat-folio.browser.mjs` to verify the production renderer and generate screenshots plus the portable preview under `/tmp/roleforge-chat-folio`. `CHAT_FOLIO_ARTIFACTS` selects another output directory. Validation covers 320/390/768/1280px, both themes, eight frame combinations, three Folio identity colors, text contrast, square portraits, long names, live Voice controls, native widget identity and offline controls. The larger Regex/MVU suites exercise the extension's host integration.

The sample portrait is the user's supplied artwork, cropped by the production portrait helper. Font Awesome Free 6.5.2 license: [FONT-LICENSE.txt](../chat-original/assets/FONT-LICENSE.txt).
