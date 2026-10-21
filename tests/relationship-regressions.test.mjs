import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRelationshipEvents,
  filterRelationshipBodyOperations,
  normalizeRelationships,
  relationshipLink,
} from "../src/relationship-core.js";
import { hStats } from "../src/h-stats.js";
const state = () => ({
  player: { name: "Player", hStats: hStats({ oralSexCount: 7 }) },
  npcs: [
    {
      id: "den",
      name: "Den",
      aliases: ["เดน"],
      met: true,
      enabled: true,
      hStats: hStats(),
    },
    {
      id: "siffelia",
      name: "Siffelia",
      aliases: ["ซิฟเฟเลีย"],
      met: true,
      enabled: true,
      hStats: hStats(),
    },
  ],
  relationships: normalizeRelationships(),
  worldClock: { day: 1, time: "10:00" },
  location: { place: "House" },
});
const event = (evidence, extra = {}) => ({
  actorId: "den",
  targetId: "player",
  kind: "support",
  evidence,
  changes: { trust: 1 },
  ...extra,
});
const run = (events, story, options = {}) =>
  applyRelationshipEvents(state(), Array.isArray(events) ? events : [events], {
    story,
    source: "turn-1|variant-0",
    userName: "ชีฟ",
    ...options,
  });
for (const quote of [
  "เดนช่วยชีฟเก็บหนังสือแล้ว แต่ยังไม่ได้เห็นห้องชั้นบน",
  "Den helped ชีฟ carry the books. Siffelia will visit tomorrow.",
  "Den helped ชีฟ carry the books and will leave tomorrow.",
])
  test(
    "a completed act survives an unrelated unfinished clause: " + quote,
    () => {
      const r = run(event(quote), quote);
      assert.equal(r.changed, 1);
      assert.equal(relationshipLink(r.next, "den", "player").trust, 1);
      assert.deepEqual(r.errors, []);
    },
  );
for (const [speaker, quote] of [
  ["Den", "ฉันช่วยชีฟเก็บหนังสือเรียบร้อยแล้ว"],
  ["เดน", "ฉันช่วยชีฟเก็บหนังสือเรียบร้อยแล้ว"],
])
  test(
    "a verified dialogue speaker and the active persona identify the pair: " +
      speaker,
    () => {
      const r = run(
        event(quote),
        `<tr-dialogue name="${speaker}">${quote}</tr-dialogue>`,
      );
      assert.equal(r.changed, 1);
      assert.deepEqual(r.errors, []);
    },
  );
test("speaker inference cannot borrow identity from a different dialogue", () => {
  const quote = "ฉันช่วยชีฟเก็บหนังสือเรียบร้อยแล้ว";
  const r = run(
    event(quote),
    `<tr-dialogue name="Siffelia">${quote}</tr-dialogue><tr-dialogue name="Den">สวัสดี</tr-dialogue>`,
  );
  assert.equal(r.changed, 0);
  assert.equal(r.diagnostics[0].code, "participants");
});
for (const quote of [
  "Den ยังไม่ได้ช่วยชีฟเก็บหนังสือ",
  "หาก Den ช่วยชีฟเก็บหนังสือ",
  "Den กำลังจะช่วยชีฟเก็บหนังสือ",
  "Den จะช่วยชีฟเก็บหนังสือ",
  "Den อยากช่วยชีฟเก็บหนังสือ",
  "Den says: please help ชีฟ with the books.",
  "ช่วยพาฉันขึ้นไปดูห้องหน่อยชีฟ",
  "Maybe Den helped ชีฟ carry the books.",
  "A rumor says Den helped ชีฟ.",
])
  test("a request, negated event or plan stays unconfirmed: " + quote, () => {
    const r = run(
      event(quote),
      `<tr-dialogue name="Den">${quote}</tr-dialogue>`,
    );
    assert.equal(r.changed, 0);
  });
