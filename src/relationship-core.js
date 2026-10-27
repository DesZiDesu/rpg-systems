import { H_FIELD_MAP, updateHStat } from "./h-stats.js?v=0.89.2";
import { parseStory } from "./npc-core.js?v=0.89.2";

const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const clean = (v, max = 180) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const id = (v) =>
  typeof v === "string" &&
  v.length <= 160 &&
  v.trim() &&
  !["__proto__", "constructor", "prototype"].includes(v)
    ? v.trim()
    : "";
const score = (v) =>
  v !== null && v !== "" && v !== undefined && Number.isFinite(Number(v))
    ? Math.min(100, Math.max(0, Math.round(Number(v) * 10) / 10))
    : null;
const integer = (v, min, max, fallback) =>
  Number.isInteger(v) && v >= min && v <= max ? v : fallback;
const textKey = (v) =>
  String(v ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
const hash = (v) => {
  let h = 2166136261;
  for (const c of String(v)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};
export const RELATIONSHIP_METRICS = Object.freeze([
  "love",
  "interest",
  "trust",
  "commitment",
]);
export const LEGACY_BOND_FIELDS = Object.freeze([
  "loyaltyHearts",
  "infidelityStage",
  "infidelityProgress",
]);
export const RELATIONSHIP_STATUSES = Object.freeze([
  "unknown",
  "friends",
  "interested",
  "dating",
  "married",
  "separated",
]);
const milestones = new Set([
  "openness",
  "kept_promise",
  "mutual_interest",
  "dating",
  "married",
  "boundary_crossed",
  "values_shift",
  "repair",
]);
const kinds = new Set([
  "support",
  "romance",
  "promise",
  "conflict",
  "betrayal",
  "discovery",
  "intimacy",
  "history",
  "values",
  "establish",
  "separate",
  "repair",
]);
export const relationshipPairKey = (a, b) => JSON.stringify([a, b]);
export const relationshipBondKey = (a, b) => JSON.stringify([a, b].sort());
export function normalizeRelationshipConfig(raw = {}) {
  const pace = ["slow", "balanced", "custom"].includes(raw?.pace)
      ? raw.pace
      : "slow",
    normal = pace === "balanced" ? 6 : 3,
    major = pace === "balanced" ? 10 : 6;
  return {
    enabled: raw?.enabled !== false,
    pace,
    sceneGain:
      pace === "custom" ? integer(raw.sceneGain, 1, 20, normal) : normal,
    majorGain: pace === "custom" ? integer(raw.majorGain, 1, 30, major) : major,
    allowInfidelity: raw?.allowInfidelity !== false,
  };
}
function normalizeLink(raw) {
  if (
    !object(raw) ||
    !id(raw.actorId) ||
    !id(raw.targetId) ||
    raw.actorId === raw.targetId
  )
    return null;
  return {
    actorId: id(raw.actorId),
    targetId: id(raw.targetId),
    ...Object.fromEntries(RELATIONSHIP_METRICS.map((k) => [k, score(raw[k])])),
    milestones: [
      ...new Set(
        (Array.isArray(raw.milestones) ? raw.milestones : []).filter((v) =>
          milestones.has(v),
        ),
      ),
    ],
    encounters: integer(raw.encounters, 0, 999999999, 0),
    origin: ["manual", "legacy", "card", "story"].includes(raw.origin)
      ? raw.origin
      : "card",
    lastReason: clean(raw.lastReason, 500),
  };
}
function normalizeBond(raw) {
  if (!object(raw) || !id(raw.a) || !id(raw.b) || raw.a === raw.b) return null;
  return {
    a: id(raw.a),
    b: id(raw.b),
    status: RELATIONSHIP_STATUSES.includes(raw.status) ? raw.status : "unknown",
    agreement: ["unknown", "exclusive", "open"].includes(raw.agreement)
      ? raw.agreement
      : "unknown",
    breach: raw.breach === true,
    repairing: raw.repairing === true,
    lastReason: clean(raw.lastReason, 500),
  };
}
const unique = (rows, normalize, key) => {
  const seen = new Map();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const row = normalize(raw);
    if (row) seen.set(key(row), row);
  }
  return [...seen.values()];
};
export function normalizeRelationships(raw = {}) {
  raw = object(raw) ? raw : {};
  const profiles = {};
  for (const [actor, value] of Object.entries(
    object(raw.profiles) ? raw.profiles : {},
  ))
    if (id(actor) && object(value))
      profiles[actor] = {
        corruption: score(value.corruption),
        resistance: integer(value.resistance, 0, 100, 50),
        allowInfidelity: value.allowInfidelity !== false,
        anchor: clean(value.anchor, 400),
      };
  return {
    version: 1,
    config: normalizeRelationshipConfig(raw.config),
    links: unique(raw.links, normalizeLink, (v) =>
      relationshipPairKey(v.actorId, v.targetId),
    ),
    bonds: unique(raw.bonds, normalizeBond, (v) =>
      relationshipBondKey(v.a, v.b),
    ),
    profiles,
    receipts: [
      ...new Set(
        (Array.isArray(raw.receipts) ? raw.receipts : [])
          .map((v) => clean(v, 220))
          .filter(Boolean),
      ),
    ].slice(-1500),
    history: (Array.isArray(raw.history) ? raw.history : [])
      .filter(object)
      .slice(-250)
      .map((v) => ({
        id: clean(v.id, 220),
        actorId: id(v.actorId),
        targetId: id(v.targetId),
        kind: clean(v.kind, 40),
        evidence: clean(v.evidence, 1500),
        reason: clean(v.reason, 500),
        changes: object(v.changes)
          ? Object.fromEntries(
              Object.entries(v.changes).filter(
                ([k, n]) =>
                  [
                    ...RELATIONSHIP_METRICS,
                    "corruption",
                    "encounters",
                  ].includes(k) && Number.isFinite(n),
              ),
            )
          : {},
        at: clean(v.at, 60),
        source: clean(v.source, 200),
      })),
    budgets: (Array.isArray(raw.budgets) ? raw.budgets : [])
      .filter((v) => object(v) && id(v.actorId) && id(v.targetId))
      .slice(-200)
      .map((v) => ({
        actorId: id(v.actorId),
        targetId: id(v.targetId),
        scene: clean(v.scene, 220),
        spent: score(v.spent) ?? 0,
        kinds: object(v.kinds)
          ? Object.fromEntries(
              Object.entries(v.kinds).filter(
                ([k, n]) =>
                  kinds.has(k) && Number.isInteger(n) && n >= 0 && n <= 100,
              ),
            )
          : {},
      })),
  };
}
export function relationshipPeople(state) {
  return new Map([
    ["player", state.player],
    ...(state.npcs || []).filter((n) => n?.id).map((n) => [n.id, n]),
  ]);
}
export function relationshipLink(state, actorId, targetId) {
  const stored = state.relationships?.links?.find(
    (v) => v.actorId === actorId && v.targetId === targetId,
  );
  if (stored) return normalizeLink(stored);
  const record = relationshipPeople(state).get(actorId),
    selected = record?.alternateProfiles?.find(
      (v) => v.id === record.activeAlternateId,
    ),
    actor = selected ? { ...record, ...selected.fields } : record,
    legacy = targetId === "player" && actorId !== "player" && actor;
  return normalizeLink({
    actorId,
    targetId,
    love: legacy ? score(actor.affection) : null,
    trust: legacy ? score(actor.trust) : null,
    commitment: legacy ? score(actor.loyalty) : null,
    origin: legacy ? "legacy" : "story",
  });
}
export function relationshipBond(state, a, b) {
  return (
    state.relationships?.bonds?.find(
      (v) => relationshipBondKey(v.a, v.b) === relationshipBondKey(a, b),
    ) || {
      a,
      b,
      status: "unknown",
      agreement: "unknown",
      breach: false,
      repairing: false,
    }
  );
}
export function relationshipProfile(state, actorId) {
  const record = relationshipPeople(state).get(actorId),
    selected = record?.alternateProfiles?.find(
      (v) => v.id === record.activeAlternateId,
    ),
    actor = selected ? { ...record, ...selected.fields } : record,
    p = state.relationships?.profiles?.[actorId];
  return {
    corruption: score(
      p && Object.hasOwn(p, "corruption") ? p.corruption : actor?.corruption,
    ),
    resistance: integer(p?.resistance, 0, 100, 50),
    allowInfidelity: p?.allowInfidelity !== false,
    anchor: clean(p?.anchor, 400),
  };
}
export function relationshipRanking(state, actorId, metric = "love") {
  if (!["love", "interest"].includes(metric)) return [];
  const ids = new Set(
    (state.relationships?.links || [])
      .filter((v) => v.actorId === actorId)
      .map((v) => v.targetId),
  );
  if (actorId !== "player") ids.add("player");
  return [...ids]
    .map((targetId) => relationshipLink(state, actorId, targetId))
    .filter((v) => v?.[metric] > 0)
    .sort(
      (a, b) => b[metric] - a[metric] || a.targetId.localeCompare(b.targetId),
    );
}
function setLink(graph, link) {
  const i = graph.links.findIndex(
    (v) => v.actorId === link.actorId && v.targetId === link.targetId,
  );
  if (i < 0) graph.links.push(link);
  else graph.links[i] = link;
}
function setBond(graph, bond) {
  const key = relationshipBondKey(bond.a, bond.b),
    i = graph.bonds.findIndex((v) => relationshipBondKey(v.a, v.b) === key);
  if (i < 0) graph.bonds.push(bond);
  else graph.bonds[i] = bond;
}
export function relationshipPreset(state) {
  const r = normalizeRelationships(state.relationships);
  return {
    version: 1,
    config: r.config,
    profiles: r.profiles,
    links: r.links.map((v) => ({ ...v, origin: "card" })),
    bonds: r.bonds,
  };
}
export function validateRelationshipPreset(raw) {
  if (
    !object(raw) ||
    raw.version !== 1 ||
    !object(raw.config) ||
    !Array.isArray(raw.links) ||
    !Array.isArray(raw.bonds) ||
    !object(raw.profiles)
  )
    throw Error("Invalid relationship preset. / Preset ความสัมพันธ์ไม่ถูกต้อง");
  const next = normalizeRelationships(raw);
  if (
    next.links.length !== raw.links.length ||
    next.bonds.length !== raw.bonds.length ||
    Object.keys(next.profiles).length !== Object.keys(raw.profiles).length
  )
    throw Error("Invalid or duplicate relationship identities.");
  for (const row of raw.links)
    for (const k of RELATIONSHIP_METRICS)
      if (
        row[k] !== undefined &&
        row[k] !== null &&
        (!Number.isFinite(row[k]) || row[k] < 0 || row[k] > 100)
      )
        throw Error("Relationship values must be 0–100 or unknown.");
  if (
    !["slow", "balanced", "custom"].includes(raw.config.pace) ||
    typeof raw.config.enabled !== "boolean" ||
    typeof raw.config.allowInfidelity !== "boolean" ||
    !Number.isInteger(raw.config.sceneGain) ||
    !Number.isInteger(raw.config.majorGain) ||
    raw.config.sceneGain < 1 ||
    raw.config.sceneGain > 20 ||
    raw.config.majorGain < 1 ||
    raw.config.majorGain > 30
  )
    throw Error("Invalid relationship pace.");
  for (const row of raw.bonds)
    if (
      !RELATIONSHIP_STATUSES.includes(row.status) ||
      !["unknown", "exclusive", "open"].includes(row.agreement) ||
      ["breach", "repairing"].some(
        (k) => row[k] !== undefined && typeof row[k] !== "boolean",
      )
    )
      throw Error("Invalid relationship agreement.");
  for (const p of Object.values(raw.profiles))
    if (
      !object(p) ||
      !Number.isInteger(p.resistance) ||
      p.resistance < 0 ||
      p.resistance > 100 ||
      typeof p.allowInfidelity !== "boolean" ||
      typeof p.anchor !== "string" ||
      p.anchor.length > 400 ||
      (p.corruption !== null &&
        p.corruption !== undefined &&
        (!Number.isFinite(p.corruption) ||
          p.corruption < 0 ||
          p.corruption > 100))
    )
      throw Error("Invalid relationship profile.");
  return {
    version: 1,
    config: next.config,
    profiles: next.profiles,
    links: next.links,
    bonds: next.bonds,
  };
}
export function applyRelationshipPreset(state, preset) {
  const p = validateRelationshipPreset(preset),
    r = normalizeRelationships(state.relationships);
  r.config = p.config;
  // Presets supply missing seeds, never replace relationships already played.
  for (const link of p.links)
    if (
      !r.links.some(
        (v) => v.actorId === link.actorId && v.targetId === link.targetId,
      )
    )
      r.links.push(link);
  for (const bond of p.bonds)
    if (
      !r.bonds.some(
        (v) =>
          relationshipBondKey(v.a, v.b) === relationshipBondKey(bond.a, bond.b),
      )
    )
      r.bonds.push(bond);
  for (const [actor, profile] of Object.entries(p.profiles))
    r.profiles[actor] = {
      ...profile,
      corruption: r.profiles[actor]?.corruption ?? profile.corruption,
    };
  return { ...state, relationships: r };
}
export function editRelationship(
  state,
  { actorId, targetId, values, bond, profile, config },
  { reason = "Manual edit", at = new Date().toISOString() } = {},
) {
  const people = relationshipPeople(state);
  if (
    !people.has(actorId) ||
    (targetId && (!people.has(targetId) || actorId === targetId))
  )
    throw Error("Select two different characters. / เลือกตัวละครคนละคน");
  const next = structuredClone(state),
    r = (next.relationships = normalizeRelationships(next.relationships));
  if (values) {
    if (!targetId) throw Error("Choose a relationship target.");
    for (const k of RELATIONSHIP_METRICS)
      if (
        Object.hasOwn(values, k) &&
        values[k] !== null &&
        values[k] !== "" &&
        (!Number.isFinite(Number(values[k])) ||
          Number(values[k]) < 0 ||
          Number(values[k]) > 100)
      )
        throw Error("Values must be 0–100.");
    const link = normalizeLink({
      ...relationshipLink(state, actorId, targetId),
      ...values,
      origin: "manual",
      lastReason: reason,
    });
    setLink(r, link);
    if (targetId === "player" && actorId !== "player") {
      const n = next.npcs.find((n) => n.id === actorId);
      for (const [k, legacy] of [
        ["love", "affection"],
        ["trust", "trust"],
        ["commitment", "loyalty"],
      ])
        if (Object.hasOwn(values, k) && link[k] !== null)
          writeLegacy(n, legacy, link[k]);
    }
  }
  if (bond) {
    if (
      !targetId ||
      !RELATIONSHIP_STATUSES.includes(bond.status) ||
      !["unknown", "exclusive", "open"].includes(bond.agreement)
    )
      throw Error("Invalid relationship status.");
    setBond(
      r,
      normalizeBond({ ...bond, a: actorId, b: targetId, lastReason: reason }),
    );
  }
  if (profile) {
    if (
      Object.hasOwn(profile, "corruption") &&
      profile.corruption !== null &&
      profile.corruption !== "" &&
      (!Number.isFinite(Number(profile.corruption)) ||
        Number(profile.corruption) < 0 ||
        Number(profile.corruption) > 100)
    )
      throw Error("Corruption must be 0–100.");
    if (
      !Number.isInteger(Number(profile.resistance)) ||
      Number(profile.resistance) < 0 ||
      Number(profile.resistance) > 100
    )
      throw Error("Resistance must be 0–100.");
    r.profiles[actorId] = {
      ...relationshipProfile(state, actorId),
      ...profile,
      resistance: Number(profile.resistance),
      corruption: Object.hasOwn(profile, "corruption")
        ? score(profile.corruption)
        : relationshipProfile(state, actorId).corruption,
    };
    if (actorId !== "player" && r.profiles[actorId].corruption !== null)
      writeLegacy(
        next.npcs.find((n) => n.id === actorId),
        "corruption",
        r.profiles[actorId].corruption,
      );
  }
  if (config) {
    if (
      !["slow", "balanced", "custom"].includes(config.pace) ||
      (config.pace === "custom" &&
        (!Number.isInteger(config.sceneGain) ||
          config.sceneGain < 1 ||
          config.sceneGain > 20 ||
          !Number.isInteger(config.majorGain) ||
          config.majorGain < 1 ||
          config.majorGain > 30))
    )
      throw Error("Invalid pace.");
    r.config = normalizeRelationshipConfig(config);
  }
  r.history = [
    ...r.history,
    {
      id: "manual-" + hash(at + actorId + targetId),
      actorId,
      targetId: targetId || "",
      kind: "manual",
      reason: clean(reason, 500),
      evidence: "",
      changes: {},
      at,
      source: "manual",
    },
  ].slice(-250);
  return next;
}
const normalizeQuote = (v) =>
  String(v || "")
    .normalize("NFKC")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
function mentions(person, quote, player) {
  const hay = textKey(quote);
  return [
    person?.name,
    ...(person?.aliases || []),
    ...(player ? ["{{user}}", "you", "คุณ"] : []),
  ]
    .filter((v) => v && String(v).length >= 2)
    .some((v) => {
      const needle = textKey(v);
      let at = hay.indexOf(needle);
      while (at >= 0) {
        if (
          !/[a-z0-9]/u.test(needle[0]) ||
          (!/[a-z0-9]/u.test(hay[at - 1] || "") &&
            !/[a-z0-9]/u.test(hay[at + needle.length] || ""))
        )
          return true;
        at = hay.indexOf(needle, at + 1);
      }
      return false;
    });
}
function evidencePerson(people, actorId, userName) {
  const person = people.get(actorId);
  return actorId === "player"
    ? {
        ...person,
        // An explicitly entered bilingual player name ("Elian / เอลิอัน")
        // identifies the same person by either spelling, without rewriting it.
        aliases: [...new Set([person?.name, ...(person?.aliases || []), userName]
          .filter(v => typeof v === "string" && v.trim())
          .flatMap(v => [v, ...v.split(/\s*[\/|]\s*/u)])
          .filter(v => v.length >= 2 && /\p{L}/u.test(v)))],
      }
    : person;
}
const hypothetical =
  /\b(?:if|would|might|maybe|rumou?r|allegedly|pretend|will|plan(?:s|ned|ning)? to|want(?:s|ed)? to)\b|\b(?:has|have) not\b|\bnot yet\b|(?:สมมติ|ถ้า|หาก|อาจจะ|คงจะ|ข่าวลือ|ยังไม่ได้|ยังไม่เคย|กำลังจะ)|\(\(|\bOOC\s*:/iu;
// Trust words can describe a loss as well as a gain. Keep withdrawals in
// conflict events instead of accepting a positive support proposal for them.
const trustWithdrawal = /\b(?:no longer trust\w*|(?:lost|lack(?:s|ed|ing)?)\s+(?:(?:his|her|their|any|all)\s+)?trust|(?:does|do|did) not trust|doesn['’]t trust|don['’]t trust|didn['’]t trust|no trust)\b|ไม่(?:เชื่อใจ|เชื่อมั่น|ไว้ใจ|ไว้วางใจ)|(?:ไม่มี|ขาด|หมด|สูญเสีย)(?:ความ)?(?:เชื่อใจ|เชื่อมั่น|ไว้ใจ|ไว้วางใจ)/iu;
const actualPatterns = {
  support:
    /\b(?:help(?:s|ed|ing)?|grateful|thankful|relax(?:es|ed)? (?:around|with)|lower(?:s|ed)? (?:her|his|their) guard|confid(?:e|es|ed)|open(?:s|ed)? up|care(?:s|d)?|caring|support(?:s|ed|ing)?|comfort(?:s|ed|ing)?|protect(?:s|ed|ing)?|rescu(?:e|es|ed|ing)|trust(?:s|ed|ing)?|reassur(?:e|es|ed|ing)|listen(?:s|ed|ing)?)\b|ช่วย|ดูแล|ปลอบ|ปกป้อง|รับฟัง|เปิดใจ|เชื่อใจ|เชื่อมั่น|ไว้ใจ|ไว้วางใจ|วางใจ|อุ่นใจ|ให้กำลังใจ|เคียงข้าง/iu,
  romance:
    /\b(?:flirt(?:s|ed|ing)?|blush(?:es|ed|ing)?|crush on|drawn to|love(?:s|d)?|loving|attract(?:s|ed|ion)?|feel(?:s|ing|ings)?|felt|fond|interest(?:s|ed)?|confess(?:es|ed|ing)?|affection|desire(?:s|d)?|long(?:s|ed|ing)? for)\b|รัก|ชอบ|หวั่นไหว|สนใจ|รู้สึก|สารภาพ|ผูกพัน|เขิน|หน้าแดง|หยอกล้ออย่างเสน่หา|หลงใหล|เสน่หา|คิดถึง|ตกหลุมรัก|หลงรัก/iu,
  promise: /stayed faithful|kept|honou?r|fulfill|promise|รักษา.*(?:สัญญา|คำพูด)|ทำตาม.*(?:สัญญา|คำพูด|คำมั่น)|คำมั่น/iu,
  discovery:
    /discover|learn(?:ed|s)?|witness|found out|realiz|รู้ความจริง|พบความจริง|เห็นกับตา|จับได้|รู้ว่า/iu,
  history: /birth|pregnan|parent|คลอด|ตั้งครรภ์|ท้อง|พ่อของ/iu,
  conflict:
    /argu|conflict|distrust|disappoint|hurt|distance|no longer (?:attracted|interested|love)|lost interest|stopped loving|lost feelings|หมดรัก|เลิกรัก|เลิกสนใจ|หมดความสนใจ|ทะเลาะ|ขัดแย้ง|ผิดหวัง|ไม่ไว้ใจ|ห่างเหิน|เสียใจ/iu,
  betrayal:
    /betray|affair|broke.*(?:promise|exclusiv)|cheat|นอกใจ|ทรยศ|ผิดคำมั่น|ผิดคำสัญญา|ละเมิด.*(?:ข้อตกลง|คำมั่น)/iu,
  intimacy:
    /intimat|encounter|kiss|sex|intercourse|close encounter|ร่วมรัก|สัมพันธ์ทางกาย|ใกล้ชิด|จูบ|มีเพศสัมพันธ์/iu,
  values: /principl|value|belief|conviction|หลักยึด|หลักการ|ค่านิยม|ความเชื่อ|จุดยืน/iu,
  establish:
    /agreed|accept|are dating|are married|became.*(?:couple|partner)|ตกลง|คบกัน|คู่รัก|แต่งงาน|คู่สมรส/iu,
  separate:
    /broke up|break up|separat|end.*relationship|เลิกกัน|ยุติ.*สัมพันธ์|หย่าร้าง|แยกทาง/iu,
  repair:
    /forgiv|reconcil|rebuild.*trust|ให้อภัย|คืนดี|ฟื้นฟู.*(?:สัมพันธ์|เชื่อใจ)/iu,
};
// Inspect complete source clauses, not just the excerpt supplied by the model.
// An unrelated future/negative sentence cannot erase a completed event; nor
// can cropping "maybe" off an excerpt turn an imagined event into a fact.
const clauseBoundary =
  /[.!?？。;\n]+|\b(?:but|however|whereas)\b|แต่(?!ง)|ขณะที่|ส่วน(?!ตัว)|\s+and\s+(?=(?:will|might|would|has not|have not|not yet)\b)|และ(?=(?:ยังไม่|กำลังจะ|คงจะ|อาจจะ|จะ))/iu;
const firstPerson =
  /\b(?:I|me|my|we|our|us)\b|ฉัน|ผม|ข้า|เรา|หนู|กระผม|ดิฉัน/iu;
const negative =
  /\b(?:does not|do not|did not|doesn['’]t|don['’]t|didn['’]t|never|hasn['’]t|haven['’]t)\b|ไม่ได้|ไม่เคย/iu;
const unreal =
  /dream|fantasy|imagined|coerc|forced|without consent|ฝัน|จินตนาการ|ถูกบังคับ|ขืนใจ|ไม่ยินยอม/iu;
const request =
  /\b(?:please|can you|could you|would you|will you)\b|(?:ช่วย|โปรด|กรุณา).{0,100}(?:หน่อย|ได้ไหม|ได้มั้ย|ทีนะ)/iu;
// Keep the question mark attached to its source clause. Splitting it away
// made a question such as "Does Mira love Kai?" look like a confirmed fact.
function evidenceClauses(text) {
  const source = String(text).replace(/<[^>]+>/gu, " "), clauses = [];
  let start = 0;
  for (const match of source.matchAll(new RegExp(clauseBoundary.source, "giu"))) {
    clauses.push({ text: source.slice(start, match.index), question: /[?？]/u.test(match[0]) });
    start = match.index + match[0].length;
  }
  clauses.push({ text: source.slice(start), question: false });
  return clauses;
}
function isEvidenceQuestion(fact) {
  const checked = fact.replace(/(?:ผ้า|ตัว|เส้น|รัง|ต้น)ไหม(?:พรม)?|ไหม้/gu, " ");
  return /^\s*["'“‘]*(?:does|do|did|is|are|was|were|has|have|can|could|would|will|should|what|why|when|who|how)\b/iu.test(checked)
    || /ไหม|มั้ย|หรือเปล่า|รึเปล่า|หรือไม่|หรือยัง|หรอ|เหรอ/iu.test(checked);
}
function relationshipEvidence(
  evidence,
  kind,
  actorId,
  targetId,
  people,
  { story, user, userName, participants, exchanges = [] },
) {
  const quote = normalizeQuote(evidence);
  participants = Array.isArray(participants) ? participants : [];
  if (
    !quote ||
    quote.length > 1500 ||
    ![story, user].some((text) => normalizeQuote(text).includes(quote))
  )
    return { code: "evidence" };
  const person = (id) => evidencePerson(people, id, userName);
  const player = person("player");
  const speakerId = (name) => {
    const matches = [...people.keys()].filter((id) =>
      [person(id)?.name, ...(person(id)?.aliases || [])].some(
        (v) => v && textKey(v) === textKey(name),
      ),
    );
    return matches.length === 1 ? matches[0] : "";
  };
  const blocks = [];
  for(const row of exchanges){
    if(!people.has(row?.speakerId)||!normalizeQuote(story).includes(normalizeQuote(row.text)))continue;
    blocks.push({text:row.text,speaker:row.speakerId,dialogue:true,addressee:people.has(row.targetId)?row.targetId:''});
  }
  for (const [source, own] of [
    [String(story || ""), false],
    [String(user || ""), true],
  ]) {
    let headerSpeaker='';
    for (const block of parseStory(source) || [
      { type: "plain", text: source },
    ]) {
      if (block.type === "header") {headerSpeaker=speakerId(block.name);continue;}
      const dialogue = ["dialogue","thought"].includes(block.type);
      blocks.push({
        text: block.text,
        speaker: own ? "player" : dialogue ? speakerId(block.name) : "",
        dialogue,
        thought:block.type==="thought"||own&&/^\s*\|[\s\S]*\|\s*$/u.test(block.text),
        addressee:own&&participants.length===1?participants[0]:'',
        narratorActor:!own&&participants.length===1&&participants[0]===headerSpeaker?headerSpeaker:'',
      });
    }
  }
  let code = "event";
  const facts = [];
  for (const block of blocks) {
    if (/^\s*(?:\(\(|\[OOC\b|OOC\s*:)/iu.test(normalizeQuote(block.text)))
      continue;
    if(block.thought&&!["support","romance","conflict","values","discovery"].includes(kind))continue;
    let pairEstablished = false;
    for (const clause of evidenceClauses(block.text)) {
      const fact = normalizeQuote(clause.text);
      if (
        !fact ||
        !(fact.includes(quote) || quote.includes(fact)) ||
        !(actualPatterns[kind].test(fact) || kind === "conflict" && trustWithdrawal.test(fact))
      )
        continue;
      const sharedPair =
        pairEstablished &&
        /\b(?:they|both|each other|their)\b|ทั้งคู่|ทั้งสอง|ต่อกัน/iu.test(
          fact,
        ) &&
        ![...people.keys()].some(
          (id) =>
            ![actorId, targetId].includes(id) &&
            mentions(person(id), fact, false),
        );
      const named = (id) =>
        sharedPair ||
        mentions(person(id), fact, false) ||
        (block.speaker === id && firstPerson.test(fact)) ||
        (block.narratorActor === id && /^\s*[*“"'\s]*(?:she\b|he\b|they\b|เธอ|เขา|หล่อน)/iu.test(fact)) ||
        (block.addressee === id && /\byou(?:r|rs|rself)?\b|คุณ|เธอ|นาย/iu.test(fact)) ||
        (id === "player" &&
          mentions(player, fact, true) &&
          (!block.dialogue ||
            (participants.length === 1 && participants[0] === block.speaker)));
      if (!named(actorId) || (kind !== "values" && !named(targetId))) {
        code = "participants";
        continue;
      }
      // Negating hesitation or stopping is not negating the completed act.
      const checked = fact.replace(
        /\b(?:did not|didn['’]t) hesitate to\b|\bnever stopped\b|ไม่ได้ลังเลที่จะ|ไม่ลังเลที่จะ|ไม่เคยหยุด/giu,
        " ",
      );
      const actionAt = checked.search(actualPatterns[kind]);
      const beforeAction = checked.slice(0, actionAt);
      if (
        clause.question || isEvidenceQuestion(checked) ||
        hypothetical.test(checked) ||
        request.test(checked) ||
        /(?:จะ|อยาก|ต้องการ|หวังว่า).{0,16}$/u.test(beforeAction) ||
        ((negative.test(checked) || trustWithdrawal.test(checked) || /(?:ไม่|มิได้|ไม่ค่อย)\s*$/u.test(beforeAction)) &&
          [
            "romance",
            "support",
            "promise",
            "establish",
            "intimacy",
            "betrayal",
            "separate",
            "repair",
            "values",
          ].includes(kind)) ||
        (["intimacy", "history", "betrayal", "establish", "separate"].includes(
          kind,
        ) &&
          unreal.test(checked))
      ) {
        code = "unconfirmed";
        continue;
      }
      pairEstablished = true;
      facts.push(fact);
    }
  }
  return facts.length ? { quote: facts.join(". ") } : { code };
}
function hasRelationshipChange(e) {
  if (["intimacy", "establish", "separate", "betrayal"].includes(e?.kind))
    return true;
  if (Array.isArray(e?.hStats) && e.hStats.length) return true;
  if (e?.milestone && milestones.has(e.milestone)) return true;
  return [...RELATIONSHIP_METRICS, "corruption"].some(
    (k) =>
      Number.isFinite(Number(e?.changes?.[k])) && Number(e.changes[k]) !== 0,
  );
}
function validMilestone(kind, milestone, quote) {
  if (!milestones.has(milestone)) return "";
  if (
    milestone === "openness" &&
    /open.*up|confid|secret|เปิดใจ|ความลับ|เรื่องส่วนตัว/iu.test(quote)
  )
    return milestone;
  if (milestone === "kept_promise" && kind === "promise") return milestone;
  if (
    milestone === "mutual_interest" &&
    kind === "romance" &&
    /mutual|each other|both|รักกัน|ชอบกัน|ทั้งคู่|ต่อกัน|ต่าง.*(?:รัก|ชอบ)/iu.test(
      quote,
    )
  )
    return milestone;
  if (
    milestone === "dating" &&
    kind === "establish" &&
    /dating|became.*(?:couple|partners)|คบกัน|คู่รัก/iu.test(quote)
  )
    return milestone;
  if (
    milestone === "married" &&
    kind === "establish" &&
    /married|wedding|แต่งงาน|สมรส/iu.test(quote)
  )
    return milestone;
  if (
    (milestone === "boundary_crossed" && kind === "betrayal") ||
    (milestone === "values_shift" &&
      kind === "values" &&
      /abandon|chang|compromis|reconsider|ละทิ้ง|เปลี่ยน|ยอม|ทบทวน/iu.test(
        quote,
      )) ||
    (milestone === "repair" && kind === "repair")
  )
    return milestone;
  return "";
}
function writeLegacy(npc, field, value) {
  const alt = npc?.alternateProfiles?.find(
    (v) => v.id === npc.activeAlternateId,
  );
  if (alt) {
    alt.fields ||= {};
    alt.fields[field] = value;
  } else if (npc) npc[field] = value;
}
const counterEvidence = {
  oralActCount: /oral|ทางปาก|ปาก/iu,
  oralSexCount: /oral|ทางปาก|ปาก/iu,
  analSexCount: /anal|ทางทวาร|ทวาร/iu,
  unprotectedSexCount:
    /unprotected|without protection|ไม่ป้องกัน|ไม่ใส่ถุงยาง/iu,
  orgasmCount: /orgasm|ถึงจุดสุดยอด/iu,
  birthCount: /gave birth|birth|คลอด/iu,
  ejaculateLiters: /ejaculat|volume|ปริมาณ|ลิตร/iu,
  swallowedLiters: /swallow|กลืน|ลิตร/iu,
};
function sourceKey(source) {
  return typeof source === "string"
    ? source
    : source?.turnKey ||
        source?.messageKey ||
        (Number.isInteger(source?.messageId)
          ? `${source.messageId}:${source.swipeId ?? 0}`
          : "");
}
export function relationshipSceneKey(state) {
  return `${state.worldClock?.day || 1}:${Math.floor(Number(String(state.worldClock?.time || "00:00").split(":")[0]) / 6)}:${textKey(state.location?.place)}`;
}
export function relationshipEventNpcIds(events) {
  return [
    ...new Set(
      (Array.isArray(events) ? events : [])
        .flatMap((e) => [
          e?.actorId,
          e?.targetId,
          e?.thirdPartyId,
          ...(Array.isArray(e?.hStats) ? e.hStats : []).map((v) => v?.ownerId),
        ])
        .filter((v) => id(v) && v !== "player"),
    ),
  ];
}
export function filterRelationshipBodyOperations(operations, events, state) {
  const body = (Array.isArray(events) ? events : []).filter((e) =>
    ["intimacy", "history"].includes(e?.kind),
  );
  if (!body.length || state?.relationships?.config?.enabled === false)
    return operations;
  // Encounters, parentage and last partners have a single authoritative path.
  // A proposed NPC-only encounter must not also charge the player's counters.
  // Other body/preferences fields still work, even if one event is rejected.
  const reserved = (ownerId, field) => {
    if (typeof field !== "string") return false;
    const meta = H_FIELD_MAP[field];
    return (
      ["count", "liters", "boolean"].includes(meta?.type) ||
      field === "pregnancyFather" ||
      field.endsWith("LastPartner") ||
      body.some((e) =>
        (Array.isArray(e.hStats) ? e.hStats : []).some(
          (v) => v?.ownerId === ownerId && v.field === field,
        ),
      )
    );
  };
  return operations.flatMap((operation) => {
    const [verb, path, value, ...rest] = operation;
    if (["npcHStats", "playerHStats"].includes(path))
      return reserved(
        path === "playerHStats" ? "player" : value?.npcId,
        value?.field || "",
      )
        ? []
        : [operation];
    if (path === "npcs" && object(value?.hStats)) {
      const fields = Object.fromEntries(
        Object.entries(value.hStats).filter(
          ([field]) => !reserved(value.id, field),
        ),
      );
      const next = { ...value };
      delete next.hStats;
      if (Object.keys(fields).length) next.hStats = fields;
      return [[verb, path, next, ...rest]];
    }
    return [operation];
  });
}
export function applyRelationshipEvents(
  state,
  raw,
  {
    story = "",
    user = "",
    userName = state.player?.name,
    participants = [],
    exchanges = [],
    source = "",
    at = new Date().toISOString(),
  } = {},
) {
  if (!Array.isArray(raw) || !raw.length)
    return { next: state, changed: 0, errors: [], diagnostics: [] };
  const initial = normalizeRelationships(state.relationships),
    config = initial.config;
  if (!config.enabled)
    return { next: state, changed: 0, errors: [], diagnostics: [] };
  let next = state,
    r = initial,
    people = relationshipPeople(state),
    changed = 0;
  const errors = [],
    diagnostics = [],
    scene = relationshipSceneKey(state),
    key = sourceKey(source);
  if (!key)
    return {
      next: state,
      changed: 0,
      errors: ["source"],
      diagnostics: [{ code: "source" }],
    };
  const ensure = () => {
    if (next === state) {
      next = structuredClone(state);
      next.relationships = r;
      people = relationshipPeople(next);
    }
    return r;
  };
  const events = [],
    encounters = new Map();
  for (const value of raw.slice(0, 100)) {
    if (value?.kind !== "intimacy") {
      events.push(value);
      continue;
    }
    const k =
        relationshipBondKey(value.actorId, value.targetId) +
        "|" +
        normalizeQuote(value.evidence),
      old = encounters.get(k);
    if (old)
      old.hStats.push(...(Array.isArray(value.hStats) ? value.hStats : []));
    else {
      const e = {
        ...value,
        hStats: [...(Array.isArray(value.hStats) ? value.hStats : [])],
      };
      encounters.set(k, e);
      events.push(e);
    }
  }
  for (const e of events) {
    if (!hasRelationshipChange(e)) continue;
    const actorId = id(e?.actorId),
      targetId = id(e?.targetId),
      kind = e?.kind,
      actor = people.get(actorId),
      target = people.get(targetId);
    const reject = (code) => {
      errors.push(code);
      diagnostics.push({ actorId, targetId, kind: clean(kind, 40), code, evidence: clean(e?.evidence, 320) });
    };
    if (
      !kinds.has(kind) ||
      !actor ||
      actor.enabled === false ||
      (kind !== "values" &&
        (!target || target.enabled === false || actorId === targetId))
    ) {
      reject("participants");
      continue;
    }
    const confirmed = relationshipEvidence(
      e?.evidence,
      kind,
      actorId,
      targetId,
      people,
      { story, user, userName, participants, exchanges },
    );
    if (!confirmed.quote) {
      reject(confirmed.code);
      continue;
    }
    const quote = confirmed.quote;
    const identity =
        kind === "intimacy"
          ? relationshipBondKey(actorId, targetId)
          : relationshipPairKey(actorId, targetId),
      receipt =
        "rel:" +
        hash(
          key +
            "|" +
            kind +
            "|" +
            identity +
            "|" +
            (kind === "intimacy" ? "encounter" : textKey(quote)),
        );
    if (r.receipts.includes(receipt)) continue;
    const milestone = validMilestone(kind, e.milestone, quote),
      bond =
        kind === "values" ? null : relationshipBond(next, actorId, targetId),
      profile = relationshipProfile(next, actorId),
      exclusive = r.bonds.find(
        (v) =>
          [v.a, v.b].includes(actorId) &&
          ["dating", "married"].includes(v.status) &&
          v.agreement === "exclusive" &&
          ![v.a, v.b].includes(targetId),
      );
    if (
      (kind === "establish" && !["dating", "married"].includes(milestone)) ||
      (kind === "values" && milestone !== "values_shift")
    ) {
      reject("milestone");
      continue;
    }
    if (
      kind === "betrayal" &&
      (!config.allowInfidelity ||
        !profile.allowInfidelity ||
        !bond ||
        !["dating", "married"].includes(bond.status) ||
        bond.agreement !== "exclusive" ||
        milestone !== "boundary_crossed" ||
        !people.has(e.thirdPartyId) ||
        [actorId, targetId].includes(e.thirdPartyId) ||
        !mentions(
          evidencePerson(people, e.thirdPartyId, userName),
          quote,
          e.thirdPartyId === "player",
        ))
    ) {
      reject("agreement");
      continue;
    }
    ensure();
    const link =
        kind === "values" ? null : relationshipLink(next, actorId, targetId),
      deltas = {};
    let budget = r.budgets.find(
      (v) =>
        v.actorId === actorId &&
        v.targetId === (targetId || actorId) &&
        v.scene === scene,
    );
    if (!budget) {
      budget = {
        actorId,
        targetId: targetId || actorId,
        scene,
        spent: 0,
        kinds: {},
      };
      r.budgets.push(budget);
    }
    const repeat = budget.kinds[kind] || 0,
      major =
        ["betrayal", "establish", "values"].includes(kind) &&
        Boolean(milestone),
      limit = major ? config.majorGain : config.sceneGain;
    let available = Math.max(0, limit - budget.spent);
    for (const metric of [...RELATIONSHIP_METRICS, "corruption"]) {
      const request = Number(e.changes?.[metric]);
      if (
        !Number.isFinite(request) ||
        !request ||
        (metric === "corruption" && kind !== "values") ||
        (metric !== "corruption" && kind === "values") ||
        (metric === "love" &&
          (["intimacy", "betrayal", "values"].includes(kind)||kind === "conflict"&&request>0)) ||
        (metric === "interest" && kind !== "romance" && !(["conflict","discovery","separate"].includes(kind)&&request<0)) ||
        ["intimacy", "history"].includes(kind) ||
        (kind === "betrayal" && metric !== "commitment")
      )
        continue;
      const old = metric === "corruption" ? profile.corruption : link[metric],
        positive = request > 0;
      let delta =
        Math.sign(request) *
        Math.min(
          Math.abs(request),
          major ? config.majorGain : config.sceneGain,
        );
      if (positive) {
        delta = Math.round(delta / (repeat + 1) * 10) / 10;
        if (
          metric === "corruption" ||
          (exclusive && ["love", "interest"].includes(metric))
        )
          delta = Math.round(delta * (1 - profile.resistance / 100) * 10) / 10;
        delta = Math.min(available, delta);
      } else if (
        !["conflict", "discovery", "betrayal", "separate", "values"].includes(
          kind,
        )
      )
        continue;
      let maximum = 100;
      if (metric === "love") {
        maximum =
          link.milestones.includes("mutual_interest") ||
          milestone === "mutual_interest"
            ? 60
            : link.milestones.includes("openness") || milestone === "openness"
              ? 40
              : 20;
        if (
          ["dating", "married"].includes(bond?.status) ||
          kind === "establish"
        )
          maximum = 100;
        maximum = Math.max(old || 0, maximum);
      }
      const value = Math.min(maximum, Math.max(0, (old ?? 0) + delta)),
        actual = Math.round((value - (old ?? 0)) * 10) / 10;
      if (!actual) continue;
      if (metric === "corruption") {
        profile.corruption = value;
        r.profiles[actorId] = profile;
        if (actorId !== "player")
          writeLegacy(people.get(actorId), "corruption", value);
      } else link[metric] = value;
      deltas[metric] = actual;
      if (actual > 0) {
        available -= actual;
        budget.spent += actual;
      }
    }
    if (link) {
      if (milestone && !link.milestones.includes(milestone))
        link.milestones.push(milestone);
      link.origin = "story";
      link.lastReason = quote;
      setLink(r, link);
      if (targetId === "player" && actorId !== "player")
        for (const [metric, field] of [
          ["love", "affection"],
          ["trust", "trust"],
          ["commitment", "loyalty"],
        ])
          if (deltas[metric] !== undefined)
            writeLegacy(people.get(actorId), field, link[metric]);
    }
    if (kind === "establish" && ["dating", "married"].includes(milestone)) {
      const agreement =
        e.agreement === "exclusive" &&
        /exclusive|only.*partner|ผูกขาด|คนเดียว|ตกลง.*ซื่อสัตย์/iu.test(quote)
          ? "exclusive"
          : e.agreement === "open" &&
              /open relationship|non.?exclusive|ไม่ผูกขาด/iu.test(quote)
            ? "open"
            : "unknown";
      setBond(r, {
        ...bond,
        a: actorId,
        b: targetId,
        status: milestone,
        agreement,
        lastReason: quote,
      });
    } else if (kind === "separate")
      setBond(r, {
        ...bond,
        a: actorId,
        b: targetId,
        status: "separated",
        lastReason: quote,
      });
    else if (kind === "betrayal")
      setBond(r, {
        ...bond,
        breach: true,
        repairing: false,
        lastReason: quote,
      });
    else if (kind === "repair" && milestone === "repair")
      setBond(r, { ...bond, repairing: true, lastReason: quote });
    if (kind === "intimacy" || kind === "history") {
      if (kind === "intimacy") {
        for (const [a, b] of [
          [actorId, targetId],
          [targetId, actorId],
        ]) {
          const row = relationshipLink(next, a, b);
          row.encounters++;
          row.lastReason = quote;
          row.origin = "story";
          setLink(r, row);
        }
        deltas.encounters = 1;
      }
      const used = new Set();
      for (const update of Array.isArray(e.hStats) ? e.hStats : []) {
        const ownerId = id(update?.ownerId),
          owner = people.get(ownerId),
          field = H_FIELD_MAP[update?.field],
          verb = update?.verb;
        if (
          !owner ||
          ![actorId, targetId].includes(ownerId) ||
          !field ||
          LEGACY_BOND_FIELDS.includes(field.key) ||
          used.has(ownerId + ":" + field.key) ||
          !["set", "inc"].includes(verb)
        )
          continue;
        const count = ["count", "liters"].includes(field.type),
          value = update.value;
        if (
          count &&
          (verb !== "inc" ||
            !Number.isFinite(value) ||
            value <= 0 ||
            value > 1 ||
            !counterEvidence[field.key]?.test(quote))
        )
          continue;
        if (
          !count &&
          field.type === "boolean" &&
          (verb !== "set" ||
            typeof value !== "boolean" ||
            !/pregnan|ตั้งครรภ์|ท้อง/iu.test(quote))
        )
          continue;
        if (!count && verb !== "set") continue;
        if (field.key === "pregnancyFather") {
          if (!/pregnan|parent|พ่อ|ตั้งครรภ์|ท้อง/iu.test(quote)) continue;
          const counterpart = ownerId === actorId ? targetId : actorId;
          const namedParent = mentions(
            evidencePerson(people, counterpart, userName),
            String(value),
            counterpart === "player",
          );
          const cleared =
            /^(?:none|unknown|ไม่มี|ไม่ทราบ|ยังไม่ทราบ)?$/iu.test(
              String(value).trim(),
            ) &&
            /unknown|no longer pregnant|not pregnant|ไม่ทราบ|ไม่มี|ไม่ได้ตั้งครรภ์|ไม่ท้อง/iu.test(
              quote,
            );
          if (!namedParent && !cleared) continue;
        }
        if (
          field.type === "text" &&
          field.key.endsWith("LastPartner") &&
          !mentions(
            evidencePerson(
              people,
              ownerId === actorId ? targetId : actorId,
              userName,
            ),
            String(value),
            ownerId === actorId ? targetId === "player" : actorId === "player",
          )
        )
          continue;
        const updated = updateHStat(owner.hStats, field.key, verb, value);
        if (updated) {
          owner.hStats = updated;
          owner.hStatsGenerated = (owner.hStatsGenerated || []).filter(
            (v) => v !== field.key,
          );
          used.add(ownerId + ":" + field.key);
        }
      }
    }
    budget.kinds[kind] = repeat + 1;
    r.receipts.push(receipt);
    r.history.push({
      id: receipt,
      actorId,
      targetId: targetId || "",
      kind,
      evidence: quote,
      reason: Object.keys(e.changes||{}).length&&!Object.keys(deltas).length&&!milestone ? budget.spent>=limit?"scene_limit":"score_limit" : "",
      changes: deltas,
      at,
      source: clean(key, 200),
    });
    changed++;
  }
  if (next !== state) next.relationships = normalizeRelationships(r);
  return { next, changed, errors: [...new Set(errors)], diagnostics };
}
export function relationshipPromptReference(
  state,
  subjects = state.npcs || [],
  references = [],
) {
  const ids = new Set(["player", ...subjects.map((v) => v.id)]),
    r = normalizeRelationships(state.relationships);
  for (const actor of subjects)
    if (
      actor.id !== "player" &&
      !r.links.some((v) => v.actorId === actor.id && v.targetId === "player")
    ) {
      const legacy = relationshipLink(state, actor.id, "player");
      if (legacy && RELATIONSHIP_METRICS.some((k) => legacy[k] !== null))
        r.links.push(legacy);
    }
  // Off-scene partners remain commitments. Send only their identity and pair
  // records; looking up a spouse must never hydrate an entire archive.
  const links = r.links.filter((v) => ids.has(v.actorId)).slice(-80);
  const bonds = r.bonds.filter((v) => ids.has(v.a) || ids.has(v.b)).slice(-40);
  const related = new Set([
    ...ids,
    ...bonds.flatMap((v) => [v.a, v.b]),
    ...links.map((v) => v.targetId),
  ]);
  const names = new Map(
    [...references, ...(state.npcs || []), { ...state.player, id: "player" }]
      .filter((n) => n?.id && n.name)
      .map((n) => [n.id, n.name]),
  );
  return {
    config: r.config,
    links,
    bonds,
    people: [...related]
      .slice(0, 160)
      .filter((id) => names.has(id))
      .map((id) => ({ id, name: names.get(id) })),
    profiles: Object.fromEntries(
      Object.entries(r.profiles).filter(([k]) => ids.has(k)),
    ),
    recent: r.history
      .filter((v) => ids.has(v.actorId))
      .slice(-8)
      .map((v) => ({
        ...v,
        evidence: v.evidence.slice(0, 500),
        reason: v.reason.slice(0, 200),
      })),
  };
}
export function retainRelationshipEdits(
  history,
  current,
  {
    actorId,
    targetId,
    config = false,
    profile = false,
    fields = RELATIONSHIP_METRICS,
    retainBond = true,
  } = {},
) {
  const r = normalizeRelationships(current.relationships),
    link =
      targetId &&
      r.links.find((v) => v.actorId === actorId && v.targetId === targetId),
    bond =
      targetId &&
      r.bonds.find(
        (v) =>
          relationshipBondKey(v.a, v.b) ===
          relationshipBondKey(actorId, targetId),
      );
  for (const e of history?.entries || [])
    for (const snapshot of [
      e.baseState,
      ...Object.values(e.variants || {}).map((v) => v.state),
    ])
      if (snapshot) {
        const old = normalizeRelationships(snapshot.relationships);
        if (link) {
          const saved = relationshipLink(
            { ...snapshot, relationships: old },
            actorId,
            targetId,
          );
          for (const key of fields.filter((k) =>
            RELATIONSHIP_METRICS.includes(k),
          ))
            saved[key] = link[key];
          saved.origin = "manual";
          saved.lastReason = link.lastReason;
          setLink(old, saved);
        }
        if (bond && retainBond) setBond(old, structuredClone(bond));
        if (config) old.config = structuredClone(r.config);
        if (profile && r.profiles[actorId])
          old.profiles[actorId] = structuredClone(r.profiles[actorId]);
        const manual = r.history
          .filter((v) => v.kind === "manual" && v.actorId === actorId)
          .at(-1);
        if (manual && !old.history.some((v) => v.id === manual.id))
          old.history = [...old.history, structuredClone(manual)].slice(-250);
        snapshot.relationships = old;
      }
}
export const RELATIONSHIP_INSTRUCTIONS = `RELATIONSHIP PROGRESSION / ALL PAIRS: relationships is a directed graph, including NPC->NPC and player->NPC. A->B does not imply B->A. love/bond, interest/attraction, trust and commitment are 0-100; absent is unknown. Bonds store an explicitly established relationship and agreement; scores never declare dating, marriage or cheating. Legacy loyalty hearts/stage are historical fields, never gameplay thresholds. Do not write legacy bond H-Stats, npc affection/trust/loyalty/corruption or the relationships graph through scalar/upsert operations. Use relationshipEvents:[{actorId,targetId,kind,evidence:"exact quote of a completed visible act involving the pair",changes:{love:1,interest:1,trust:1,commitment:1},milestone:"optional"}]. Use existing stable catalog IDs, never names as IDs. Keep evidence short and specific to the completed act, excluding unrelated plans or requests. A completed, explicitly stated emotional change (including Thai ไว้วางใจ/เชื่อมั่น/หลงใหล/เสน่หา) may support the appropriate trust/romance event without a new physical encounter. Questions about feelings, imagined physical acts and plans are not completed encounters or changes of principles. Both people must be identifiable in that act by their actual names/aliases or the active player name. A verified tr-dialogue speaker may use first-person pronouns for themselves; ambiguous addressees do not identify another NPC. Do not emit zero-change/greeting events, future requests, or invented milestones. Kinds: support,romance,promise,conflict,discovery,values,establish,separate,betrayal,repair,intimacy,history. Emit a separate directed event for reciprocal feelings only when independently established. Ordinary greetings/compliments give no automatic growth; gains are SLOW and capped per continuous scene, not per reply. Preserve personality, commitments and profile anchors before writing the story; do not jump to an affair from a few compliments. Openness, mutual_interest and kept_promise milestones require explicit supporting events. Establish requires milestone dating/married and explicit mutual acceptance, plus agreement exclusive/open/unknown; never infer an exclusive agreement from hearts, a title or high affection. Betrayal requires an existing exclusive dating/married bond, milestone boundary_crossed, thirdPartyId, actual completed breach and evidence naming all involved. Do not manufacture an affair when allowInfidelity is false, or from desire, pressure, fantasy, rumor, fear, scores or off-screen elapsed time. A betrayed person does not lose trust until they actually learn what happened; use kind discovery with an explicit learned/witnessed quote for that person. Betrayal changes only the betraying actor commitment; do not fabricate the unaware partner response. Corruption requires kind values, changes.corruption, milestone values_shift, and an explicit change of principles; it is separate from intimacy and betrayal. Intimacy between ANY two adults records that pair's encounter, not the player's; it never grants love automatically. For confirmed physical/history changes include hStats:[{ownerId,field,verb:"inc"|"set",value}] only for the two participants, and quote the actual relevant act. Include both owners' applicable updates in ONE intimacy event. Counts are per completed act, not per text paragraph. Never add the same updates to npcHStats/playerHStats as well. No player stats change from NPC-only encounters. Use kind history for confirmed pregnancy/parentage/birth, which must not count as a new intimate encounter. Body/history facts and last partners remain supported. No new model/API calls are needed.`;
