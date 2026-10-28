# Pokémon First Release — install and play

This build combines RoleForge 0.90.0 and Pokémon 1.0.0 on `release/pokemon-first`. The stable `main` branch is unchanged while the release is tried in SillyTavern. Existing Aster, Death Note and RoleForge features are included.

## Install with SillyTavern

1. Back up your SillyTavern user data. If RoleForge is already installed, open Extensions → Manage extensions → RoleForge → branch selector and choose `release/pokemon-first`, then reload.
2. For a fresh installation: Extensions → Install extension. Repository: `https://github.com/DesZiDesu/rpg-systems`. Enter `release/pokemon-first` in the branch field. Reload SillyTavern. Install only one active copy of RoleForge.
3. Open RoleForge → Workshop → Pokémon → Install/Update **1.0.0**. Enable it for your character.
4. Import `Pokemon-First-Journey.en.json` (or `.th.json`) and open Pokémon → Journey. Select a starter. Configure your usual SillyTavern chat-completion API for narration.
5. Optional: Workshop → Pokémon → character-creation toggle. A blank chat, or deleting the original first greeting, can open the Pokémon creator. Its chosen partner and kit replace the authored defaults; no kit stays empty.

## Downloaded ZIP

The source ZIP contains one top-level `rpg-systems` directory. With SillyTavern stopped, use it as the extension folder under `data/default-user/extensions/`. Move an existing RoleForge folder outside the extensions directory first; avoid running two copies. ZIP installations do not provide Git branch switching. The separate review ZIP contains videos, screenshots and documentation only; it is not the addon installer.

## Play

- **Journey:** choose your companion, explore or handle a wild encounter established in the story.
- **Party / Storage:** inspect individuals, change lead, move companions and evolve eligible Pokémon. Party size is six.
- **Services → Abilities & held items:** give one owned item, take it back or reveal a legacy companion's natural ability. Supported effects are labelled.
- **Bag:** use medicine or balls. Reference-only items are labelled. Held items move out of the bag rather than being copied.
- **Centers / Training:** reach the appropriate place in the roleplay. Learn eligible moves, choose a slot, then confirm. Compatible TM items are consumed once.
- **Trainers / Gyms:** Kanto has eight functional Gyms. Visit the matching Gym before challenging its leader.
- **Rare quests:** accept the offer yourself, meet its wins/region/destination requirements, then initiate the encounter.
- **Evolution:** eligible level, stone, gender, friendship, time, move, party and held-item conditions are checked. Trade-back evolution requires a Center or Link Club. Specialized location/form/other unsupported conditions stay locked.
- **Sandbox:** explicitly enable it yourself to create Pokémon, adjust individual values or set stock. AI cannot enable it or perform cheats for you.

Addon enablement, launchers, character-creation choice, automatic narration and scenery preferences belong to the character. Gameplay follows the current chat and message history. Swiping, editing, deleting and branching can invalidate later actions. Closing the Pokémon UI does not stop an already running narration. Player drafts are preserved.

The addon does not require an external Pokémon server. Bundled data and selected artwork work locally; additional species/form images may load from public sprite mirrors. Unavailable images fall back to an icon. Your normal SillyTavern API is used for story narration.

To return to stable RoleForge, switch back to `main` and reload. Pokémon's UI will be unavailable there until it is promoted; keep your chats and backups to retain their Pokémon journals.
