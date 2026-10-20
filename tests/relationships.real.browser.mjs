import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  normalizeRelationships,
  relationshipPreset,
} from "../src/relationship-core.js";
const require = createRequire(import.meta.url),
  { chromium } = require(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright",
  );
const base = process.env.ST_REAL_URL || "http://127.0.0.1:18182",
  out =
    process.env.RELATIONSHIP_ARTIFACTS ||
    "/workspace/artifacts/relationship-review",
  version = JSON.parse(
    await readFile(new URL("../manifest.json", import.meta.url)),
  ).version;
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  }),
  report = {
    version,
    host: "Actual local SillyTavern",
    errors: [],
    requests: [],
    checks: [],
    layouts: [],
  };
let p,
  replies = [];
const state = () =>
  p.evaluate(() =>
    structuredClone(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state),
  );
const dock = () => p.locator(".rf-utility-hstats"),
  panel = () => dock().locator("[data-relationship-panel=dock]");
async function shot(name) {
  await p.evaluate(() => toastr.remove());
  await p.screenshot({ path: out + "/" + name + ".png" });
}
async function ready() {
  await p.waitForFunction(
    () =>
      document.getElementById("tretaresia-rpg-settings")
        ?.rfSettingsNavigation &&
      document.getElementById("tretaresia-npc-wand-launcher")?.onclick,
    {},
    { timeout: 120000 },
  );
  await p.evaluate(() => {
    window.__relReady = false;
    const c = SillyTavern.getContext();
    c.eventSource.on(c.eventTypes.APP_READY, () => (__relReady = true));
  });
  const loaded = p.waitForFunction(() => __relReady, {}, { timeout: 120000 }),
    welcome = p
      .locator("dialog.popup")
      .filter({ hasText: "Welcome to SillyTavern!" })
      .locator(".popup-button-ok");
  await Promise.race([
    loaded,
    welcome.click({ timeout: 120000 }).then(() => loaded),
  ]);
  await p.waitForFunction(() => globalThis.RoleForgeWorkshop);
}
async function importCard(card) {
  await p.evaluate(async (card) => {
    const c = SillyTavern.getContext(),
      f = new FormData();
    f.set("file_type", "json");
    f.set(
      "avatar",
      new File([JSON.stringify(card)], "relationships.json", {
        type: "application/json",
      }),
    );
    const r = await fetch("/api/characters/import", {
      method: "POST",
      headers: c.getRequestHeaders({ omitContentType: true }),
      body: f,
    });
    if (!r.ok || (await r.json()).error) throw Error("Native import failed");
    await (await import("/script.js")).getCharacters();
  }, card);
}
async function select(name) {
  await p.evaluate(async (name) => {
    const c = SillyTavern.getContext();
    await (
      await import("/script.js")
    ).selectCharacterById(
      String(c.characters.findLastIndex((n) => n.name === name)),
    );
  }, name);
  await p.waitForTimeout(500);
}
async function settings(changes) {
  await p.locator("#extensions-settings-button .drawer-toggle").click();
  if (
    !(await p
      .locator("#tretaresia-rpg-settings .inline-drawer-content")
      .isVisible())
  )
    await p.locator("#tretaresia-rpg-settings .inline-drawer-toggle").click();
  for (const [selector, value] of changes) {
    const n = p.locator(selector);
    await n.evaluate((n) =>
      document
        .getElementById("tretaresia-rpg-settings")
        .rfSettingsNavigation.reveal(n),
    );
    if (typeof value === "boolean") await n.setChecked(value);
    else await n.selectOption(value);
  }
  await p.locator("#extensions-settings-button .drawer-toggle").click();
}
async function chooseDock() {
  if (await p.locator("[data-dock-panel=hstats]").count())
    await p.locator("[data-dock-panel=hstats]").click();
  else {
    await p.locator("[data-dock-picker]").click();
    await p.locator("[data-dock-choice=hstats]").click();
  }
  await dock().waitFor({ state: "visible" });
  if (await dock().locator("[data-utility-person=mira]").count()) {
    const picker = dock().locator(".rf-utility-profile-picker");
    if (!(await picker.evaluate((n) => n.open)))
      await picker.locator("summary").click();
    await dock().locator("[data-utility-person=mira]").click();
  }
}
async function main() {
  await p
    .locator("#tretaresia-rpg-open-from-settings")
    .evaluate((n) => n.click());
  if (await p.locator("[data-action=skip-intro]").count())
    await p.locator("[data-action=skip-intro]").evaluate((n) => n.click());
  await p.locator("#tretaresia-intro-gate").waitFor({ state: "hidden" });
  await p.locator("[data-tab=hstats]").evaluate((n) => n.click());
  await p.locator("[data-panel=hstats].is-active").waitFor();
  return p.locator("[data-panel=hstats]");
}
async function closeMain() {
  await p.locator("#tretaresia-rpg-close").evaluate((n) => n.click());
}
const scene = {
  dn: "Day 1",
  d: 1,
  mo: "Harvest",
  yr: "1286",
  er: "Common Era",
  cal: "Lunar",
  t: "10:00",
  per: "Morning",
  se: "Autumn",
  loc: "Oakland Inn",
  reg: "Oakland",
  con: "Story Realm",
  pos: "By the counter",
  w: "Clear",
  temp: 22,
  light: "Daylight",
  who: ["Mira", "Kai"],
  goal: "Talk to the travellers",
  safe: "Safe",
  mood: "Calm",
  dt: "0m",
};
const reply = (story, relationshipEvents = [], ops = [], day = 1) =>
  "<tr-narrative>" +
  story +
  "</tr-narrative>\n<!--tretaresia_patch:" +
  JSON.stringify({
    sceneTracker: { ...scene, d: day },
    ops,
    relationshipEvents,
  }) +
  "-->";
