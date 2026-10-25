import {
  RELATIONSHIP_METRICS,
  RELATIONSHIP_STATUSES,
  normalizeRelationships,
  relationshipLink,
  relationshipBond,
  relationshipProfile,
  relationshipRanking,
  relationshipPreset,
} from "./relationship-core.js?v=0.86.1";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/gu,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// One component serves both surfaces; no extra window, model request, or library hydration.
export function createRelationshipPanel({
  document: doc = globalThis.document,
  language = () => "th",
  targets = () => [],
  read = async () => null,
  save = async () => false,
  importPreset = async () => false,
  busy = () => false,
  variant = "dock",
  layout = "standard",
  selectionChanged = () => {},
} = {}) {
  const root = doc.createElement("section");
  root.className = "rf-relationships";
  root.dataset.relationshipPanel = variant;
  const dossier = variant === "dock" && layout === "dossier";
  if (dossier) root.classList.add("rf-rel-dossier");
  let state = null,
    scope = "",
    actor = "",
    target = "",
    tab = "overview",
    picker = false,
    needle = "",
    page = 0,
    editing = false,
    saving = false,
    status = "",
    serial = 0;
  const t = (th, en) => (language() === "th" ? th : en);
  const metrics = () => ({
    love: t("ความผูกพัน", "Love / bond"),
    interest: t("ความสนใจ", "Interest"),
    trust: t("ความเชื่อใจ", "Trust"),
    commitment: t("คำมั่น", "Commitment"),
  });
  const statuses = () => ({
    unknown: t("ยังไม่ระบุ", "Unspecified"),
    friends: t("เพื่อน", "Friends"),
    interested: t("สนใจ", "Interested"),
    dating: t("คบกัน", "Dating"),
    married: t("คู่สมรส", "Married"),
    separated: t("แยกทาง", "Separated"),
  });
  const agreements = () => ({
    unknown: t("ยังไม่ตกลง", "Unspecified"),
    exclusive: t("ผูกขาด", "Exclusive"),
    open: t("ไม่ผูกขาด", "Open"),
  });
  const people = () => {
    const result = new Map(targets().map((n) => [n.id, n.name]));
    for (const p of [
      { ...state?.player, id: "player" },
      ...(state?.npcs || []),
    ])
      if (p.name) result.set(p.id, p.name);
    return result;
  };
  const name = (id) => people().get(id) || id || t("ยังไม่ระบุ", "Unspecified");
  const fmt = (v) =>
    v === null || v === undefined
      ? "—"
      : Number(v).toLocaleString(language() === "th" ? "th" : "en", {
          maximumFractionDigits: 1,
        });
  const button = (action, label, extra = "") =>
    `<button type="button" data-rel-action="${action}" ${extra}>${label}</button>`;
  const icon = (action, fa, label) =>
    button(
      action,
      `<i class="fa-solid fa-${fa}" aria-hidden="true"></i>`,
      `aria-label="${esc(label)}" title="${esc(label)}"`,
    );
  const input = (key, label, value, type = "number", extra = "") =>
    `<label><span>${esc(label)}</span><input name="${key}" type="${type}" value="${esc(value ?? "")}" ${type === "number" ? ` ${/min=/u.test(extra) ? "" : 'min="0"'} ${/max=/u.test(extra) ? "" : 'max="100"'} ${/step=/u.test(extra) ? "" : 'step="0.1"'}` : ""} ${extra}></label>`;
  function rankings() {
    return `<div class="rf-rel-leaders">${[
      ["love", t("ผูกพันมากที่สุด", "Strongest bond"), "heart"],
      ["interest", t("สนใจมากที่สุด", "Strongest interest"), "sparkles"],
    ]
      .map(([metric, label, fa]) => {
        const list = relationshipRanking(state, actor, metric),
          top = list.filter((v) => v[metric] === list[0]?.[metric]);
        return `<article data-rel-leader="${metric}"><small><i class="fa-solid fa-${fa === "sparkles" ? "star" : fa}" aria-hidden="true"></i>${esc(label)}</small><strong>${
          top.length
            ? top
                .slice(0, 3)
                .map((v) => esc(name(v.targetId)))
                .join(" / ")
            : esc(t("ยังไม่มีข้อมูล", "Not established"))
        }</strong><span>${top.length ? `${fmt(top[0][metric])} / 100${top.length > 1 ? " · " + esc(t("เท่ากัน", "Tied")) : ""}` : esc(t("ความรู้สึกแยกตามแต่ละคน", "Feelings are recorded per person"))}</span></article>`;
      })
      .join("")}</div>`;
  }
  function targetPicker() {
    const list = [...people()].filter(
      ([id, n]) =>
        id !== actor &&
        String(n)
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(needle.normalize("NFKC").toLocaleLowerCase()),
    );
    const total = Math.max(1, Math.ceil(list.length / 5));
    page = Math.min(page, total - 1);
    return `<div class="rf-rel-picker"><label class="rf-rel-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input data-rel-search type="search" value="${esc(needle)}" placeholder="${esc(t("ค้นหาคนที่ต้องการดู…", "Find a person…"))}" aria-label="${esc(t("ค้นหาตัวละคร", "Find a character"))}"></label><div>${
      list
        .slice(page * 5, page * 5 + 5)
        .map(([id, n]) =>
          button(
            "target",
            `${esc(n)}<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>`,
            `data-rel-id="${esc(id)}"`,
          ),
        )
        .join("") ||
      `<p>${esc(t("ไม่พบตัวละคร", "No matching characters"))}</p>`
    }</div><footer>${button("prev", "‹", page ? "" : "disabled")}<small>${page + 1} / ${total}</small>${button("next", "›", page + 1 < total ? "" : "disabled")}</footer></div>`;
  }
  function overview() {
    const link = target && relationshipLink(state, actor, target),
      bond = target && relationshipBond(state, actor, target),
      profile = relationshipProfile(state, actor);
    return (
      rankings() +
      `<div class="rf-rel-pair-head"><div><small>${esc(t("ความรู้สึกของ", "Feelings of"))} ${esc(name(actor))}</small><strong><i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i> ${esc(name(target))}</strong></div>${icon("choose", "user-group", t("เลือกคนที่ต้องการดู", "Choose a person"))}${icon("edit", "pen", t("แก้ไขคู่นี้", "Edit this pair"))}</div>${picker ? targetPicker() : ""}${link ? `<div class="rf-rel-meters">${RELATIONSHIP_METRICS.map((k) => `<div data-rel-metric="${k}"><div><span>${esc(metrics()[k])}</span><strong>${fmt(link[k])}<small> / 100</small></strong></div><div class="rf-rel-track" role="progressbar" aria-label="${esc(metrics()[k])}" aria-valuemin="0" aria-valuemax="100" ${link[k] === null ? 'aria-valuetext="Unknown"' : `aria-valuenow="${link[k]}"`}><i style="width:${link[k] ?? 0}%"></i></div></div>`).join("")}</div><div class="rf-rel-bond"><span><i class="fa-solid fa-link" aria-hidden="true"></i>${esc(statuses()[bond.status])}</span><span>${esc(agreements()[bond.agreement])}</span>${bond.breach ? `<span class="rf-rel-breach">${esc(t("มีการผิดข้อตกลง", "Agreement breached"))}${bond.repairing ? " · " + esc(t("กำลังฟื้นฟู", "Repairing")) : ""}</span>` : ""}<span>${esc(t("เหตุการณ์ใกล้ชิด", "Intimate encounters"))} <b data-rel-encounters>${link.encounters}</b></span></div>${link.lastReason ? `<p class="rf-rel-reason">${esc(link.lastReason)}</p>` : ""}` : ""}<footer class="rf-rel-values"><span>${esc(t("การเปลี่ยนหลักยึด", "Corruption"))} <b>${fmt(profile.corruption)}</b></span><span>${esc(t("แรงยึดเหนี่ยว", "Resistance"))} <b>${profile.resistance}</b></span></footer>${editing ? editForm(link, bond) : ""}`
    );
  }
  // The dock has a single category bar. The main RoleForge panel continues
  // to use the original renderer, tabs, editors and directory.
  function dossierOverview() {
    const link = relationshipLink(state, actor, target),
      bond = relationshipBond(state, actor, target),
      profile = relationshipProfile(state, actor);
    if (!link) return `<p class="rf-rel-empty">${esc(t("เลือก NPC ใน H-Stats เพื่อดูสายสัมพันธ์", "Add an NPC to H-Stats to view relationships."))}</p>`;
    const progress = (key, label, segmented = false) => {
      const v = link[key];
      return `<div class="${segmented ? "rf-hd-chapters" : "rf-hd-track"}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" ${v == null ? `aria-valuetext="${esc(t("ยังไม่ทราบ", "Unknown"))}"` : `aria-valuenow="${v}"`}>${segmented ? Array.from({ length: 20 }, (_, i) => `<i${i * 5 < (v || 0) ? ' class="is-filled"' : ""}></i>`).join("") : `<i style="width:${v ?? 0}%"></i>`}</div>`;
    };
    const leaders = [
      ["love", t("ผูกพันมากที่สุด", "Strongest bond")],
      ["interest", t("สนใจมากที่สุด", "Strongest interest")],
    ].map(([metric, label]) => {
      const list = relationshipRanking(state, actor, metric),
        top = list.filter(v => v[metric] === list[0]?.[metric]);
      return `<article class="rf-hd-leader" data-rel-leader="${metric}"><small>${esc(label)}</small><div>${top.length ? `<span class="rf-hd-initial" aria-hidden="true">${esc(Array.from(name(top[0].targetId))[0])}</span><strong title="${esc(top.map(v => name(v.targetId)).join(" / "))}">${esc(name(top[0].targetId))}${top.length > 1 ? ` <em>+${top.length - 1}</em>` : ""}</strong><b>${fmt(top[0][metric])}</b>` : `<strong>${esc(t("ยังไม่มีข้อมูล", "Not established"))}</strong>`}</div></article>`;
    }).join("");
    return `<div class="rf-hd-pair"><div><small>${esc(t("ความรู้สึกต่อ", "Feelings toward"))}</small>${button("choose", `<strong>${esc(name(target))}</strong><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`, `aria-label="${esc(t("เลือกคนที่ต้องการดู", "Choose a person"))}" aria-expanded="${picker}"`)}</div><span class="rf-hd-bond"><i class="fa-solid fa-link" aria-hidden="true"></i>${esc(statuses()[bond.status])}</span></div>${picker ? targetPicker() : ""}
      <div class="rf-hd-scores"><div class="rf-hd-spotlight" data-rel-metric="love"><small>${esc(t("ความผูกพัน", "Love / bond"))}</small><div><strong>${fmt(link.love)}</strong><span>/ 100</span></div>${progress("love", metrics().love, true)}</div><div class="rf-hd-other-scores">${RELATIONSHIP_METRICS.filter(k => k !== "love").map(k => `<div class="rf-hd-meter" data-rel-metric="${k}"><div><span>${esc(k === "interest" ? t("สนใจ", "Interest") : k === "trust" ? t("เชื่อใจ", "Trust") : metrics()[k])}</span><strong>${fmt(link[k])}<small> / 100</small></strong></div>${progress(k, metrics()[k])}</div>`).join("")}</div></div>
      ${bond.breach ? `<p class="rf-hd-breach">${esc(t("มีการผิดข้อตกลง", "Agreement breached"))}${bond.repairing ? " · " + esc(t("กำลังฟื้นฟู", "Repairing")) : ""}</p>` : ""}<div class="rf-hd-leaders">${leaders}</div><footer class="rf-hd-foot"><span>${esc(t("หลักยึดเปลี่ยน", "Corruption"))} <b>${fmt(profile.corruption)}</b></span><span>${esc(t("แรงยึดเหนี่ยว", "Resistance"))} <b>${fmt(profile.resistance)}</b></span><span>${esc(t("ใกล้ชิด", "Encounters"))} <b data-rel-encounters>${link.encounters}${language() === "th" ? " ครั้ง" : ""}</b></span></footer>${editing ? editForm(link, bond) : ""}`;
  }
  function editForm(link, bond) {
    return `<form data-rel-form="pair" class="rf-rel-form"><p>${esc(t("แก้ข้อมูลโดยตรงสำหรับผู้เล่น/ผู้สร้างการ์ด · เว้นว่าง = ยังไม่ทราบ", "Direct author/player edit. Empty = unknown."))}</p><div class="rf-rel-inputs">${RELATIONSHIP_METRICS.map((k) => input(k, metrics()[k], link?.[k])).join("")}</div><fieldset><legend>${esc(t("สถานะที่ตกลงกัน", "Established relationship"))}</legend>${RELATIONSHIP_STATUSES.map((s) => `<label><input type="radio" name="status" value="${s}"${s === bond?.status ? " checked" : ""}>${esc(statuses()[s])}</label>`).join("")}</fieldset><fieldset><legend>${esc(t("ข้อตกลง", "Agreement"))}</legend>${Object.entries(
      agreements(),
    )
      .map(
        ([id, label]) =>
          `<label><input type="radio" name="agreement" value="${id}"${id === bond?.agreement ? " checked" : ""}>${esc(label)}</label>`,
      )
      .join(
        "",
      )}</fieldset><label><span>${esc(t("เหตุผลการแก้ไข", "Reason"))}</span><input name="reason" maxlength="500" value="" placeholder="${esc(t("ปรับตามเนื้อเรื่องหรือข้อมูลการ์ด", "Story or card correction"))}"></label><button type="submit" ${saving || busy() ? "disabled" : ""}>${esc(t("บันทึกคู่นี้", "Save pair"))}</button></form>`;
  }
  function history() {
    const list = (state.relationships?.history || [])
      .filter((v) => v.actorId === actor || v.targetId === actor)
      .slice()
      .reverse();
    const total = Math.max(1, Math.ceil(list.length / 5));
    page = Math.min(page, total - 1);
    return `<div class="rf-rel-history">${
      list
        .slice(page * 5, page * 5 + 5)
        .map(
          (v) =>
            `<article><div><strong>${esc(name(v.actorId))} → ${esc(name(v.targetId))}</strong><small>${esc(v.kind)}${v.at ? " · " + esc(new Date(v.at).toLocaleDateString(language() === "th" ? "th" : "en")) : ""}</small></div><p>${esc(v.evidence || v.reason)}</p><span>${
              Object.entries(v.changes || {})
                .map(
                  ([k, n]) =>
                    `${esc(metrics()[k] || (k === "encounters" && t("เหตุการณ์", "Encounter")) || t("การเปลี่ยนหลักยึด", "Corruption"))} ${n > 0 ? "+" : ""}${fmt(n)}`,
                )
                .join(" · ") || esc(t("บันทึกสถานะ", "Status recorded"))
            }</span></article>`,
        )
        .join("") ||
      `<p class="rf-rel-empty">${esc(t("ยังไม่มีเหตุการณ์ของตัวละครนี้", "No events for this character yet."))}</p>`
    }<footer>${button("prev", "‹", page ? "" : "disabled")}<small>${page + 1} / ${total}</small>${button("next", "›", page + 1 < total ? "" : "disabled")}</footer></div>`;
  }
  function settingsForm() {
    const r = normalizeRelationships(state.relationships),
      p = relationshipProfile(state, actor);
    return `<form data-rel-form="rules" class="rf-rel-form"><label class="rf-rel-check"><input type="checkbox" name="enabled" ${r.config.enabled ? "checked" : ""}><span>${esc(t("ติดตามพัฒนาการความสัมพันธ์ในแชตนี้", "Track relationship progression in this chat"))}</span></label><fieldset><legend>${esc(t("จังหวะพัฒนาการ", "Progression pace"))}</legend>${[
      ["slow", t("ค่อยเป็นค่อยไป", "Slow")],
      ["balanced", t("ปานกลาง", "Balanced")],
      ["custom", t("กำหนดเอง", "Custom")],
    ]
      .map(
        ([id, label]) =>
          `<label><input type="radio" name="pace" value="${id}"${r.config.pace === id ? " checked" : ""}>${esc(label)}</label>`,
      )
      .join(
        "",
      )}</fieldset><div class="rf-rel-inputs">${input("sceneGain", t("เพดานเพิ่มรวม / ฉาก", "Total gain / scene"), r.config.sceneGain, "number", `step="1" min="1" max="20" ${r.config.pace === "custom" ? "" : "disabled"}`)}${input("majorGain", t("เหตุการณ์สำคัญ / ฉาก", "Milestone gain / scene"), r.config.majorGain, "number", `step="1" min="1" max="30" ${r.config.pace === "custom" ? "" : "disabled"}`)}</div><label class="rf-rel-check"><input type="checkbox" name="worldInfidelity" ${r.config.allowInfidelity ? "checked" : ""}><span>${esc(t("อนุญาตเส้นเรื่องผิดข้อตกลง", "Allow infidelity storylines"))}</span></label><h4>${esc(name(actor))}</h4><div class="rf-rel-inputs">${input("corruption", t("การเปลี่ยนหลักยึด", "Corruption"), p.corruption)}${input("resistance", t("แรงยึดเหนี่ยว", "Resistance"), p.resistance, "number", 'step="1"')}</div><label><span>${esc(t("หลักยึด / บุคลิกที่ต้องรักษา", "Character anchor"))}</span><textarea name="anchor" maxlength="400" rows="2">${esc(p.anchor)}</textarea></label><label class="rf-rel-check"><input type="checkbox" name="allowInfidelity" ${p.allowInfidelity ? "checked" : ""}><span>${esc(t("ตัวละครนี้มีเส้นเรื่องผิดข้อตกลงได้", "Allow this character to breach a commitment"))}</span></label><p class="rf-rel-note">${esc(t("คะแนนสูงไม่ทำให้คบกันหรือนอกใจเอง · การใกล้ชิดไม่เพิ่มความรักอัตโนมัติ", "High scores do not establish a romance or an affair. Intimacy does not grant love automatically."))}</p><button type="submit" ${saving || busy() ? "disabled" : ""}>${esc(t("บันทึกกติกา", "Save rules"))}</button></form><div class="rf-rel-portable">${button("export", `<i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>${esc(t("ส่งออก Preset", "Export preset"))}`)}<label><i class="fa-solid fa-arrow-down-to-bracket" aria-hidden="true"></i>${esc(t("นำเข้า Preset", "Import preset"))}<input data-rel-import type="file" accept=".json,application/json" hidden></label></div><small class="rf-rel-note">${esc(t("นำเข้ากติกาและคู่ที่ยังไม่มี · เก็บความสัมพันธ์ที่เล่นไว้แล้ว ใช้คู่กับ World Preset/การ์ดได้", "Imports rules and missing pair seeds, preserving played relationships. Compatible with world presets and cards."))}</small>`;
  }
  function render() {
    if (!state || !scope || !actor) {
      root.replaceChildren();
      return;
    }
    const ids = [...people().keys()].filter((id) => id !== actor);
    if (!ids.includes(target))
      target =
        relationshipRanking(state, actor, "love")[0]?.targetId || ids[0] || "";
    if (dossier) {
      root.dataset.relationshipView = tab;
      root.dataset.relationshipActor = actor;
      root.dataset.relationshipTarget = target;
      selectionChanged({ actorId: actor, targetId: target, bond: relationshipBond(state, actor, target) });
      root.innerHTML = `${tab === "rules" ? `<nav class="rf-hd-tools" aria-label="${esc(t("ตั้งค่าความสัมพันธ์", "Relationship settings"))}">${button("tab", esc(t("แก้ไขคู่นี้", "Edit pair")), 'data-rel-tab="overview" data-rel-edit="true"')}${button("tab", esc(t("กติกา / Preset", "Rules / Preset")), 'data-rel-tab="rules" aria-pressed="true"')}</nav>` : ""}${tab === "overview" ? dossierOverview() : tab === "history" ? history() : settingsForm()}<p class="rf-rel-feedback" data-rel-feedback role="status" aria-live="polite">${esc(status)}</p>`;
      return;
    }
    root.innerHTML = `<header class="rf-rel-heading"><span><i class="fa-solid fa-heart" aria-hidden="true"></i>${esc(t("สายสัมพันธ์", "Relationships"))}</span><small>${esc(name(actor))}</small></header><nav class="rf-rel-tabs" aria-label="${esc(t("ความสัมพันธ์", "Relationships"))}">${[
      ["overview", t("ภาพรวม", "Overview")],
      ["history", t("เหตุการณ์", "Events")],
      ["rules", t("กติกา", "Rules")],
    ]
      .map(([id, label]) =>
        button(
          "tab",
          esc(label),
          `data-rel-tab="${id}" aria-pressed="${tab === id}"`,
        ),
      )
      .join(
        "",
      )}</nav>${tab === "overview" ? overview() : tab === "history" ? history() : settingsForm()}<p class="rf-rel-feedback" data-rel-feedback role="status" aria-live="polite">${esc(status)}</p>`;
  }
  async function load() {
    const ticket = ++serial,
      captured = scope;
    try {
      const next = await read(actor, target, captured);
      if (ticket === serial && captured === scope && next) {
        state = next;
        render();
      }
    } catch (error) {
      if (ticket === serial && captured === scope) {
        status = error.message;
        render();
      }
    }
  }
  async function commit(change) {
    if (saving || busy()) return;
    const captured = scope;
    let ticket = ++serial;
    saving = true;
    status = "";
    render();
    try {
      if (
        !(await save(
          { ...change, actorId: actor, targetId: change.targetId ?? target },
          captured,
        ))
      )
        throw Error(
          t("ยังบันทึกไม่ได้ กรุณารอแล้วลองใหม่", "Not saved. Wait and retry."),
        );
      if (captured !== scope || ticket !== serial) return;
      editing = false;
      status = t("บันทึกแล้ว", "Saved");
      await load();
    } catch (error) {
      if (captured === scope && ticket === serial) status = error.message;
    } finally {
      if (captured === scope) {
        saving = false;
        render();
      }
    }
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rel-action]");
    if (!b || !root.contains(b) || saving) return;
    const action = b.dataset.relAction;
    if (action === "tab") {
      tab = b.dataset.relTab;
      picker = false;
      editing = b.dataset.relEdit === "true";
      page = 0;
      status = "";
      render();
    } else if (action === "choose") {
      picker = !picker;
      page = 0;
      render();
    } else if (action === "target") {
      target = b.dataset.relId;
      picker = false;
      editing = false;
      status = "";
      render();
      void load();
    } else if (action === "edit") {
      editing = !editing;
      picker = false;
      render();
      if (editing) void load();
    } else if (action === "prev" || action === "next") {
      page = Math.max(0, page + (action === "prev" ? -1 : 1));
      render();
    } else if (action === "export") {
      const content = JSON.stringify(
          {
            format: "roleforge-relationship-preset",
            version: 1,
            name: name(actor) + " · Relationships",
            preset: relationshipPreset(state),
          },
          null,
          2,
        ),
        blob = new Blob([content], { type: "application/json" }),
        url = URL.createObjectURL(blob),
        a = doc.createElement("a");
      a.href = url;
      a.download = "roleforge-relationships.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  root.addEventListener("input", (e) => {
    if (!e.target.matches("[data-rel-search]")) return;
    needle = e.target.value;
    page = 0;
    const caret = e.target.selectionStart;
    render();
    const n = root.querySelector("[data-rel-search]");
    n?.focus({ preventScroll: true });
    try {
      n?.setSelectionRange(caret, caret);
    } catch {}
  });
  root.addEventListener("submit", (e) => {
    const f = e.target;
    if (!f.matches("[data-rel-form]")) return;
    e.preventDefault();
    const d = new FormData(f),
      number = (k) => (d.get(k) === "" ? null : Number(d.get(k)));
    if (f.dataset.relForm === "pair")
      void commit({
        values: Object.fromEntries(
          RELATIONSHIP_METRICS.map((k) => [k, number(k)]),
        ),
        bond: {
          ...relationshipBond(state, actor, target),
          status: d.get("status"),
          agreement: d.get("agreement"),
        },
        reason: String(d.get("reason") || t("แก้ไขโดยผู้ใช้", "Manual edit")),
      });
    else
      void commit({
        config: {
          enabled: d.has("enabled"),
          pace: d.get("pace"),
          sceneGain: number("sceneGain"),
          majorGain: number("majorGain"),
          allowInfidelity: d.has("worldInfidelity"),
        },
        profile: {
          corruption: number("corruption"),
          resistance: number("resistance"),
          anchor: String(d.get("anchor")),
          allowInfidelity: d.has("allowInfidelity"),
        },
      });
  });
  root.addEventListener("change", async (e) => {
    if (e.target.matches("[name=pace]")) {
      for (const n of root.querySelectorAll(
        "[name=sceneGain],[name=majorGain]",
      ))
        n.disabled = e.target.value !== "custom";
      return;
    }
    if (!e.target.matches("[data-rel-import]") || saving || busy()) return;
    const file = e.target.files?.[0],
      captured = scope;
    if (!file) return;
    try {
      if (file.size > 1024 * 1024)
        throw Error(t("ไฟล์ต้องไม่เกิน 1 MB", "File must be at most 1 MB"));
      const data = JSON.parse(await file.text());
      if (captured !== scope) return;
      if (
        data?.format !== "roleforge-relationship-preset" ||
        data.version !== 1
      )
        throw Error("Invalid relationship preset");
      saving = true;
      render();
      if (!(await importPreset(data.preset, captured)))
        throw Error("Preset was not saved");
      if (captured !== scope) return;
      status = t(
        "นำเข้าแล้ว · เก็บคู่ที่เล่นไว้เดิม",
        "Imported. Existing played pairs preserved.",
      );
      await load();
    } catch (error) {
      if (captured === scope) status = error.message;
    } finally {
      if (captured === scope) {
        saving = false;
        render();
      }
    }
  });
  return {
    root,
    show(view) {
      if (!["overview", "history", "rules"].includes(view)) return;
      tab = view;
      picker = false;
      editing = false;
      page = 0;
      status = "";
      render();
    },
    update(next, key, actorId) {
      const changed = scope !== key || actor !== actorId;
      if (changed) {
        serial++;
        scope = key;
        actor = actorId;
        target = "";
        tab = "overview";
        picker = false;
        needle = "";
        page = 0;
        editing = false;
        saving = false;
        status = "";
      }
      state = next;
      render();
    },
    destroy() {
      serial++;
      state = null;
      scope = "";
      root.remove();
    },
  };
}
