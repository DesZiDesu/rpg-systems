import { normalizeMasteryTraining, TRAINING_MODES, trainingMode, trainingProgress, submitMasteryTraining } from './mastery-training.js?v=0.52.0';

const copy = (language, en, th) => language === 'th' ? th : en;
const node = (tag, className = '', text = '') => { const value = document.createElement(tag); value.className = className; if (text !== undefined) value.textContent = text; return value; };

/** Render the exercise chooser / status inside the Power & Combat panel. */
export function renderMasteryTrainingPanel({ training = null, discipline = null, language = 'en', onStart, onCancel } = {}) {
    const root = node('section', 'tretaresia-mastery-training-panel');
    const header = node('header', 'tretaresia-mastery-training-header');
    const title = node('div'); title.append(node('span', 'tretaresia-section-eyebrow', copy(language, 'PRACTICE HALL', 'หอลานฝึก')), node('h3', '', copy(language, 'Train this discipline', 'ฝึกหมวดพลังนี้')));
    header.append(title, node('span', 'tretaresia-mastery-training-seal', '✦')); root.append(header);
    if (training) {
        const current = normalizeMasteryTraining(training), mode = trainingMode(current.mode);
        const progress = trainingProgress(current);
        const body = node('div', 'tretaresia-mastery-training-active');
        body.append(node('strong', 'tretaresia-mastery-training-discipline', current.disciplineName));
        body.append(node('p', 'tretaresia-mastery-training-prompt', current.prompt));
        const meter = node('div', 'tretaresia-mastery-training-meter');
        meter.append(node('span', '', `${progress.count} / ${current.minChars} ${copy(language, 'characters', 'ตัวอักษร')}`));
        const track = node('div'); const fill = node('i'); fill.style.width = `${Math.round(progress.ratio * 100)}%`; track.append(fill); meter.append(track); body.append(meter);
        const actions = node('div', 'tretaresia-mastery-training-actions');
        const cancel = node('button', 'tretaresia-secondary-button', copy(language, 'Cancel exercise', 'ยกเลิกการฝึก')); cancel.type = 'button'; cancel.addEventListener('click', () => onCancel?.(current)); actions.append(cancel);
        body.append(node('small', 'tretaresia-mastery-training-mode', `${mode.name} · ${current.minChars}–${current.maxChars}`), actions); root.append(body); return root;
    }
    if (discipline) root.append(node('p', 'tretaresia-mastery-training-discipline', discipline.name));
    root.append(node('p', 'tretaresia-mastery-training-help', copy(language,
        'Choose a scene-sized exercise. The next Main Chat turn judges only what your role actually establishes.',
        'เลือกแบบฝึกเป็นฉากสั้น ๆ จากนั้น Main Chat จะตัดสินจากโรลที่เขียนจริงเท่านั้น')));
    const modes = node('div', 'tretaresia-mastery-training-modes');
    for (const mode of TRAINING_MODES) {
        const card = node('button', 'tretaresia-mastery-training-mode-card'); card.type = 'button';
        card.append(node('strong', '', language === 'th' ? mode.th : mode.name), node('small', '', `${mode.minChars}–${mode.maxChars} ${copy(language, 'characters', 'ตัวอักษร')}`), node('span', '', mode.prompt));
        card.addEventListener('click', () => onStart?.({ ...discipline, mode: mode.id })); modes.append(card);
    }
    root.append(modes); return root;
}

/** Render an exercise attached to an assistant turn in Main Chat. */
export function renderMasteryTrainingCard(training, api = {}, language = 'en') {
    const current = normalizeMasteryTraining(training); if (!current) return null;
    const root = node('section', 'trpg-mastery-training-card');
    root.append(node('small', 'trpg-mastery-training-eyebrow', copy(language, 'MASTERY EXERCISE', 'แบบฝึกความชำนาญ')), node('h3', '', current.disciplineName));
    const mode = trainingMode(current.mode); root.append(node('p', 'trpg-mastery-training-mode', `${language === 'th' ? mode.th : mode.name} · ${current.minChars}–${current.maxChars} ${copy(language, 'characters', 'ตัวอักษร')}`));
    root.append(node('p', 'trpg-mastery-training-prompt', current.prompt));
    const state = node('div', 'trpg-mastery-training-state');
    if (current.status === 'pending') {
        state.append(node('span', '', copy(language, 'Write the role in your next message.', 'เขียนโรลในข้อความถัดไป')));
        const send = node('button', 'trpg-mastery-training-send', copy(language, 'Begin in Main Chat', 'เริ่มฝึกใน Main Chat')); send.type = 'button'; send.addEventListener('click', () => api.beginTraining?.(current)); state.append(send);
    } else if (current.status === 'submitted') state.append(node('span', '', copy(language, 'Submitted · waiting for the narrator', 'ส่งโรลแล้ว · รอผู้บรรยายตอบ')));
    else state.append(node('span', '', current.status === 'resolved' ? copy(language, 'Exercise resolved', 'จบแบบฝึกแล้ว') : copy(language, 'Exercise cancelled', 'ยกเลิกแบบฝึกแล้ว')));
    root.append(state); return root;
}

export { submitMasteryTraining };
