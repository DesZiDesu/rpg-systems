# Aster brand and app context — 0.88.6 / Aster Phone 1.1.6

Both main-chat generation and standalone phone replies now receive an explicit in-world device/app guide. Previously the model primarily saw internal IDs and installed-app flags, leaving it to guess the visible brand names and app purposes.

The guide identifies Aster as the hardware brand and Aster One as the handset. App names come directly from the existing UI catalog, with Thai labels, short purpose descriptions and current installation status. It covers all built-in and optional apps: Calls, Messages, Contacts, Wallet, Harbor Store, Drift, Gather, Lumen, Murmur, Stickers, Photos, Notes, Maps and Settings. Night Arcade is identified as an in-world website opened through Drift, rather than an installed app.

The model is instructed to use those names naturally in dialogue, keep platform names such as Gather/Lumen/Murmur in either conversation language, distinguish device ownership from app installation and avoid inventing player actions. An NPC can suggest an uninstalled platform; delivery still requires an installed supported app. Existing engine permissions and delivery rules are unchanged.

Pending message requests and conversation-history entries carry the actual app ID/name, so a Gather conversation is distinguishable from Messages. Both generation paths receive up to eight recorded public social posts with platform, public account name/handle, timestamps and bounded recent comments. Deleted, private and blocked-author posts are excluded, including alternate contact IDs linked to a blocked NPC. Raw image payloads, gallery contents, notes and account credentials are not added to this context.

Knowing the app catalog does not mean an NPC can see the player's screen, private notes or someone else's conversations. Existing private-thread knowledge restrictions remain explicit. This is generation context, not a command parser that can force a particular model to use an app name in every response.

Unit verification covers UI/catalog consistency, installation changes, brand/model/site distinctions, Messages/Gather routing context, public profile labels, privacy/block filtering and payload limits. The native SillyTavern generation regression checks that real phone-task and main-chat provider requests contain the guide. Provider responses are controlled local fixtures; no paid API is used.

Update RoleForge, reload SillyTavern and update Aster Phone to 1.1.6 in Workshop. There are no visible layout changes or phone-data migrations in this release.
