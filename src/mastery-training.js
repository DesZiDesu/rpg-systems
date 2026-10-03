// Guided Power Mastery training. This module only describes a pending exercise;
// the story model remains responsible for narrating and confirming its outcome.
const clean = (value, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const key = value => clean(value, 120).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');

export const TRAINING_MODES = Object.freeze([
    { id: 'guided', name: 'Guided practice', th: 'ฝึกแบบมีครูนำ', minChars: 50, maxChars: 400,
        prompt: 'Describe one controlled practice sequence: your stance, breath, power flow, and the result you can actually confirm.' },
    { id: 'scene', name: 'In-scene application', th: 'ฝึกใช้ในฉากจริง', minChars: 100, maxChars: 600,
        prompt: 'Write a short in-character scene where you apply this discipline to a concrete obstacle. Include what you attempt, what you sense, and the immediate consequence.' },
    { id: 'trial', name: 'Personal trial', th: 'บททดสอบส่วนตัว', minChars: 150, maxChars: 800,
        prompt: 'Write a focused trial: define the obstacle, choose a limitation, act with this discipline, and leave a clear opening for the narrator to judge the result.' },
]);
const modeMap = new Map(TRAINING_MODES.map(mode => [mode.id, mode]));

export function trainingMode(id) { return modeMap.get(key(id)) || TRAINING_MODES[0]; }

function stableId(kind, disciplineId, startedAt = '') {
    const source = `${key(kind)}|${key(disciplineId)}|${startedAt}`;
    let hash = 2166136261;
    for (const char of source) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    return `training-${(hash >>> 0).toString(36)}`;
}

export function normalizeMasteryTraining(raw, previous = null) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const kind = ['magic', 'sword'].includes(raw.kind) ? raw.kind : previous?.kind || '';
    const disciplineId = clean(raw.disciplineId || raw.id || previous?.disciplineId, 80);
    const disciplineName = clean(raw.disciplineName || raw.name || previous?.disciplineName, 100);
    if (!kind || !disciplineId || !disciplineName) return null;
    const mode = trainingMode(raw.mode || previous?.mode).id;
    const spec = trainingMode(mode);
    const statusValues = ['pending', 'submitted', 'resolved', 'cancelled'];
    const status = statusValues.includes(raw.status) ? raw.status : previous?.status || 'pending';
    const startedAt = clean(raw.startedAt || previous?.startedAt, 40) || new Date().toISOString();
    const text = clean(raw.text || previous?.text, 1200);
    const minChars = Math.max(15, Math.min(2000, Number(raw.minChars ?? previous?.minChars ?? spec.minChars) || spec.minChars));
    const maxChars = Math.max(minChars, Math.min(3000, Number(raw.maxChars ?? previous?.maxChars ?? spec.maxChars) || spec.maxChars));
    return {
        id: clean(raw.id || previous?.id, 100) || stableId(kind, disciplineId, startedAt),
        kind, disciplineId, disciplineName, mode,
        status, minChars, maxChars,
        prompt: clean(raw.prompt || previous?.prompt, 600) || spec.prompt,
        text, startedAt,
        submittedAt: clean(raw.submittedAt || previous?.submittedAt, 40),
        outcome: clean(raw.outcome || previous?.outcome, 600),
        startMessageId: Number.isInteger(raw.startMessageId) && raw.startMessageId >= 0 ? raw.startMessageId : previous?.startMessageId ?? null,
        roleMessageId: Number.isInteger(raw.roleMessageId) && raw.roleMessageId >= 0 ? raw.roleMessageId : previous?.roleMessageId ?? null,
        sourceMessageId: Number.isInteger(raw.sourceMessageId) && raw.sourceMessageId >= 0 ? raw.sourceMessageId : previous?.sourceMessageId ?? null,
    };
}

export function startMasteryTraining(input, now = new Date().toISOString()) {
    return normalizeMasteryTraining({ ...input, status: 'pending', startedAt: now });
}

export function submitMasteryTraining(training, text, now = new Date().toISOString()) {
    const current = normalizeMasteryTraining(training);
    if (!current || current.status !== 'pending') return { ok: false, error: 'inactive' };
    const response = clean(text, 3000);
    const length = [...response].length;
    if (length < current.minChars) return { ok: false, error: 'too-short', count: length, minChars: current.minChars };
    if (length > current.maxChars) return { ok: false, error: 'too-long', count: length, maxChars: current.maxChars };
    return { ok: true, training: { ...current, status: 'submitted', text: response, submittedAt: now } };
}

export function cancelMasteryTraining(training) {
    const current = normalizeMasteryTraining(training);
    return current ? { ...current, status: 'cancelled' } : null;
}

export function trainingActionText(training, language = 'en') {
    const current = normalizeMasteryTraining(training);
    if (!current) return '';
    const mode = trainingMode(current.mode);
    if (language === 'th') return `ฉันเริ่มฝึก${current.disciplineName}แบบ${mode.th} ฉันจะเขียนโรลเพลย์ที่เกี่ยวข้องอย่างน้อย ${current.minChars} ตัวอักษรและไม่เกิน ${current.maxChars} ตัวอักษร โดยขอให้ผู้บรรยายตัดสินผลจากการกระทำที่เขียนจริง ไม่ถือว่าฉันสำเร็จโดยอัตโนมัติ`;
    return `I begin ${current.disciplineName} training (${mode.name}). I will write an in-character practice of ${current.minChars}-${current.maxChars} characters. Judge only what the role-play actually establishes; do not grant success automatically.`;
}

export function trainingInstruction(training, language = 'en') {
    const current = normalizeMasteryTraining(training);
    if (!current) return '';
    const mode = trainingMode(current.mode);
    const lead = language === 'th'
        ? `การฝึกพลังที่รออยู่: ${current.disciplineName} · ${mode.th}`
        : `Pending mastery exercise: ${current.disciplineName} · ${mode.name}`;
    return `${lead}. ${mode.prompt} Require ${current.minChars}-${current.maxChars} characters. Resolve from the completed role-play only; do not invent a success, failure, proficiency increase, reward, or cost before the scene establishes it.`;
}

export function trainingProgress(training, text = training?.text || '') {
    const current = normalizeMasteryTraining(training);
    if (!current) return { count: 0, ratio: 0, valid: false };
    const count = [...String(text || '')].length;
    return { count, ratio: Math.max(0, Math.min(1, count / current.minChars)), valid: count >= current.minChars && count <= current.maxChars };
}