test("cropping the evidence cannot remove its hypothetical source context", () => {
  const quote = "Den helped ชีฟ carry the books";
  assert.equal(run(event(quote), "Maybe " + quote + ".").changed, 0);
});
test("a rejected event does not prevent another valid pair from updating", () => {
  const quote = "Den helped ชีฟ carry the books.",
    r = run(
      [event("Den will help ชีฟ."), event(quote)],
      "Den will help ชีฟ. " + quote,
    );
  assert.equal(r.changed, 1);
  assert.equal(r.diagnostics.length, 1);
  assert.equal(r.diagnostics[0].code, "unconfirmed");
});
test("zero-change proposals do not produce a misleading relationship warning or state copies", () => {
  const s = state(),
    r = applyRelationshipEvents(
      s,
      [event("Den says hello.", { changes: { trust: 0 } })],
      { story: "Den says hello.", source: "turn-1" },
    );
  assert.equal(r.next, s);
  assert.equal(r.changed, 0);
  assert.deepEqual(r.errors, []);
});
test("ordinary conversation with no proposed progression remains unchanged", () => {
  const s = state(),
    r = applyRelationshipEvents(s, [], {
      story: "Den asks to see a room.",
      source: "turn-1",
    });
  assert.equal(r.next, s);
  assert.deepEqual(r.errors, []);
});
for (const actorId of ["player", "den"])
  test(
    "an actual player-NPC encounter writes BOTH owners, once, with player as " +
      actorId,
    () => {
      const s = state(),
        quote = "Den and Player shared a consensual intimate oral encounter.",
        e = {
          actorId,
          targetId: actorId === "player" ? "den" : "player",
          kind: "intimacy",
          evidence: quote,
          hStats: [
            { ownerId: "player", field: "oralSexCount", verb: "inc", value: 1 },
            { ownerId: "den", field: "oralSexCount", verb: "inc", value: 1 },
          ],
        };
      const r = applyRelationshipEvents(s, [e], {
        story: quote,
        source: "turn-1",
      });
      assert.equal(r.next.player.hStats.oralSexCount, 8);
      assert.equal(r.next.npcs[0].hStats.oralSexCount, 1);
      assert.equal(s.player.hStats.oralSexCount, 7);
      assert.equal(relationshipLink(r.next, actorId, e.targetId).encounters, 1);
      assert.equal(
        applyRelationshipEvents(r.next, [e], { story: quote, source: "turn-1" })
          .changed,
        0,
      );
    },
  );
test("an unrelated negated act cannot validate an intimate counter", () => {
  const quote =
    "Den and Siffelia shared a consensual intimate kiss. Den and Siffelia did not have oral sex.";
  const e = {
    actorId: "den",
    targetId: "siffelia",
    kind: "intimacy",
    evidence: quote,
    hStats: [{ ownerId: "den", field: "oralSexCount", verb: "inc", value: 1 }],
  };
  const r = run(e, quote);
  assert.equal(r.changed, 1);
  assert.equal(r.next.npcs[0].hStats.oralSexCount, null);
  assert.equal(r.next.player.hStats.oralSexCount, 7);
});

