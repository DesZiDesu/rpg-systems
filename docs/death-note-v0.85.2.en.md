# RoleForge 0.85.2 — Names the player already knows

Death Note no longer hides an established family member behind `???` until that person introduces themselves. The same identity is used in chat headers, dialogue labels, NPC Management and the notebook. Existing chats are read again automatically; there is no need to delete messages or repeat introductions.

The underlying issue was two separate knowledge systems: Death Note's player-facing labels checked learned-name events, while RoleForge kept directed Known Name settings separately. Neither supplied established family familiarity to the other. Shinigami Eyes could reveal a true name in red while the ordinary label still read `???`.

## Rules

- Explicit Known Name settings are respected first, including `false`.
- A met NPC with an established close relationship to the player (a parent, sibling, child, grandparent, spouse or longstanding childhood/best friend) is treated as already familiar. English and Thai relationship labels are supported. The NPC also knows the player's name unless explicitly configured otherwise.
- An ordinary acquaintance, classmate, occupation, private biography, high affection score or shared scene does not establish prior name knowledge. Other established relationships can use the existing Known Names editor in NPC Management.
- NPC-to-NPC name knowledge remains directed and explicit. Knowing the player does not reveal everyone the player knows.
- Familiarity supplies the NPC's already-known public name. It does not expose a separate secret true name, reveal an unseen face, grant Shinigami Eyes or change notebook ownership.
- Strangers can still give false names. A later false introduction does not erase an established familiar person's known name.

This is a derived view of the current chat state. It does not rewrite canonical NPC names, add fabricated introduction events or copy future knowledge into earlier branches. Explicit settings and established family data still follow the chat's own saved state.

## Verification

[PC and mobile screenshots](previews/death-note-v0852/index.html).

The supplied private export was replayed using a copy. Its mother NPC was marked `met: true`, relationship `แม่`, with no explicit player Known Name entry. The old ordinary name was `???` despite active Shinigami Eyes. The updated name is the existing canonical public name, with the eye annotation retained.

Screenshots published in this repository use synthetic adult characters. Private chat text and its screenshots are not included in Git.

1,778 unit tests and the repository syntax check passed. Native UI checks passed in Chromium and WebKit at 1440 × 1120 and 390 × 844, covering all five chat themes, manual Known Name overrides, false aliases, face requirements, addon off/on and reload. The supplied private export was imported and replayed in all four runs. These are mobile browser emulation checks, not tests on a physical iPhone. No live model or voice service was called.
