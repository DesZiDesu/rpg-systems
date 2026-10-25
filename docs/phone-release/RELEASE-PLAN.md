# Aster phone release preview

Branch: preview/aster-phone-release, based on main 0.86.2. Preserve the parked smartphone prototype and Pokémon preview. Do not merge main until reviewed.

## Delivery

- Native Workshop-installable smartphone package, character-scoped preferences, chat/branch-scoped phone state, acknowledged atomic wallet saves, background AI tasks and cancellation on owner changes.
- Aster One device: freely draggable desktop shell, fullscreen mobile, floating and Wand shortcuts, configurable animated activity capsule, themes and accessibility.
- Messages: immediate/deferred send, multi-bubble NPC replies, drafts, groups, stickers, reply/pin/edit own/delete, archived/deleted threads, blocking/removing, contact/NPC identity and app profile editors.
- Calls: outgoing/incoming/no answer/decline/accept/end, muted/speaker state, transcript, user/main-chat speech integration, optional existing Voice Addon, NPC voice/fallback, replay, stop on hangup/disable/chat change, keep call alive when phone closes.
- Custom contact at author-defined name/image/number; lazy AI NPC creation on first interaction. Editable per-app names, handles and profiles; varied NPC self-presentation.
- Harbor Store: optional Gather messenger/groups, Lumen image social app/stories, Murmur microblog/reposts. Profiles, follows/unfollows, likes/comments/bookmarks, image uploads, moderation/block/privacy controls, install/uninstall while preserving data.
- Drift browser: in-world news, search, tabs/history/bookmarks, fictional websites and Night Arcade account registration/login/deposit/withdraw/dice/slots. No real websites, accounts or money.
- Wallet: configured currency IDs/names, account mapping, transfer, existing RoleForge reservation checks, receipts and retry dedup; no duplicate reward in AI patches.
- Sticker library: image upload, name and usage cues, picker and model selection by stable ID, editable/removable, safe image MIME/size and render escaping.
- Proactive NPC message/call/social activity from scene events only, independent opt-ins/limits; settings persist by character; no unattended external model polling.
- Home, photos, notes, maps and app settings. Dynamic status/notifications and editable player/NPC app identities.
- Use original minimalist app icons with flat glyphs and restrained color; retain accessible labels and matching fallbacks.

## Validation / evidence

Unit tests for branching, privacy, state transitions, blocked contacts, validated AI outputs, wallet conservation/rollback/retry, account balance, stickers, groups and call speech. Native SillyTavern PC/mobile and WebKit, controlled AI/voice fixtures (no paid external calls), actual package install/configuration, background closing/reload/chat switching. PC 1920x1080 16:9 and mobile 1170x2532 showcases, large Thai/English-readable subtitles, 8+ second reading holds and chapters. Screenshots during work. Record exact remaining limits, not unsupported parity claims for commercial apps.
