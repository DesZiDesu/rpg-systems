# Aster Phone 1.1.1 — RoleForge 0.88.1

The phone uses a quieter native-style visual system, with consistent typography, controls and app surfaces. Existing phone progress, configuration and the timeline restoration fixes from 0.88.0 remain compatible; no phone-state migration is required. Update RoleForge, reload SillyTavern and install the Aster 1.1.1 package offered in Workshop.

## Typography and controls

Installed Apple system fonts are preferred on Apple devices. Other devices use locally bundled Inter Variable, with Noto Sans Thai Variable for Thai characters. The previous bundled regular-only fonts required synthesized bold text. The replacement fonts contain real weight variation; the phone disables synthetic weights, uses tabular figures for time/money and avoids tight tracking on Thai headings. Font licenses and sources are included in the asset directory.

Control icons use locally bundled Lucide SVG geometry on a consistent 24-pixel grid and stroke weight. The approved original app artwork remains on the home screen, dock and store. No external font or icon request is needed at runtime.

The reply timing control below the message composer is now plain text and a small chevron, with no border, pill, background or shadow. It still opens the two existing timing choices: request a reply immediately, or include it with the next story response. The pending-message “Reply now” shortcut also remains available.

## Layout and surfaces

- Messages/Gather: a clear large title, profile shortcut, simple underline filters, search and readable conversation rows. Removed the promotional introduction above the inbox.
- Conversations: smaller contact heading, neutral incoming bubbles, blue outgoing bubbles, balanced spacing and readable timestamps. The stable auto-growing composer is retained.
- Home: a restrained blue-gray wallpaper, a real variable-font clock and quieter widgets. Removed the introductory slogan.
- Lumen/Murmur: feed content starts without a promotional hero; profile access moves into the header. Shared icon sizes, post spacing and action treatment.
- Harbor: a shorter feature panel, readable light/dark text and aligned app actions.
- Wallet/Drift/settings/editing sheets: consistent text hierarchy, hairlines, fields, action colors and surfaces. Wallet figures use tabular numerals.
- Desktop: a matte device frame remains draggable. Mobile: the phone screen fills its viewport with no inset screen corners. Existing visual-viewport and compact-height handling remain.
- Motion: subtle opacity feedback replaces scaling on tap. Existing app transitions, notifications and connected-call animation respect the motion and system reduced-motion settings.

## Verification

`npm test` passes 1,931 tests. `npm run check` passes, including the new icon module. Catalog package size and SHA-256 are validated by the existing Workshop tests.

The native SillyTavern browser suite checks desktop 1920×1080 and mobile 390×844, plus widths from 320 to 430 pixels, light/dark Store contrast, actual borderless reply-control styles, local font loading, stable drafts/cursor, unchanged/hidden refreshes, 1,000-message history paging, reading position, viewport changes and motion preferences. WebKit is tested with mobile touch emulation. These are browser emulation tests, not a physical iPhone keyboard/device test.

The full phone walkthrough exercises messaging modes, multiple incoming bubbles, background replies, custom contacts, calls and optional Voice integration, social profiles, groups, uploads, stickers, wallet transactions, blocked contacts, persistence and branch restoration. Model/voice responses use controlled local fixtures rather than a paid remote provider.

The original timeline diagnosis and recovery limits are documented in [the 0.88.0 report](aster-v0.88.0.md).
