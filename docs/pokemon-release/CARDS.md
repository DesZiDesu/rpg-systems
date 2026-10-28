# Pokémon RPG — three editions

Import a **PNG card** into SillyTavern to get its cover and embedded character data together. Each has an original generated cover in a minimalist flat-color style with stepped pixel details. The JSON alternatives contain the same roleplay data and do not include a portrait.

| Edition | Language | Opening |
| --- | --- | --- |
| [Sunken Red Sun](Pokemon-Sunken-Red-Sun.th.png) | Thai | Five open-ended scenes at Oak’s laboratory near sunset |
| [Dawn Midnights](Pokemon-Dawn-Midnights.en.png) | English | Five open-ended scenes at Oak’s laboratory before sunrise |
| [Sun & Dawn](Pokemon-Sun-and-Dawn.png) | Follows your creation/settings language | No first message; opens Pokémon Character Creation |

Update RoleForge on `main`. The card enables Pokémon in Workshop and can install its pack when it is missing. No external Pokémon account is required. Your normal ST API is needed when you ask for new narration or finish Character Creation.

## Choose an opening

The default opening plus four alternate greetings makes **five per language**. Use SillyTavern’s greeting swipe arrows to choose before sending your first message. Each scene uses `tr-header`, `tr-narrative` and `tr-dialogue`; it follows your RoleForge chat design and visibility settings.

Sunken Red Sun:

1. คู่หูก่อนตะวันลับ — meet the starters or discuss your route.
2. จดหมายจากชายฝั่ง — investigate an unopened letter, or follow your own reason for visiting.
3. เสียงเรียกจากเส้นทางแรก — listen to a field recording and choose what to ask next.
4. ประกาศที่ยังไม่มีชื่อ — consider an optional field walk, or travel independently.
5. การเดินทางที่ยังไม่มีคำตอบ — define your own goal beyond collecting badges.

Dawn Midnights:

1. A partner before sunrise.
2. The signal that stayed awake.
3. An unfinished field notebook.
4. A place on the noticeboard.
5. A journey without a title.

These are alternative beginnings, not consecutive missions. The player is not assigned dialogue, a profession, a partner, a completed quest or an obligation. Objects described on a desk are not automatically awarded. The normal kit is Poké Ball ×5 and Potion ×2; choosing a partner happens through Journey or Character Creation.

## Sun & Dawn

This card intentionally contains an empty `first_mes` and no alternate greetings. It also starts without a party, items or seeded NPC encounters. Open a new chat with Pokémon enabled and **Workshop → Pokémon → Use addon character creation** on. Register your identity, region, partner/no-partner choice, kit, goal and opening scene. The creator’s saved choices set the initial game; then the AI writes the first scene in RoleForge format.

The card does not force Oak’s laboratory or a fixed player background. You may use Thai or English. Turning the addon creator off uses the ordinary RoleForge creator instead; your saved character preference takes precedence over a card default.

## Files and artwork

The `Pokemon-First-Journey.th.json` and `.en.json` paths remain aliases for the two named language editions. Use one edition per imported character; you do not need to import both the PNG and matching JSON.

Art is original AI-generated Pokémon fan art, not official game artwork. Edition titles are custom card names, not official games or separate canon regions. Covers do not establish which Pokémon the player owns.

Validate PNG metadata and all ten formatted openings:

```sh
node tools/build-pokemon-edition-cards.mjs --check
```

After editing JSON, running the builder without `--check` rewrites the embedded card metadata while keeping the existing PNG’s image data unchanged. Initial cover input can be supplied using `--art-dir`. Browser verification imports all three PNGs, swipes all ten authored openings on desktop/mobile, and completes the blank card’s creator with a controlled local model response.
