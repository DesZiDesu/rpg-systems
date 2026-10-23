# RoleForge 0.85.3 — Natural dialogue names

RoleForge no longer replaces names inside dialogue or speech with “that person”, “you” or “คนนั้น” because a Known Name record is absent. Narration, thoughts and dialogue keep the words the AI wrote. This applies to the shared SillyTavern renderer, RoleForge rendering and voice preparation, with or without Death Note enabled.

The old renderer treated every missing directed knowledge entry as proof that the speaker did not know the subject. It then substituted names mechanically. A private Light/Ryuk scene could therefore display “Talking to yourself, that person?” even though the original AI message correctly said “Talking to yourself, Ryuk?”. Voice preparation also applied the substitution.

## Behavior

- The shared renderer preserves native host text nodes without applying name substitutions. The RoleForge renderer and speech editor receive the original dialogue blocks.
- The AI instructions distinguish missing NPC knowledge records from established canon/roleplay relationships. Characters can address people they already know naturally. Explicit unknown settings still guide the model's writing.
- Reader knowledge is separate from player-character knowledge. Merely mentioning a name in prose, a header or an NPC-only cutaway does not establish that the player has learned it.
- Death Note's `???` interface labels, Known Name editor, name disclosures, face evidence, Shinigami Eyes and notebook target validation remain in place.
- No saved message is rewritten. Existing replies with intact names display correctly after updating and reloading. If the AI itself already wrote “that person” into the saved reply, this update cannot reconstruct the missing name; that reply would need editing or regeneration.

The change intentionally leaves dialogue wording to the model. An AI can still make a continuity mistake or reveal a name too early; RoleForge no longer tries to repair prose by substituting every occurrence of a name.

## Screenshots and validation

[PC and mobile screenshots](previews/natural-dialogue-v0853/index.html).

The public screenshots use a synthetic scene. The supplied private export was tested separately and its chat text and screenshots are excluded from Git.

1,777 unit tests and the repository syntax check passed. Native SillyTavern 1.19.0 checks passed in Chromium and WebKit at PC (1440 × 1120) and mobile (390 × 844) sizes. Coverage includes all five themes in shared and RoleForge rendering, English/Thai speech drafts, retained unknown identity labels, unchanged knowledge/face state, addon off/on, and private-export replay/reload. The saved original reply was unchanged. Mobile checks use browser emulation, not a physical phone; no live model or audio service was called.
