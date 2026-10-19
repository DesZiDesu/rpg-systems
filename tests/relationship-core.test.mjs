import test from "node:test";
import assert from "node:assert/strict";
import { H_FIELDS, hStats } from "../src/h-stats.js";
import {
  normalizeRelationships,
  relationshipLink,
  relationshipBond,
  relationshipRanking,
  applyRelationshipEvents,
  editRelationship,
  relationshipPreset,
  validateRelationshipPreset,
  applyRelationshipPreset,
  retainRelationshipEdits,
  relationshipPromptReference,
} from "../src/relationship-core.js";
const state = () => ({
  player: {
    id: "player",
    name: "Alex",
    age: "25",
    hStats: hStats({ oralSexCount: 7 }),
  },
  npcs: [
    {
      id: "mira",
      name: "Mira",
      age: "25",
      enabled: true,
      met: true,
      affection: 80,
      trust: 85,
      loyalty: 90,
      corruption: 0,
      hStats: hStats(),
    },
    {
      id: "kai",
      name: "Kai",
      age: "26",
      enabled: true,
      met: true,
      affection: 10,
      trust: 15,
      loyalty: 20,
      corruption: 0,
      hStats: hStats(),
    },
    { id: "remote", name: "Elin", age: "25", enabled: true, hStats: hStats() },
  ],
  worldClock: { day: 1, time: "10:00" },
  location: { place: "Inn" },
  relationships: normalizeRelationships(),
});
const event = (extra = {}) => ({
  kind: "romance",
  actorId: "mira",
  targetId: "kai",
  evidence: "Mira feels fond of Kai.",
  changes: { love: 1, interest: 1 },
  ...extra,
});
const run = (s, e, source = "turn-1", story = e.evidence) =>
  applyRelationshipEvents(s, Array.isArray(e) ? e : [e], {
    story,
    source,
    at: "2026-10-19T14:00:00Z",
  });
const couple = () =>
  editRelationship(state(), {
    actorId: "mira",
    targetId: "player",
    values: { love: 80, trust: 85, commitment: 90, interest: 60 },
    bond: { status: "dating", agreement: "exclusive" },
  });

test("legacy values remain readable without turning five default hearts into a couple or an affair", () => {
  const s = state();
  s.npcs[0].hStats = hStats({ loyaltyHearts: 5, infidelityStage: 5 });
  const before = structuredClone(s);
  assert.equal(relationshipLink(s, "mira", "player").love, 80);
  assert.equal(relationshipLink(s, "mira", "kai").love, null);
  assert.equal(relationshipBond(s, "mira", "player").status, "unknown");
  assert.deepEqual(s, before);
});
test("NPC feelings toward NPCs are directed and do not change the player or another pair", () => {
  const s = state(),
    before = structuredClone(s),
    r = run(s, event());
  assert.equal(relationshipLink(r.next, "mira", "kai").love, 1);
  assert.equal(relationshipLink(r.next, "kai", "mira").love, null);
  assert.deepEqual(r.next.player, before.player);
  assert.equal(relationshipLink(r.next, "mira", "player").love, 80);
  assert.deepEqual(s, before);
});
test("love and interest have independent rankings, and ties are retained for presentation", () => {
  let s = state();
  for (const [targetId, love, interest] of [
    ["player", 80, 20],
    ["kai", 30, 90],
    ["remote", 30, 90],
  ])
    s = editRelationship(s, {
      actorId: "mira",
      targetId,
      values: { love, interest, trust: 30, commitment: 20 },
    });
  assert.equal(relationshipRanking(s, "mira", "love")[0].targetId, "player");
  assert.equal(
    relationshipRanking(s, "mira", "interest").filter((v) => v.interest === 90)
      .length,
    2,
  );
});
test("Slow progression caps the sum of gains across replies in one continuous scene", () => {
  let s = state();
  for (let i = 0; i < 5; i++) {
    const e = event({
      evidence: `Mira feels fond of Kai after meaningful moment ${i}.`,
      changes: { love: 2, interest: 2, trust: 2 },
    });
    s = run(s, e, "turn-" + i).next;
  }
  const row = relationshipLink(s, "mira", "kai");
  assert.equal((row.love || 0) + (row.interest || 0) + (row.trust || 0), 3);
});
test("same-source receipts cannot be evaded by supplying a different model event ID", () => {
  const e = event(),
    s = run(state(), e).next,
    r = run(s, { ...e, id: "a-different-ai-id" });
  assert.equal(r.changed, 0);
  assert.deepEqual(r.next, s);
});
test("ordinary replies avoid cloning the working NPC state", () => {
  const s = state(),
    original = globalThis.structuredClone;
  let n = 0;
  globalThis.structuredClone = (v) => {
    n++;
    return original(v);
  };
  try {
    assert.equal(
      applyRelationshipEvents(s, [], { story: "A quiet day.", source: "x" })
        .next,
      s,
    );
    assert.equal(n, 0);
  } finally {
    globalThis.structuredClone = original;
  }
});
for (const [label, extra, story] of [
  ["not in the reply", {}, "No romantic exchange happened."],
  ["unknown actor", { actorId: "missing" }, null],
  ["unknown target", { targetId: "missing" }, null],
  ["self relationship", { targetId: "mira" }, null],
  ["hypothetical", { evidence: "If Mira feels fond of Kai." }, null],
  ["future", { evidence: "Mira will confess love to Kai." }, null],
  ["rumor", { evidence: "A rumor says Mira feels fond of Kai." }, null],
  ["no relevant event", { evidence: "Mira and Kai say hello." }, null],
  ["missing counterpart", { evidence: "Mira feels fond of someone." }, null],
])
  test("unconfirmed relationship event is rejected: " + label, () => {
    const s = state(),
      e = event(extra),
      r = run(s, e, "bad", story ?? e.evidence);
    assert.equal(r.changed, 0);
    assert.equal(r.next, s);
  });
