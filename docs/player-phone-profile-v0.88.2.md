# RoleForge 0.88.2 / Aster Phone 1.1.2

## Player name with an existing first message

RoleForge previously returned `Adventurer` in canonical player state unless registration/Character Creation supplied a name. The dashboard had its own persona fallback, so other Status panels, addons and generated context could disagree with it.

Shared state now resolves placeholder names from SillyTavern’s active persona (`name1`) before rendering or generating prompts. The fallback also repairs existing saved placeholder states, including those whose identity bootstrap was already marked complete. Catch-up persists the resolved name without interpreting the bot’s first message or marking Character Creation complete.

A small `onboarding.personaName` marker identifies automatically seeded names. Those follow a later persona change. Explicit names supplied by registration, Character Creation, Status or a character pack remain independent. Registration can override an automatically seeded persona name. Existing stats, inventories, creation preferences and presets are unchanged.

## Aster app profile persistence

Reproduced the old profile loss by editing a profile after a reply, then starting regeneration: the complete earlier phone snapshot restored the older profile. A new ordinary reply retained the profile in the baseline probe. The regression suite also exercises edits saved while an actual new reply is generating.

Timeline restoration now retains manually saved (`locked: true`) app profiles. This includes player display names, handles, bios, status, privacy, avatars/banners and manually customized NPC profiles. NPC profiles are retained only if their contact exists at the target point; a rollback cannot bring back a future contact through its profile.

AI-generated profiles remain reversible. Messages, posts, calls, pending requests, account credits and RPG money continue to follow their selected reply/history. No phone timeline journal is disabled or replaced. Saved profile data remains part of the current chat’s phone data; this does not turn it into a global profile shared by every character. Branch creation still uses its saved branch point.

The main phone prompt includes the player’s configured app names/handles and treats player-saved profiles as authoritative. A profile is still app-specific: changing a Lumen handle does not rename a separate Messages profile or the player’s canonical identity.

## Multiple NPC reference images

The previously previewed six-image NPC reference feature is included in this release. Each temporary reference has an optional look label and a remove control. [Usage and limitations](npc-reference-images.md).

## Verification

- Full unit suite and syntax checks.
- Baseline probe: `Adventurer` before the persona fix; latest profile reverted to its previous value during regeneration before the profile fix. Both corrected by the update.
- Real local SillyTavern, desktop 1920×1080 and mobile 390×844 touch emulation: native normal generation and regeneration with controlled provider responses, saving profiles while a request is pending, preserving text in an unsaved profile editor, all four app profiles, a manually customized NPC profile, and save/reload.
- Existing phone timeline suite: cached A → B → A swipes, repeated events, assistant edits, regeneration, multi-turn deletion, reload, and a wallet save awaiting acknowledgement during a swipe. Financial rollback remains consistent.
- Mobile WebKit verification uses browser emulation; no physical iPhone keyboard/device or paid AI provider was used.

Update RoleForge and reload SillyTavern. Workshop offers Aster Phone 1.1.2; existing enabled installations use the updated native runtime with RoleForge 0.88.2.
