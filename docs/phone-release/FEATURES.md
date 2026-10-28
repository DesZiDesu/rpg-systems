# Aster Phone feature coverage

Release: RoleForge 0.88.3 / Aster Phone 1.1.3. The app artwork uses flat, minimalist original glyphs throughout the home screen, dock and store. Local Lucide SVG controls share one stroke system. Typography uses installed Apple system fonts or bundled Inter and Noto Sans Thai variable fonts. Reply timing is borderless text below the composer.

| Area | Implemented behavior |
| --- | --- |
| Device | Aster One, draggable PC placement, fullscreen touch layout, floating and Wand shortcuts |
| Appearance | Minimal app icons, light/dark themes, wallpaper, English/Thai, reduced motion |
| Workshop | Install, character enable/disable, Configure, character-scoped preferences |
| Identity | Saved contact label, canonical NPC, independent editable app profiles and varied NPC handles |
| Contact creation | Custom number/image/notes/voice; link an existing NPC or create on first interaction |
| Messaging | Immediate or next-turn reply, multi-bubble responses, background generation, drafts, replies, pin/edit own/delete, archive/mute/block |
| Attachments | Uploaded photos with captions, private gallery by default, named stickers and NPC usage cues |
| Calls | Incoming/outgoing, accept/decline/missed/end, mute/speaker state, transcript, main-chat speech |
| Voice | Existing Voice Addon connection, NPC voice/fallback, replay, background listening, lifecycle stop |
| Activity capsule | Message/ringing/connected/background states; configurable effects and notification sound |
| NPC initiative | Confirmed main-scene messages/calls/posts/follows, separate permissions, no unattended polling |
| Gather | Direct/group chats, editable groups and members, media and sticker library |
| Lumen | Image posts/stories, comments, likes/bookmarks, profiles, follows/private requests |
| Murmur | Short posts, comments, reposts, likes/bookmarks, profiles and follows |
| Harbor Store | Install/uninstall optional apps without destroying their saved data |
| Wallet | Configured RoleForge currencies, gift transfers, available-funds checks, receipts and retry IDs |
| Drift | In-world news/search, tabs, favorites, history and fictional sites |
| Night Arcade | Register/login/logout, deposit/withdraw, dice/slots, shared RoleForge wallet and persistent site credits |
| Everyday apps | Notes, uploaded photo gallery, known story locations, detailed settings |
| Persistence | Acknowledged saves, wallet/phone together, reload, branch restoration, chat ownership guards |

## Boundaries

This is an in-world simulation, not a real mobile operating system or complete clone of commercial apps. Drift does not browse arbitrary live websites. Phone messaging, public posts, calls and account activity never contact real people. It does not request real GPS, microphone calling, banking or social credentials.

AI output still depends on the selected model following the supplied phone schema. Invalid events are rejected, and pending user requests can be retried. The engine does not infer image pixels from a text-only caption. The optional voice service requires the user's own existing connection; the showcase uses a local synthetic fixture.

The prototype's extra calendar/camera atlas tiles are artwork only, not claimed as additional shipped apps. Smartphone character creation is not added in this release. Pokémon remains parked in its existing preview worktree.