async function generate(text) {
  replies.push(text);
  await p.locator("#send_textarea").fill("Continue the scene.");
  await p.evaluate(
    async () => await SillyTavern.getContext().generate("normal"),
  );
  await p.waitForTimeout(650);
}
async function relationshipTab(tab) {
  const section = tab === "history" ? "History" : "Summary";
  await dock().locator("[data-utility-h-section=" + section + "]").click();
  if (tab === "rules") await dock().locator("[data-utility-h-rules]").click();
}
async function chooseTarget(root, id) {
  await root.locator("[data-rel-action=choose]").click();
  await root
    .locator('[data-rel-action=target][data-rel-id="' + id + '"]')
    .click();
  await p.waitForTimeout(150);
}
async function metric(root, key) {
  return Number(
    await root
      .locator('[data-rel-metric="' + key + '"] strong')
      .innerText()
      .then((v) => v.split("/")[0].trim()),
  );
}
async function regressionCases(device, template) {
  const title = "Relationship regression " + device + " " + Date.now();
  const card = structuredClone(template);
  card.data.name = title;
  const initial = card.data.extensions.roleforge_character_pack.initialState;
  delete card.data.extensions.roleforge_character_pack.relationshipPreset;
  initial.player = { name: "ชีฟ", age: "25", hStats: { oralSexCount: 7 } };
  initial.npcs = [
    {
      id: "den",
      name: "Den",
      aliases: ["เดน"],
      age: "26",
      enabled: true,
      met: true,
      trust: 0,
      hStats: { oralSexCount: 0 },
    },
    {
      id: "siffelia",
      name: "Siffelia",
      aliases: ["ซิฟเฟเลีย"],
      age: "25",
      enabled: true,
      met: true,
      trust: 0,
      hStats: { oralSexCount: 0 },
    },
  ];
  const make = (text, events = [], ops = []) =>
    text +
    "\n<!--tretaresia_patch:" +
    JSON.stringify({
      sceneTracker: { ...scene, who: ["Den", "Siffelia"] },
      ops,
      relationshipEvents: events,
    }) +
    "-->";
  card.data.first_mes = make(
    "<tr-narrative>Den and Siffelia wait in Oakland Inn.</tr-narrative>",
  );
  await importCard(card);
  await select(title);
  await p.evaluate(async () => {
    const h = await import("/script.js"),
      o = await import("/scripts/openai.js");
    h.changeMainAPI("openai");
    Object.assign(o.oai_settings, {
      chat_completion_source: "custom",
      custom_url: "http://127.0.0.1:18182/local-relationship-fixture",
      custom_model: "relationship-fixture",
      stream_openai: true,
      openai_max_context: 32768,
      openai_max_tokens: 1800,
    });
    h.setOnlineStatus("local-fixture");
  });
  await p.evaluate(() => {
    window.__relationshipWarnings = [];
    const old = toastr.warning;
    toastr.warning = function (message, title, ...args) {
      if (title === "RoleForge") __relationshipWarnings.push(String(message));
      return old.call(this, message, title, ...args);
    };
  });
  const evidence =
    "เดนช่วยชีฟจัดหนังสือเรียบร้อยแล้ว แต่ยังไม่ได้เห็นห้องชั้นบน";
  await generate(
    make("<tr-narrative>" + evidence + "</tr-narrative>", [
      {
        actorId: "den",
        targetId: "player",
        kind: "support",
        evidence,
        changes: { trust: 1 },
      },
    ]),
  );
  assert.equal(
    (await state()).relationships.links.find(
      (v) => v.actorId === "den" && v.targetId === "player",
    ).trust,
    1,
  );
  const speech = "ฉันช่วยชีฟเก็บหนังสือเรียบร้อยแล้ว";
  await generate(
    make('<tr-dialogue name="Den">' + speech + "</tr-dialogue>", [
      {
        actorId: "den",
        targetId: "player",
        kind: "support",
        evidence: speech,
        changes: { trust: 2 },
      },
    ]),
  );
  assert.equal(
    (await state()).relationships.links.find(
      (v) => v.actorId === "den" && v.targetId === "player",
    ).trust,
    2,
  );
  const greeting = "Den ขอให้ชีฟพาขึ้นไปดูห้องหน่อย";
  await generate(
    make('<tr-dialogue name="Den">' + greeting + "</tr-dialogue>", [
      {
        actorId: "den",
        targetId: "player",
        kind: "support",
        evidence: greeting,
        changes: { trust: 0 },
      },
    ]),
  );
  assert.deepEqual(await p.evaluate(() => __relationshipWarnings), []);
  const encounter =
    "Den and Siffelia shared a consensual intimate oral encounter.";
  await generate(
    make(
      "<tr-narrative>" + encounter + "</tr-narrative>",
      [
        {
          actorId: "den",
          targetId: "siffelia",
          kind: "intimacy",
          evidence: encounter,
          hStats: [
            { ownerId: "den", field: "oralSexCount", verb: "inc", value: 1 },
            {
              ownerId: "siffelia",
              field: "oralSexCount",
              verb: "inc",
              value: 1,
            },
          ],
        },
      ],
      [
        ["inc", "playerHStats", { field: "oralSexCount", amount: 1 }],
        [
          "inc",
          "npcHStats",
          { npcId: "den", field: "oralSexCount", amount: 1 },
        ],
        [
          "set",
          "npcHStats",
          {
            npcId: "siffelia",
            field: "favoritePosition",
            value: "Established preference",
          },
        ],
      ],
    ),
  );
  let s = await state();
  assert.equal(s.player.hStats.oralSexCount, 7);
  assert.equal(s.npcs.find((n) => n.id === "den").hStats.oralSexCount, 1);
  assert.equal(s.npcs.find((n) => n.id === "siffelia").hStats.oralSexCount, 1);
  assert.equal(
    s.npcs.find((n) => n.id === "siffelia").hStats.favoritePosition,
    "Established preference",
  );
  const playerEncounter =
    "Den and ชีฟ shared a consensual intimate oral encounter.";
  await generate(
    make("<tr-narrative>" + playerEncounter + "</tr-narrative>", [
      {
        actorId: "den",
        targetId: "player",
        kind: "intimacy",
        evidence: playerEncounter,
        hStats: [
          { ownerId: "den", field: "oralSexCount", verb: "inc", value: 1 },
          { ownerId: "player", field: "oralSexCount", verb: "inc", value: 1 },
          {
            ownerId: "player",
            field: "mouthLastPartner",
            verb: "set",
            value: "Den",
          },
        ],
      },
    ]),
  );
  s = await state();
  assert.equal(s.player.hStats.oralSexCount, 8);
  assert.equal(s.player.hStats.mouthLastPartner, "Den");
  assert.equal(s.npcs.find((n) => n.id === "den").hStats.oralSexCount, 2);
  assert.deepEqual(await p.evaluate(() => __relationshipWarnings), []);
  let m = await main();
  await m.locator("[name=hStatsNpcId]").selectOption("den");
  await m.locator("[data-action=add-hstats-npc]").click();
  await chooseTarget(m.locator("[data-relationship-panel=main]"), "player");
  assert.equal(
    await metric(m.locator("[data-relationship-panel=main]"), "trust"),
    2,
  );
  await shot(device + "-thai-main");
  await closeMain();
  await chooseDock();
  let picker = dock().locator(".rf-utility-profile-picker");
  if (!(await picker.evaluate((n) => n.open)))
    await picker.locator("summary").click();
  await dock().locator("[data-utility-person=den]").click();
  await chooseTarget(panel(), "player");
  assert.equal(await metric(panel(), "trust"), 2);
  await shot(device + "-thai-relationship");
  picker = dock().locator(".rf-utility-profile-picker");
  if (!(await picker.evaluate((n) => n.open)))
    await picker.locator("summary").click();
  await dock().locator("[data-utility-person=player]").click();
  await dock().locator("[data-utility-h-section=History]").click();
  assert.equal(
    await dock()
      .locator(".rf-utility-h-fields>div")
      .filter({ hasText: "มีเซ็กส์ทางปากกี่รอบ" })
      .locator("dd")
      .innerText(),
    "8",
  );
  await shot(device + "-player-hstats");
  await p.reload();
  await ready();
  await select(title);
  s = await state();
  assert.equal(s.player.hStats.oralSexCount, 8);
  assert.equal(s.npcs.find((n) => n.id === "den").hStats.oralSexCount, 2);
  assert.equal(s.npcs.find((n) => n.id === "siffelia").hStats.oralSexCount, 1);
  assert.equal(
    s.relationships.links.find(
      (v) => v.actorId === "den" && v.targetId === "player",
    ).trust,
    2,
  );
  report.checks.push({
    device,
    thaiPersonaAndNpcAlias: true,
    verifiedFirstPersonDialogue: true,
    unrelatedUnfinishedClauseAllowed: true,
    noSpuriousRelationshipWarnings: true,
    noOpRequestsDoNotGrow: true,
    npcOnlyDoesNotChargePlayer: true,
    playerAndNpcCountersBothSaved: true,
    unrelatedPreferencesPreserved: true,
    mainAndDockShowSameProgress: true,
    bodyHistoryShownAndRetainedOnReload: true,
  });
}
try {
  for (const mobile of [true, false]) {
    const device = mobile ? "mobile" : "desktop",
      ctx = await browser.newContext({
        viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 },
        isMobile: mobile,
        hasTouch: mobile,
        reducedMotion: "reduce",
        acceptDownloads: true,
      });
    p = await ctx.newPage();
    p.setDefaultTimeout(30000);
    p.on("pageerror", (e) => report.errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    await p.route("**/api/horde/**", (r) => r.fulfill({ json: [] }));
    await p.route("**/api/backends/chat-completions/generate", async (r) => {
      const text = replies.shift(),
        body = r.request().postDataJSON();
      assert(text, "Unexpected model request from a UI action");
      report.requests.push({
        device,
        fixture: true,
        relationshipContract: JSON.stringify(body.messages).includes(
          "RELATIONSHIP PROGRESSION / ALL PAIRS",
        ),
      });
      await r.fulfill({
        contentType: "text/event-stream",
        body:
          "data: " +
          JSON.stringify({
            choices: [
              { index: 0, delta: { content: text }, finish_reason: null },
            ],
          }) +
          "\n\ndata: [DONE]\n\n",
      });
    });
    await p.goto(base);
    await ready();
    assert.equal(await p.evaluate(() => TretaresiaRelease), version);
    await p.selectOption("#themes", "Dark Lite", { force: true });
    await settings([
      ["#tretaresia-rpg-language", "th"],
      ["#tretaresia-rpg-auto-track", true],
      ["#tretaresia-rpg-hstats-composer", true],
    ]);
    const relationships = normalizeRelationships({
        links: [
          {
            actorId: "mira",
            targetId: "player",
            love: 60,
            interest: 20,
            trust: 65,
            commitment: 70,
          },
          {
            actorId: "mira",
            targetId: "kai",
            love: 59,
            interest: 65,
            trust: 45,
            commitment: 30,
            milestones: ["openness", "mutual_interest"],
          },
        ],
        bonds: [{ a: "mira", b: "kai", status: "dating", agreement: "open" }],
      }),
      title = "Relationships " + device + " " + Date.now(),
      other = title + " Other";
    const card = {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: title,
        description: "Adult local test fixture. Mira 25, Kai 26, Alex 25.",
        personality: "",
        scenario: "",
        mes_example: "",
        first_mes: reply("Mira and Kai sit together in Oakland Inn."),
        tags: [],
        extensions: {
          roleforge_character_pack: {
            format: "roleforge-character-pack",
            version: 1,
            relationshipPreset: relationshipPreset({ relationships }),
            initialState: {
              player: { name: "Alex", age: "25", hStats: { oralSexCount: 7 } },
              npcs: [
                {
                  id: "mira",
                  name: "Mira",
                  age: "25",
                  met: true,
                  enabled: true,
                  affection: 60,
                  trust: 65,
                  loyalty: 70,
                  hStats: {
                    loyaltyHearts: 5,
                    infidelityStage: 4,
                    oralSexCount: 2,
                  },
                },
                {
                  id: "kai",
                  name: "Kai",
                  age: "26",
                  met: true,
                  enabled: true,
                  hStats: { oralSexCount: 1 },
                },
                {
                  id: "elin",
                  name: "Elin",
                  age: "25",
                  met: true,
                  enabled: true,
                },
              ],
              location: {
                place: "Oakland Inn",
                region: "Oakland",
                continent: "Story Realm",
                narrativeVersion: 1,
              },
              onboarding: {
                identitySeeded: true,
                locationSeeded: true,
                loadoutSeeded: true,
              },
            },
          },
        },
      },
    };
    await importCard(card);
    await importCard({
      ...card,
      data: {
        ...card.data,
        name: other,
        extensions: {},
        first_mes: "A separate room.",
      },
    });
    await select(title);
    console.log(device, "native card imported");
    let m = await main();
    await m.locator("[name=hStatsNpcId]").selectOption("mira");
    await m.locator("[data-action=add-hstats-npc]").click();
    const mainView = m.locator("[data-relationship-panel=main]");
    await mainView.waitFor();
    await chooseTarget(mainView, "kai");
    assert.equal(await metric(mainView, "love"), 59);
    await mainView.screenshot({ path: out + "/" + device + "-main-panel.png" });
    await shot(device + "-main");
    await closeMain();
    await chooseDock();
    await chooseTarget(panel(), "kai");
    assert.equal(await metric(panel(), "love"), 59);
    assert.match(
      await panel().locator("[data-rel-leader=interest] strong").innerText(),
      /Kai/,
    );
    await shot(device + "-dock-before");
    await panel().screenshot({
      path: out + "/" + device + "-dock-before-panel.png",
    });
    await p.evaluate(async () => {
      const h = await import("/script.js"),
        o = await import("/scripts/openai.js");
      h.changeMainAPI("openai");
      Object.assign(o.oai_settings, {
        chat_completion_source: "custom",
        custom_url: "http://127.0.0.1:18182/local-relationship-fixture",
        custom_model: "relationship-fixture",
        stream_openai: true,
        openai_max_context: 32768,
        openai_max_tokens: 1800,
      });
      h.setOnlineStatus("local-fixture");
    });
    const quote = "Mira and Kai both confessed that they love each other.";
    await generate(
      reply(quote, [
        {
          actorId: "mira",
          targetId: "kai",
          kind: "romance",
          milestone: "mutual_interest",
          evidence: quote,
          changes: { love: 2, interest: 1 },
        },
      ]),
    );
    let s = await state();
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).love,
      61,
    );
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "player",
      ).love,
      60,
    );
    assert(
      !s.relationships.links.some(
        (v) => v.actorId === "kai" && v.targetId === "mira",
      ),
    );
    assert.equal(s.player.hStats.oralSexCount, 7);
    await chooseDock();
    assert.match(
      await panel().locator("[data-rel-leader=love] strong").innerText(),
      /Kai/,
    );
    // A second paragraph/reply does not refill the continuous-scene allowance.
    await generate(
      reply("Mira feels fond of Kai and appreciates Kai.", [
        {
          actorId: "mira",
          targetId: "kai",
          kind: "romance",
          evidence: "Mira feels fond of Kai and appreciates Kai.",
          changes: { love: 50 },
        },
      ]),
    );
    s = await state();
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).love,
      61,
    );
    const encounter =
      "Mira and Kai shared a consensual intimate oral encounter.";
    await generate(
      reply(
        encounter,
        [
          {
            actorId: "mira",
            targetId: "kai",
            kind: "intimacy",
            evidence: encounter,
            hStats: [
              { ownerId: "mira", field: "oralSexCount", verb: "inc", value: 1 },
              { ownerId: "kai", field: "oralSexCount", verb: "inc", value: 1 },
              {
                ownerId: "player",
                field: "oralSexCount",
                verb: "inc",
                value: 1,
              },
            ],
          },
        ],
        [
          [
            "inc",
            "npcHStats",
            { npcId: "mira", field: "oralSexCount", amount: 1 },
          ],
          ["inc", "playerHStats", { field: "oralSexCount", amount: 1 }],
          ["inc", "npcValues", { npcId: "mira", field: "trust", amount: 90 }],
          [
            "set",
            "npcHStats",
            { npcId: "mira", field: "loyaltyHearts", value: 0 },
          ],
        ],
      ),
    );
    s = await state();
    assert.equal(s.npcs.find((n) => n.id === "mira").hStats.oralSexCount, 3);
    assert.equal(s.npcs.find((n) => n.id === "kai").hStats.oralSexCount, 2);
    assert.equal(s.player.hStats.oralSexCount, 7);
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).encounters,
      1,
    );
    assert.equal(s.npcs.find((n) => n.id === "mira").hStats.loyaltyHearts, 5);
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).love,
      61,
    );
    await chooseDock();
    await shot(device + "-dock-after");
    await relationshipTab("history");
    assert.match(await panel().innerText(), /Mira.*Kai/s);
    await panel().screenshot({
      path: out + "/" + device + "-events-panel.png",
    });
    replies.push(
      reply("Mira and Kai continued their conversation by the counter."),
    );
    await p.locator("#chat .last_mes .swipe_right").click();
    await p.waitForFunction(
      () =>
        SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.npcs.find(
          (n) => n.id === "mira",
        ).hStats.oralSexCount === 2,
    );
    await p.waitForFunction(() =>
      SillyTavern.getContext()
        .chat.at(-1)
        .mes.includes("continued their conversation"),
    );
    await p.waitForTimeout(650);
    console.log(device, "native swipe alternative restored counters");
    const beforeCalls = report.requests.length,
      beforeChat = await p.evaluate(() => SillyTavern.getContext().chat.length);
    await relationshipTab("overview");
    await chooseTarget(panel(), "kai");
    await relationshipTab("rules");
    await panel().locator("[data-rel-edit=true]").click();
    const f = panel().locator("[data-rel-form=pair]");
    await f.locator("[name=trust]").fill("72");
    await f.locator("[name=reason]").fill("Manual author correction");
    await f.locator("[type=submit]").click();
    await panel()
      .locator("[data-rel-feedback]")
      .filter({ hasText: "บันทึกแล้ว" })
      .waitFor();
    assert.equal(await metric(panel(), "trust"), 72);
    await relationshipTab("rules");
    await panel().locator("[name=pace][value=balanced]").check();
    await panel()
      .locator("[name=anchor]")
      .fill("Protect established relationships and personality.");
    await panel().locator("[name=resistance]").fill("75");
    await panel().locator("[data-rel-form=rules] [type=submit]").click();
    await panel()
      .locator("[data-rel-feedback]")
      .filter({ hasText: "บันทึกแล้ว" })
      .waitFor();
    assert.equal((await state()).relationships.config.pace, "balanced");
    await panel().screenshot({ path: out + "/" + device + "-rules-panel.png" });
    const download = p.waitForEvent("download");
    await panel().locator("[data-rel-action=export]").click();
    const file = await download;
    await file.saveAs(out + "/" + device + "-relationships.json");
    const exported = JSON.parse(
      await readFile(out + "/" + device + "-relationships.json"),
    );
    assert.equal(
      exported.preset.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).trust,
      72,
    );
    assert(!Object.hasOwn(exported.preset, "history"));
    assert(!Object.hasOwn(exported.preset, "receipts"));
    const portable = structuredClone(exported);
    portable.preset.links.find(
      (v) => v.actorId === "mira" && v.targetId === "kai",
    ).trust = 1;
    portable.preset.links.push({
      actorId: "mira",
      targetId: "elin",
      love: 20,
      interest: 55,
      trust: 30,
      commitment: 10,
      milestones: [],
      encounters: 0,
      origin: "card",
      lastReason: "",
    });
    await panel()
      .locator("[data-rel-import]")
      .setInputFiles({
        name: "relationship-preset.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(portable)),
      });
    await panel()
      .locator("[data-rel-feedback]")
      .filter({ hasText: "นำเข้าแล้ว" })
      .waitFor();
    assert.equal(
      (await state()).relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).trust,
      72,
    );
    assert.equal(
      (await state()).relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "elin",
      ).interest,
      55,
    );
    assert.equal(report.requests.length, beforeCalls);
    assert.equal(
      await p.evaluate(() => SillyTavern.getContext().chat.length),
      beforeChat,
    );
    // Native swipe changes story events, while explicit later author corrections stay saved.
    await p.locator("#chat .last_mes .swipe_left").click();
    await p.waitForFunction(
      () =>
        SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.npcs.find(
          (n) => n.id === "mira",
        ).hStats.oralSexCount === 3,
    );
    assert.equal(
      (await state()).relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).trust,
      72,
    );
    await p.locator("#chat .last_mes .swipe_right").click();
    await p.waitForFunction(
      () =>
        SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.npcs.find(
          (n) => n.id === "mira",
        ).hStats.oralSexCount === 2,
    );
    assert.equal((await state()).relationships.config.pace, "balanced");
    assert.equal(
      (await state()).relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "elin",
      ).interest,
      55,
    );
    await p.locator("#chat .last_mes .swipe_left").click();
    await p.waitForFunction(
      () =>
        SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.npcs.find(
          (n) => n.id === "mira",
        ).hStats.oralSexCount === 3,
    );
    await p.reload();
    await ready();
    await select(title);
    s = await state();
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).trust,
      72,
    );
    assert.equal(s.relationships.config.pace, "balanced");
    assert.equal(s.npcs.find((n) => n.id === "mira").hStats.oralSexCount, 3);
    assert.equal(s.player.hStats.oralSexCount, 7);
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).encounters,
      1,
    );
    await chooseDock();
    await relationshipTab("rules");
    await p.locator("#extensions-settings-button .drawer-toggle").click();
    if (
      !(await p
        .locator("#tretaresia-rpg-settings .inline-drawer-content")
        .isVisible())
    )
      await p.locator("#tretaresia-rpg-settings .inline-drawer-toggle").click();
    await p
      .locator("#roleforge-character-pack")
      .evaluate((n) =>
        document
          .getElementById("tretaresia-rpg-settings")
          .rfSettingsNavigation.reveal(n),
      );
    await p.locator("[data-pack-save]").click();
    await p
      .locator("[data-pack-status]")
      .filter({ hasText: "บันทึกแล้ว" })
      .waitFor();
    await p.locator("#extensions-settings-button .drawer-toggle").click();
    const exportedCard = await p.evaluate(async () => {
      const c = SillyTavern.getContext(),
        r = await fetch("/api/characters/export", {
          method: "POST",
          headers: c.getRequestHeaders(),
          body: JSON.stringify({
            avatar_url: c.characters[c.characterId].avatar,
            format: "json",
          }),
        });
      if (!r.ok) throw Error("Native export failed");
      return r.json();
    });
    assert.equal(
      exportedCard.data.extensions.roleforge_character_pack.relationshipPreset.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).trust,
      72,
    );
    exportedCard.data.name = title + " Portable";
    await importCard(exportedCard);
    await select(title + " Portable");
    s = await state();
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "kai",
      ).trust,
      72,
    );
    assert.equal(s.relationships.config.pace, "balanced");
    assert.equal(
      s.relationships.links.find(
        (v) => v.actorId === "mira" && v.targetId === "elin",
      ).interest,
      55,
    );
    await select(title);
    await chooseDock();
    for (const width of mobile ? [320, 390, 430] : [768, 1440]) {
      await p.setViewportSize({ width, height: mobile ? 844 : 1000 });
      for (const tab of ["overview", "history", "rules"]) {
        await relationshipTab(tab);
        const fit = await panel().evaluate((n) => ({
          width: innerWidth,
          inside: n.getBoundingClientRect().right <= innerWidth + 1,
          overflow: n.scrollWidth > n.clientWidth + 1,
        }));
        if (!fit.inside || fit.overflow)
          fit.children = await panel().evaluate((n) =>
            [...n.querySelectorAll("*")]
              .filter((v) => v.scrollWidth > v.clientWidth + 1)
              .map((v) => ({
                class: v.className,
                tag: v.tagName,
                w: v.clientWidth,
                scroll: v.scrollWidth,
                white: getComputedStyle(v).whiteSpace,
              })),
          );
        assert(
          fit.inside && !fit.overflow,
          device + " " + tab + " " + width + " " + JSON.stringify(fit),
        );
        report.layouts.push({ device, tab, ...fit });
      }
    }
    await p.setViewportSize({
      width: mobile ? 390 : 1440,
      height: mobile ? 844 : 1000,
    });
    await relationshipTab("overview");
    await chooseTarget(panel(), "kai");
    await shot(device + "-dock-final");
    m = await main();
    await chooseTarget(m.locator("[data-relationship-panel=main]"), "kai");
    assert.equal(
      await metric(m.locator("[data-relationship-panel=main]"), "trust"),
      72,
    );
    await m
      .locator("[data-relationship-panel=main]")
      .screenshot({ path: out + "/" + device + "-main-final-panel.png" });
    await shot(device + "-main-final");
    await closeMain();
    await select(other);
    await chooseDock();
    assert.doesNotMatch(await panel().innerText(), /Mira|Kai/);
    assert.equal((await state()).relationships.links.length, 0);
    report.checks.push({
      device,
      nativeCardImport: true,
      presetSeeds: true,
      npcToNpcFeelings: true,
      directedNotMirrored: true,
      rankCanChange: true,
      noPlayerPenalty: true,
      sceneBudget: true,
      participantCounters: true,
      noDoubleCount: true,
      legacyHeartsPreserved: true,
      mainAndDockAgree: true,
      manualEditingNoAI: true,
      rulesNoUserMessage: true,
      normalReload: true,
      nativeSwipeRestoresEvents: true,
      manualEditsSurviveSwipe: true,
      presetImportPreservesPlayedPairs: true,
      nativeSaveSetupAndExportCard: true,
      presetExportPortableCard: true,
      cardIsolation: true,
    });
    await regressionCases(device, card);
    await ctx.close();
    console.log("PASS native relationships", device);
  }
  assert.deepEqual(report.errors, []);
  assert(report.requests.every((v) => v.relationshipContract));
  report.pass = true;
} catch (error) {
  report.failure = error.stack;
  console.error(error);
  if (p && !p.isClosed()) {
    await shot("failed").catch(() => {});
    await writeFile(out + "/failed.html", await p.content());
  }
  process.exitCode = 1;
} finally {
  await writeFile(
    out + "/native-validation.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
