# Main Chat design review: 1–3

This review replaces the earlier round-2/round-3 proposals on the **preview branch only**. The shipped extension and Main branch are unchanged.

| New number | Design | Revised from | Main Chat layout |
| --- | --- | --- | --- |
| 1 | Living Grimoire | 4 | A single bound leaf, square portrait, no magic circle or two-page split |
| 2 | Lotus Scroll | 5 | Scroll rails and an ink seal, square portrait, single text column |
| 3 | Monochrome Folio | 7 | White/black novel typography, square grayscale portrait, no chapter/footer ornament |

The old Novel footer was a decorative scene-end mark. This proposal removes it. Story order is **Header → Narrative → Dialogue → Narrative → Dialogue**, following the actual message. No story content or invented chapter labels are added.

## Viewing the preview

Open `index.html` beside its assets, or open **`standalone.html`** directly. The standalone file includes every screenshot and needs no web server. Select one of three designs, toggle the portrait, and choose the beginning or end of the chat. Both PC and mobile screenshots are shown. `all-three-desktop.png` enlarges the central native chat panel for comparison; the individual desktop screenshots in the gallery retain the complete 1440 px viewport. The screenshots themselves are static; clicking a photographed control does not start an AI request.

Screenshots were captured from a real, isolated **SillyTavern 1.19.0** instance on `127.0.0.1` in the task workspace. They use the supplied reference image, fictional character/chat data, the native SillyTavern Main Chat DOM and message formatter, and RoleForge's shipped renderer, portrait cropper, Scene Tracker and collapsed composer dock. The proposed CSS is loaded last by a local review harness.

The test instance is separate from the user's SillyTavern. It has no user-server connection, chat history or API keys. AI generation is disabled. Offline Horde metadata responses were supplied so the test frontend could initialize; AI/provider compatibility was not tested here.

## What was checked

- Three designs with and without portraits, at 320, 390 and 1440 px in Chromium.
- The real portrait cropper returns a square image; its displayed width and height stay equal.
- All eight combinations of the Header/Narrative/Dialogue switches preserve story text and order. Disabling a frame leaves readable plain text.
- Presentation does not change the raw sample `message.mes`.
- The actual SillyTavern display-only Regex engine can insert a native widget. Switching these proposed styles retains the original widget node, edited input value and bound button listener.
- An iframe inserted after native sanitizing keeps the same document and edited state during theme changes.
- Main Chat has no horizontal overflow caused by these styles. At 320 px the unmodified host toolbar has a 9 px document overflow; the review does not increase it.
- No browser exceptions in the checked paths; the composer dock stays minimized.

`validation.json` records the checks and screenshot metadata. These are browser checks with a sample widget, not a guarantee for every third-party Regex, MVU configuration, physical iPhone or AI proxy.

## Source and release boundary

`main-chat-themes.css` is the proposed styling. `review.js` is a **local test harness**, not an extension installer. It creates fictional data inside the isolated test chat and is never automatically loaded by the extension.

For a release, the approved designs would be added to the supported theme catalog and production CSS with their own stable keys. The review temporarily maps them onto the existing renderer theme keys and applies `data-rf-review-theme` only to RoleForge-owned surfaces. It does not style native drawers or move third-party DOM.

Do not import this harness into an existing play chat. Main will remain unchanged until the user approves the design.
