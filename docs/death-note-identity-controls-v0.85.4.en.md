# RoleForge 0.85.4 — Learned identities and color controls

Death Note now recognizes an explicit in-character player identification such as “so this is Ryuk” or “I already know Ryuk”, without requiring the NPC to introduce themselves again. Reading a student directory, roster or contact entry can establish the displayed name. A name disclosure and face evidence remain separate.

The supplied chat had two missed facts: a directory entry identifying Light Yagami and a player recognition of Ryuk while touching Light's notebook. The original name detector expected narrower introduction/disclosure wording. An older general news mention of “Kira” had also been attached to Light's hidden identity through his library alias.

Generic alias-only news no longer identifies its hidden bearer. Legacy derived alias events are checked against the visible source during replay; the raw message and journal are retained. Once a full public name has actually been learned, a later codename does not replace it. Kira remains an alias, and false introductions still work for an unknown person. Explicit Known Name settings and already-known family familiarity keep their existing priority.

NPC-only cutaways and a plain name address do not establish player knowledge. Recognition does not grant a face, Shinigami Eyes, notebook possession or ownership. Branch prefixes and changed swipes continue to determine which disclosures exist. The previous update's preservation of natural dialogue and voice text remains in place.

## NPC Management controls

The Header / Dialogue color field now uses a square 44px swatch over the native color input. The platform's picker and normal form events are retained. A shared implementation also covers RoleForge appearance controls, aura color, custom power colors and currency icon colors. The existing Death Note Workshop swatch already has its own square wrapper and is left intact.

The portrait-size range no longer inherits text-field borders and padding. It has a visible rail and rectangular thumb with a 44px interaction area. Color and size edits still use the existing Save character flow.

[PC and mobile screenshots and validation](previews/death-note-v0854/index.html).

Public images use a synthetic adult fixture. The private export and its screenshots are excluded from Git. Browser tests use mobile emulation rather than a physical iPhone; no live model or audio service is used. Native OS color-picker dialogs were not visually captured.

1,788 unit tests and the repository syntax checks passed. Native SillyTavern 1.19.0 checks passed in Chromium and WebKit at PC 1440 × 1120 and mobile 390 × 844 sizes. Tests covered all five chat themes, identity labels in chat and NPC Management, addon off/on, saving/reopening NPC color and portrait size, and the supplied private export with the full bundled character archive. The private replay displays Ryuk and Light Yagami without editing or regenerating the original story.