test("body-event ownership guards preserve independent preferences and descriptive body updates", () => {
  const events = [
    {
      actorId: "den",
      targetId: "siffelia",
      kind: "intimacy",
      hStats: [
        {
          ownerId: "den",
          field: "mouthState",
          verb: "set",
          value: "event-owned",
        },
      ],
    },
  ];
  const ops = [
    ["inc", "playerHStats", { field: "oralSexCount", amount: 1 }],
    ["inc", "npcHStats", { npcId: "den", field: "oralSexCount", amount: 1 }],
    [
      "set",
      "npcHStats",
      { npcId: "den", field: "mouthState", value: "duplicate" },
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
    [
      "set",
      "playerHStats",
      { field: "penisSize", value: "Established description" },
    ],
    [
      "upsert",
      "npcs",
      {
        id: "siffelia",
        hStats: { mouthQuality: "Established description", oralSexCount: 99 },
      },
    ],
  ];
  const filtered = filterRelationshipBodyOperations(ops, events, state());
  assert.equal(filtered.length, 3);
  assert.equal(filtered[0][2].field, "favoritePosition");
  assert.equal(filtered[1][2].field, "penisSize");
  assert.deepEqual(filtered[2][2].hStats, {
    mouthQuality: "Established description",
  });
  assert.equal(ops[5][2].hStats.oralSexCount, 99);
  assert.doesNotThrow(() =>
    filterRelationshipBodyOperations(
      ops,
      [{ kind: "history", hStats: {} }],
      state(),
    ),
  );
});
test("unquoted speaker attributes use the same parser as visible dialogue", () => {
  const quote = "ฉันช่วยชีฟเก็บหนังสือเรียบร้อยแล้ว";
  assert.equal(
    run(event(quote), `<tr-dialogue name=Den>${quote}</tr-dialogue>`).changed,
    1,
  );
});
test("a second-person addressee in a multi-NPC scene stays ambiguous", () => {
  const quote = "I helped you carry the books.";
  const r = run(
    event(quote),
    `<tr-dialogue name="Den">${quote}</tr-dialogue>`,
    { participants: ["den", "siffelia"] },
  );
  assert.equal(r.changed, 0);
});

test("a confirmed pair can establish an agreement in the next sentence without losing exclusivity", () => {
  const quote =
    "Den and Siffelia are dating. They agreed on an exclusive relationship.";
  const r = run(
    event(quote, {
      targetId: "siffelia",
      kind: "establish",
      milestone: "dating",
      agreement: "exclusive",
      changes: { commitment: 1 },
    }),
    quote,
  );
  assert.equal(r.changed, 1);
  assert.equal(r.next.relationships.bonds[0].agreement, "exclusive");
});
test("a hypothetical pair cannot provide context for a subsequent pronoun clause", () => {
  const quote =
    "If Den and Siffelia are dating. They agreed on an exclusive relationship.";
  const r = run(
    event(quote, {
      targetId: "siffelia",
      kind: "establish",
      milestone: "dating",
      agreement: "exclusive",
      changes: { commitment: 1 },
    }),
    quote,
  );
  assert.equal(r.changed, 0);
});

test("malformed optional participants and legacy field names cannot abort an otherwise valid turn", () => {
  const quote = "Den helped ชีฟ carry the books.";
  assert.equal(run(event(quote), quote, { participants: null }).changed, 1);
  assert.doesNotThrow(() =>
    filterRelationshipBodyOperations(
      [["set", "npcHStats", { npcId: "den", field: 5, value: "invalid" }]],
      [{ kind: "history" }],
      state(),
    ),
  );
});

test("a persona alias also validates the NPC last partner without overwriting the saved player identity", () => {
  const quote = "Den and ชีฟ shared a consensual intimate oral encounter.";
  const r = run(
    event(quote, {
      kind: "intimacy",
      hStats: [
        {
          ownerId: "den",
          field: "mouthLastPartner",
          verb: "set",
          value: "ชีฟ",
        },
      ],
    }),
    quote,
  );
  assert.equal(r.next.npcs[0].hStats.mouthLastPartner, "ชีฟ");
  assert.equal(r.next.player.name, "Player");
});

for (const [kind, quote, changes, field] of [
  ['support','Den ไว้วางใจเอลิอันมากขึ้นหลังจากได้พูดคุยกัน',{trust:1},'trust'],
  ['support','Den เชื่อมั่นในตัวเอลิอันมากขึ้น',{trust:1},'trust'],
  ['support','Den อยู่เคียงข้างเอลิอันและให้กำลังใจเขา',{trust:1},'trust'],
  ['support','Den trusts Elian after their conversation.',{trust:1},'trust'],
  ['romance','Den หลงใหลเอลิอันและแสดงความเสน่หาต่อเขา',{interest:1},'interest'],
  ['romance','Den คิดถึงเอลิอันและยอมรับความรู้สึกนั้น',{love:1},'love'],
]) test('explicit Thai/English feelings update the correct bilingual player: '+quote,()=>{
  const s=state();s.player.name='Elian / เอลิอัน';
  const r=applyRelationshipEvents(s,[event(quote,{kind,changes})],{story:quote,userName:'Elian',source:'thai-case'});
  assert.equal(r.changed,1);assert.deepEqual(r.errors,[]);assert.equal(relationshipLink(r.next,'den','player')[field],1);assert.equal(r.next.player.name,'Elian / เอลิอัน');
});
for(const quote of [
 'Den ชอบชีฟหรือเปล่า?','Den ชอบชีฟมั้ย','Den ชอบชีฟไหมครับ',
 'Does Den love ชีฟ?','Den loves ชีฟ?','Den loves ชีฟ？',
 'Den ไม่ชอบชีฟ','Den ไม่ไว้วางใจชีฟ','Den never trusted ชีฟ.',
])test('questions and negated feelings cannot become confirmed changes: '+quote,()=>{
 const kind=/ไว้|trust/iu.test(quote)?'support':'romance',r=run(event(quote,{kind,changes:{love:1,trust:1}}),quote);
 assert.equal(r.changed,0);assert.equal(r.diagnostics[0].code,'unconfirmed');
});
test('a question cannot supply the pair for a pronoun-based claimed answer',()=>{
 const quote='Do Den and Siffelia love each other? They feel fond of each other.';
 assert.equal(run(event(quote,{targetId:'siffelia',kind:'romance',changes:{love:1}}),quote).changed,0);
});
test('a later question does not erase a completed supported statement',()=>{
 const quote='Den helped ชีฟ carry the books. Does Den love ชีฟ?';
 const r=run(event(quote),quote);assert.equal(r.changed,1);assert.deepEqual(r.errors,[]);
});
test('silk and fire words are not interpreted as Thai question particles',()=>{
 for(const quote of ['Den ช่วยชีฟขนผ้าไหม','Den ช่วยชีฟออกจากกองไฟไหม้'])assert.equal(run(event(quote),quote).changed,1);
});
test('care embedded inside another English word does not confirm support',()=>{
 for(const quote of ['Den was scared of ชีฟ.','Den carelessly ignored ชีฟ.'])assert.equal(run(event(quote),quote).changed,0);
});
test('negative changes of principles stay unconfirmed',()=>{
 const quote='Den ไม่ได้เปลี่ยนหลักการของตนเพื่อชีฟ';
 const r=run(event(quote,{kind:'values',milestone:'values_shift',changes:{corruption:1}}),quote);assert.equal(r.changed,0);
});
test('a rejected proposal keeps only a short evidence excerpt for diagnosis',()=>{
 const quote='Den and ชีฟ say hello. '+ 'x'.repeat(700);
 const r=run(event(quote),quote);assert.equal(r.diagnostics[0].evidence.length,320);assert.equal(r.diagnostics[0].actorId,'den');
});

for(const quote of ['Den ไม่มีความไว้วางใจชีฟ','Den สูญเสียความเชื่อมั่นในชีฟ','Den lost his trust in ชีฟ.','Den no longer trusts ชีฟ.'])test('a withdrawal of trust cannot validate a positive support event: '+quote,()=>{
 assert.equal(run(event(quote),quote).changed,0);
 const s=state();s.npcs[0].trust=10;
 const r=applyRelationshipEvents(s,[event(quote,{kind:'conflict',changes:{trust:-1}})],{story:quote,userName:'ชีฟ',source:'withdrawal'});
 assert.equal(r.changed,1);assert.equal(relationshipLink(r.next,'den','player').trust,9);
});
