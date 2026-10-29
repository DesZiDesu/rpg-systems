# Pokémon First Release — install and play

RoleForge 0.90.11 and Pokémon 1.6.1 are available on `main`. Existing Aster, Death Note and RoleForge features are included. No preview branch is required.

## Install with SillyTavern

1. Back up your SillyTavern user data. If RoleForge is already installed, open Extensions → Manage extensions → RoleForge → Update, then reload. If you previously selected a preview/release branch, switch to `main` before updating.
2. For a fresh installation: Extensions → Install extension. Repository: `https://github.com/DesZiDesu/rpg-systems`. Use the default branch (`main`). Reload SillyTavern. Install only one active copy of RoleForge.
3. Open RoleForge → Workshop → Pokémon → Install/Update **1.6.1**. Enable it for your character.
4. Import a PNG card: **Red Sunken Sun** (Thai), **Dawn Midnights** (English), or **Sun & Dawn** (Character Creation). PNGs include the cover, character data and compressed World Pack together; [download choices, reference coverage and openings](CARDS.md). The two language editions have six RoleForge-formatted greetings each. The library installs in the browser when the card first opens. Open Pokémon → Journey to choose a starter, and configure your usual SillyTavern chat-completion API for narration.
5. Sun & Dawn has no first message and opens Pokémon Character Creation. Leave Workshop → Pokémon → **Use addon character creation** on. A blank chat, or deleting an authored first greeting, can open the creator. Its chosen partner and kit replace the authored defaults; no kit stays empty.

## Downloaded ZIP

The source ZIP contains one top-level `rpg-systems` directory. With SillyTavern stopped, use it as the extension folder under `data/default-user/extensions/`. Move an existing RoleForge folder outside the extensions directory first; avoid running two copies. ZIP installations do not provide Git branch switching. The separate review ZIP contains videos, screenshots and documentation only; it is not the addon installer.

Original and Aperture use square Dossier frames. The desktop field spans the content width above its commands. Mobile keeps a 16:9 field. Players now see their Pokémon from behind, with opponents facing them. Matching pixel/model GIF pairs are preferred; static sprites are used when necessary. Motion off and reduced motion stop GIF and WebP animations as well. [Sprite coverage](../pokemon-facing-v0.90.11.md). Battle and field animations can be disabled in Pokémon Settings, follow saved results and respect reduced motion. Escape skips battle motion. [Details](../pokemon-dossier-v0.90.9.md).

New battles open the full Pokémon window automatically, including with Motion off. Closing a battle window keeps the encounter; ordinary replies, swipes and history restoration do not force it open again. The composer panel uses the same square frames as the full window.

## Play

- **Journey:** choose your companion, explore or handle a wild encounter established in the story.
- **Party / Storage:** inspect individuals, change lead, move companions and evolve eligible Pokémon. Party size is six.
- **Services → Abilities & held items:** give one owned item, take it back or reveal a legacy companion's natural ability. Supported effects are labelled.
- **Bag:** use medicine or balls. Reference-only items are labelled. Held items move out of the bag rather than being copied.
- **Centers / Training:** reach the appropriate place in the roleplay. Learn eligible moves, choose a slot, then confirm. Compatible TM items are consumed once.
- **Trainers / Gyms:** Kanto has eight functional Gyms. Visit the matching Gym before challenging its leader. Story NPCs can offer a battle when visible narration establishes their location and team. Review and accept in Services → Trainers. Opponent party balls track their one-to-six-member team; trainer Pokémon cannot be caught.
- **Rare quests:** accept the offer yourself, meet its wins/region/destination requirements, then initiate the encounter.
- **Evolution:** eligible level, stone, gender, friendship, time, move, party and held-item conditions are checked. Trade-back evolution requires a Center or Link Club. Specialized location/form/other unsupported conditions stay locked.
- **Sandbox:** explicitly enable it yourself to create Pokémon, adjust individual values or set stock. AI cannot enable it or perform cheats for you.

Addon enablement, launchers, character-creation choice, automatic narration and scenery preferences belong to the character. Gameplay follows the current chat and message history. Swiping, editing, deleting and branching can invalidate later actions. Closing the Pokémon UI does not stop an already running narration. Player drafts are preserved.

The addon does not require an external Pokémon server. Bundled data and selected artwork work locally; additional species/form images may load from public sprite mirrors. Unavailable images fall back to an icon. Your normal SillyTavern API is used for story narration.

To stop using Pokémon for a character, disable it in Workshop. Its UI and generation instructions are disabled while the saved Pokémon journals remain in your chats.