test("a disabled NPC and disabled tracking cannot be changed by a story event", () => {
  const s = state();
  s.npcs[0].enabled = false;
  assert.equal(run(s, event()).changed, 0);
  s.npcs[0].enabled = true;
  s.relationships.config.enabled = false;
  assert.equal(run(s, event()).changed, 0);
});
test("greetings do not create automatic growth, even when proposed as romance", () => {
  const e = event({ evidence: "Mira compliments Kai politely." });
  assert.equal(run(state(), e).changed, 0);
});
test("Love cannot skip openness and mutual milestones; an existing imported value is never lowered by its cap", () => {
  let s = editRelationship(state(), {
    actorId: "mira",
    targetId: "kai",
    values: { love: 19.5, interest: 0, trust: 0, commitment: 0 },
  });
  s = run(s, event({ changes: { love: 100 } })).next;
  assert.equal(relationshipLink(s, "mira", "kai").love, 20);
  assert.equal(s.relationships.budgets[0].spent, 0.5);
  s = run(
    s,
    event({
      evidence: "Mira confides a personal secret to Kai and feels fond of Kai.",
      milestone: "openness",
      changes: { love: 3 },
    }),
    "next",
  ).next;
  assert.equal(relationshipLink(s, "mira", "kai").love, 21);
  const c = run(
    couple(),
    event({
      targetId: "player",
      evidence: "Mira feels love for Alex.",
      changes: { love: 1 },
    }),
  );
  assert.equal(relationshipLink(c.next, "mira", "player").love, 81);
});
test("an intimacy event records the NPC pair and both applicable counters, leaving all player counters intact", () => {
  const s = state(),
    e = {
      kind: "intimacy",
      actorId: "mira",
      targetId: "kai",
      evidence: "Mira and Kai share a consensual oral intimate encounter.",
      changes: { love: 100, trust: 100 },
      hStats: [
        { ownerId: "mira", field: "oralSexCount", verb: "inc", value: 1 },
        { ownerId: "kai", field: "oralSexCount", verb: "inc", value: 1 },
        { ownerId: "player", field: "oralSexCount", verb: "inc", value: 1 },
      ],
    },
    r = run(s, e);
  assert.equal(r.next.npcs[0].hStats.oralSexCount, 1);
  assert.equal(r.next.npcs[1].hStats.oralSexCount, 1);
  assert.equal(r.next.player.hStats.oralSexCount, 7);
  for (const [a, b] of [
    ["mira", "kai"],
    ["kai", "mira"],
  ])
    assert.equal(relationshipLink(r.next, a, b).encounters, 1);
  assert.equal(relationshipLink(r.next, "mira", "kai").love, null);
  assert.equal(run(r.next, e).changed, 0);
});
test("an unrelated physical counter and duplicate field in one encounter cannot be fabricated", () => {
  const e = {
      kind: "intimacy",
      actorId: "mira",
      targetId: "kai",
      evidence: "Mira and Kai share a consensual oral intimate encounter.",
      hStats: [
        { ownerId: "mira", field: "oralSexCount", verb: "inc", value: 1 },
        { ownerId: "mira", field: "oralSexCount", verb: "inc", value: 1 },
        { ownerId: "mira", field: "analSexCount", verb: "inc", value: 1 },
        { ownerId: "mira", field: "loyaltyHearts", verb: "set", value: 0 },
      ],
    },
    r = run(state(), e);
  assert.equal(r.next.npcs[0].hStats.oralSexCount, 1);
  assert.equal(r.next.npcs[0].hStats.analSexCount, null);
  assert.equal(r.next.npcs[0].hStats.loyaltyHearts, null);
});
test("pregnancy and parentage from an NPC-only history event are not a new encounter or player parentage", () => {
  const e = {
      kind: "history",
      actorId: "mira",
      targetId: "kai",
      evidence: "Mira is confirmed pregnant and Kai is the other parent.",
      hStats: [
        { ownerId: "mira", field: "pregnant", verb: "set", value: true },
        {
          ownerId: "mira",
          field: "pregnancyFather",
          verb: "set",
          value: "Kai",
        },
      ],
    },
    r = run(state(), e);
  assert.equal(r.next.npcs[0].hStats.pregnant, true);
  assert.equal(r.next.npcs[0].hStats.pregnancyFather, "Kai");
  assert.equal(relationshipLink(r.next, "mira", "kai").encounters, 0);
  assert.equal(r.next.player.hStats.pregnant, null);
});
test("private fantasies and forced acts never become consensual encounters, romantic decisions or betrayal", () => {
  for (const evidence of [
    "Mira and Kai dream of an intimate encounter.",
    "Mira and Kai share a forced intimate encounter.",
  ]) {
    const e = { kind: "intimacy", actorId: "mira", targetId: "kai", evidence };
    assert.equal(run(state(), e).changed, 0);
  }
});
test("establishing a bond needs an actual relationship milestone, not just agreement to have lunch", () => {
  const e = {
    kind: "establish",
    actorId: "mira",
    targetId: "kai",
    evidence: "Mira and Kai agreed to have lunch.",
    milestone: "dating",
    changes: { love: 100 },
  };
  assert.equal(run(state(), e).changed, 0);
});
test("dating and exclusivity are established explicitly and never guessed from high scores", () => {
  const e = {
      kind: "establish",
      actorId: "mira",
      targetId: "kai",
      evidence:
        "Mira and Kai agreed to become exclusive partners and are dating.",
      milestone: "dating",
      agreement: "exclusive",
    },
    r = run(state(), e);
  assert.equal(relationshipBond(r.next, "mira", "kai").status, "dating");
  assert.equal(relationshipBond(r.next, "kai", "mira").agreement, "exclusive");
  const noAgreement = run(state(), {
    ...e,
    evidence: "Mira and Kai agreed to become partners and are dating.",
  }).next;
  assert.equal(
    relationshipBond(noAgreement, "mira", "kai").agreement,
    "unknown",
  );
});
test("a confirmed NPC-only betrayal changes the betrayer commitment and never invents the unaware player response", () => {
  const s = couple(),
    e = {
      kind: "betrayal",
      actorId: "mira",
      targetId: "player",
      thirdPartyId: "kai",
      milestone: "boundary_crossed",
      evidence: "Mira betrayed Alex by beginning an affair with Kai.",
      changes: { commitment: -6, trust: -100 },
    },
    r = run(s, e);
  assert.equal(relationshipLink(r.next, "mira", "player").commitment, 84);
  assert.equal(relationshipLink(r.next, "mira", "player").trust, 85);
  assert.equal(relationshipBond(r.next, "mira", "player").breach, true);
  assert.deepEqual(r.next.player, s.player);
  assert.equal(relationshipLink(r.next, "player", "mira").trust, null);
});
test("betrayal requires the original exclusive bond, known third person and card/NPC permission", () => {
  const e = {
    kind: "betrayal",
    actorId: "mira",
    targetId: "player",
    thirdPartyId: "kai",
    milestone: "boundary_crossed",
    evidence: "Mira betrayed Alex by beginning an affair with Kai.",
    changes: { commitment: -6 },
  };
  assert.equal(run(state(), e).changed, 0);
  let s = couple();
  s.relationships.config.allowInfidelity = false;
  assert.equal(run(s, e).changed, 0);
  s = couple();
  s.relationships.profiles.mira = { allowInfidelity: false };
  assert.equal(run(s, e).changed, 0);
});
test("the partner learns about an actual breach independently through a discovery event", () => {
  let s = state();
  s = editRelationship(s, {
    actorId: "player",
    targetId: "mira",
    values: { trust: 80 },
  });
  const quote =
    "Alex discovered that Mira had betrayed their agreement with Kai.";
  const r = run(
    s,
    {
      actorId: "player",
      targetId: "mira",
      kind: "discovery",
      changes: { trust: -9 },
      evidence: quote,
    },
    "discovery",
  );
  assert.equal(relationshipLink(r.next, "player", "mira").trust, 77);
  assert.equal(
    relationshipLink(r.next, "mira", "player").trust,
    s.npcs[0].trust,
  );
});
test("Corruption follows a confirmed change of principles and respects a steadfast NPC policy", () => {
  const e = {
    kind: "values",
    actorId: "mira",
    milestone: "values_shift",
    evidence: "Mira changes her principles after reconsidering her beliefs.",
    changes: { corruption: 4 },
  };
  let s = state();
  assert.equal(run(s, e).next.npcs[0].corruption, 2);
  s.relationships.profiles.mira = { resistance: 100, corruption: 0 };
  assert.equal(run(s, e).next.npcs[0].corruption, 0);
  assert.equal(
    run(state(), { ...e, evidence: "Mira stands firmly by her principles." })
      .changed,
    0,
  );
});
test("manual choices and presets preserve unknowns, history and existing played pairs", () => {
  let s = editRelationship(state(), {
    actorId: "mira",
    targetId: "kai",
    values: { love: 45 },
    bond: { status: "dating", agreement: "open" },
  });
  const p = relationshipPreset(s),
    round = validateRelationshipPreset(JSON.parse(JSON.stringify(p)));
  assert.equal(round.links[0].love, 45);
  assert.equal(round.history, undefined);
  let old = editRelationship(state(), {
    actorId: "mira",
    targetId: "kai",
    values: { love: 60 },
  });
  old = applyRelationshipPreset(old, round);
  assert.equal(relationshipLink(old, "mira", "kai").love, 60);
  assert.equal(relationshipBond(old, "mira", "kai").agreement, "open");
  assert.throws(
    () =>
      editRelationship(s, {
        actorId: "mira",
        targetId: "kai",
        values: { love: 101 },
      }),
    /0–100/,
  );
});
test("unsafe keys, duplicate pair seeds and malformed score seeds are rejected", () => {
  const s = state(),
    p = relationshipPreset(s);
  assert.equal(
    Object.hasOwn(
      normalizeRelationships(
        JSON.parse('{"profiles":{"__proto__":{"resistance":10}}}'),
      ).profiles,
      "__proto__",
    ),
    false,
  );
  const link = { actorId: "mira", targetId: "kai", love: 120 };
  assert.throws(
    () => validateRelationshipPreset({ ...p, links: [link] }),
    /0–100/,
  );
  assert.throws(
    () =>
      validateRelationshipPreset({
        ...p,
        links: [
          { ...link, love: 30 },
          { ...link, love: 40 },
        ],
      }),
    /duplicate/,
  );
});
test("manual relationship edits survive snapshots without restoring NPC dossier or version data", () => {
  const s = editRelationship(state(), {
      actorId: "mira",
      targetId: "kai",
      values: { love: 45 },
    }),
    snapshot = {
      npcs: [
        { id: "mira", background: "Earlier story", activeAlternateId: "old" },
      ],
      relationships: normalizeRelationships(),
    },
    history = {
      entries: [
        {
          baseState: snapshot,
          variants: { 0: { state: structuredClone(snapshot) } },
        },
      ],
    };
  retainRelationshipEdits(history, s, { actorId: "mira", targetId: "kai" });
  for (const x of [
    history.entries[0].baseState,
    history.entries[0].variants[0].state,
  ]) {
    assert.equal(relationshipLink(x, "mira", "kai").love, 45);
    assert.equal(x.npcs[0].background, "Earlier story");
    assert.equal(x.npcs[0].activeAlternateId, "old");
  }
});
test("the model reference includes only relevant pair IDs and bounded recent events", () => {
  let s = editRelationship(state(), {
    actorId: "mira",
    targetId: "kai",
    values: { love: 4 },
  });
  s = editRelationship(s, {
    actorId: "mira",
    targetId: "remote",
    values: { love: 9 },
  });
  const p = relationshipPromptReference(s, [s.npcs[0], s.npcs[1]]);
  assert.equal(p.links.length, 4);
  assert.equal(p.links[0].targetId, "kai");
  assert.equal(
    p.links.some((v) => v.targetId === "remote"),
    true,
  );
  assert.equal(
    p.links.find((v) => v.actorId === "mira" && v.targetId === "player").love,
    80,
  );
});
test("saving a manual metric preserves each swipe variant encounter count and milestones", () => {
  let current = editRelationship(state(), {
    actorId: "mira",
    targetId: "kai",
    values: { trust: 72 },
  });
  current.relationships.links[0].encounters = 0;
  const old = structuredClone(current);
  old.relationships.links[0].trust = 40;
  old.relationships.links[0].encounters = 3;
  old.relationships.links[0].milestones = ["openness"];
  const history = { entries: [{ baseState: old, variants: {} }] };
  retainRelationshipEdits(history, current, {
    actorId: "mira",
    targetId: "kai",
    fields: ["trust"],
    retainBond: false,
  });
  assert.equal(old.relationships.links[0].trust, 72);
  assert.equal(old.relationships.links[0].encounters, 3);
  assert.deepEqual(old.relationships.links[0].milestones, ["openness"]);
});
test("reciprocal copies of one encounter coalesce both participant counter updates once", () => {
  const s = state(),
    quote = "Mira and Kai shared a consensual intimate oral encounter.",
    a = {
      actorId: "mira",
      targetId: "kai",
      kind: "intimacy",
      evidence: quote,
      hStats: [
        { ownerId: "mira", field: "oralSexCount", verb: "inc", value: 1 },
      ],
    },
    b = {
      ...a,
      actorId: "kai",
      targetId: "mira",
      hStats: [
        { ownerId: "kai", field: "oralSexCount", verb: "inc", value: 1 },
      ],
    };
  const r = run(s, [a, b], "reciprocal", quote);
  assert.equal(r.changed, 1);
  assert.equal(r.next.npcs[0].hStats.oralSexCount, 1);
  assert.equal(r.next.npcs[1].hStats.oralSexCount, 1);
  assert.equal(relationshipLink(r.next, "mira", "kai").encounters, 1);
});
test("a similar Latin name and a negated confession are not relationship evidence", () => {
  const s = state();
  for (const quote of [
    "Miranda feels fond of Kai.",
    "Mira does not love Kai.",
    "Mira never felt love for Kai.",
  ]) {
    const r = run(s, event({ evidence: quote }), "negative", quote);
    assert.equal(r.changed, 0);
  }
});
test("manual selected-version legacy meters change without touching the original dossier or selection", () => {
  const s = state();
  s.npcs[0].activeAlternateId = "future";
  s.npcs[0].alternateProfiles = [
    {
      id: "future",
      label: "Future",
      fields: { affection: 40, trust: 30, corruption: 20 },
    },
  ];
  assert.equal(relationshipLink(s, "mira", "player").love, 40);
  const next = editRelationship(s, {
    actorId: "mira",
    targetId: "player",
    values: { trust: 60 },
  });
  assert.equal(next.npcs[0].trust, 85);
  assert.equal(next.npcs[0].alternateProfiles[0].fields.trust, 60);
  assert.equal(next.npcs[0].activeAlternateId, "future");
});
test("malformed event H-Stats arrays are handled without throwing, and invalid policies are rejected", () => {
  const s = state();
  assert.doesNotThrow(() => run(s, event({ hStats: {} })));
  const p = relationshipPreset(s);
  p.profiles = {
    mira: { resistance: 101, anchor: "", allowInfidelity: true, corruption: 0 },
  };
  assert.throws(() => validateRelationshipPreset(p), /profile/);
  assert.throws(
    () =>
      editRelationship(s, {
        actorId: "mira",
        profile: { corruption: 400, resistance: 50 },
      }),
    /Corruption/,
  );
});
test("an updated preset changes canon policies while preserving live Corruption and played pair values", () => {
  let s = editRelationship(state(), {
    actorId: "mira",
    targetId: "kai",
    values: { love: 35 },
    profile: {
      resistance: 50,
      allowInfidelity: true,
      anchor: "Original",
      corruption: 22,
    },
  });
  const p = relationshipPreset(s);
  p.profiles.mira = {
    resistance: 100,
    allowInfidelity: false,
    anchor: "Steadfast",
    corruption: 0,
  };
  p.links[0].love = 1;
  const next = applyRelationshipPreset(s, p);
  assert.equal(next.relationships.profiles.mira.corruption, 22);
  assert.equal(next.relationships.profiles.mira.resistance, 100);
  assert.equal(next.relationships.profiles.mira.allowInfidelity, false);
  assert.equal(relationshipLink(next, "mira", "kai").love, 35);
});
test("an NPC-only parentage event cannot silently substitute the player as the other parent", () => {
  const s = state(),
    e = {
      actorId: "mira",
      targetId: "kai",
      kind: "history",
      evidence: "Mira is confirmed pregnant and Kai is the other parent.",
      hStats: [
        { ownerId: "mira", field: "pregnant", verb: "set", value: true },
        {
          ownerId: "mira",
          field: "pregnancyFather",
          verb: "set",
          value: "Alex",
        },
      ],
    },
    r = run(s, e);
  assert.equal(r.next.npcs[0].hStats.pregnant, true);
  assert.equal(r.next.npcs[0].hStats.pregnancyFather, "");
  assert.deepEqual(r.next.player, s.player);
});
test("a manual re-extraction of a different exact quote from one encounter is still received only once", () => {
  const s = state(),
    quote = "Mira and Kai shared a consensual intimate oral encounter.",
    story = quote + " Mira and Kai enjoyed the same intimate encounter.",
    e = {
      actorId: "mira",
      targetId: "kai",
      kind: "intimacy",
      evidence: quote,
      hStats: [
        { ownerId: "mira", field: "oralSexCount", verb: "inc", value: 1 },
      ],
    },
    first = run(s, e, "same-turn", story),
    again = run(
      first.next,
      { ...e, evidence: "Mira and Kai enjoyed the same intimate encounter." },
      "same-turn",
      story,
    );
  assert.equal(again.changed, 0);
  assert.equal(again.next.npcs[0].hStats.oralSexCount, 1);
  assert.equal(relationshipLink(again.next, "mira", "kai").encounters, 1);
});
test("an off-scene spouse stays in the model commitment reference using a lightweight identity only", () => {
  const s = state();
  s.relationships = normalizeRelationships({
    bonds: [
      {
        a: "mira",
        b: "away-spouse",
        status: "married",
        agreement: "exclusive",
      },
    ],
    links: [{ actorId: "mira", targetId: "away-spouse", love: 90 }],
  });
  const p = relationshipPromptReference(
    s,
    [s.npcs[0]],
    [
      {
        id: "away-spouse",
        name: "Off-scene spouse",
        background: "MUST NOT SEND DOSSIER",
      },
      { id: "unrelated", name: "Unrelated" },
    ],
  );
  assert.equal(p.bonds[0].b, "away-spouse");
  assert.equal(p.links[0].targetId, "away-spouse");
  assert(p.people.some((v) => v.id === "away-spouse"));
  assert.equal(JSON.stringify(p).includes("MUST NOT SEND DOSSIER"), false);
  assert.equal(JSON.stringify(p).includes("Unrelated"), false);
});
