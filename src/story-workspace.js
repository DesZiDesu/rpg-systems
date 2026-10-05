import {normalizeStoryMemories} from './story-memory.js?v=0.56.0';
import {normalizeStoryAgenda, storyAgendaState, storyAgendaSummary} from './story-agenda.js?v=0.56.0';
import {normalizeQuestObjectives, questObjectiveProgress, questObjectivesReady} from './quest-objectives.js?v=0.56.0';

// The host owns mutations. These renderers provide escaped prose and delegated forms/actions.
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const words = language => (en, th) => language === 'th' ? th : en;
const list = value => Array.isArray(value) ? value : [];
const heading = (title, detail) => `<header class="trpg-story-heading"><h3>${escape(title)}</h3><p>${escape(detail)}</p></header>`;
const empty = text => `<p class="trpg-story-empty">${escape(text)}</p>`;
const badge = (text, status = '') => `<span class="trpg-story-badge"${status ? ` data-state="${escape(status)}"` : ''}>${escape(text)}</span>`;
const hidden = (name, value) => `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`;
const field = (label, name, value = '', {type = 'text', required = false, maxLength = 180, min, max, placeholder = '', wide = false} = {}) =>
    `<label${wide ? ' class="trpg-story-wide"' : ''}><span>${escape(label)}</span><input type="${escape(type)}" name="${escape(name)}" value="${escape(value)}"${required ? ' required' : ''}${maxLength ? ` maxlength="${maxLength}"` : ''}${min != null ? ` min="${min}"` : ''}${max != null ? ` max="${max}"` : ''}${placeholder ? ` placeholder="${escape(placeholder)}"` : ''}></label>`;
const textarea = (label, name, value = '', maxLength = 2000, rows = 3) =>
    `<label class="trpg-story-wide"><span>${escape(label)}</span><textarea name="${escape(name)}" rows="${rows}" maxlength="${maxLength}">${escape(value)}</textarea></label>`;
const select = (label, name, values, selected = '') => `<label><span>${escape(label)}</span><select name="${escape(name)}">${values.map(([value, text]) => `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(text)}</option>`).join('')}</select></label>`;
const checkbox = (label, name, checked = false) => `<label class="trpg-story-checkbox"><input type="checkbox" name="${escape(name)}"${checked ? ' checked' : ''}><span>${escape(label)}</span></label>`;
const action = (text, name, attributes = {}, primary = false) => `<button type="button" class="trpg-story-button${primary ? ' is-primary' : ''}" data-action="${escape(name)}"${Object.entries(attributes).map(([key, value]) => ` data-${escape(key)}="${escape(value)}"`).join('')}>${escape(text)}</button>`;
const submit = text => `<button class="trpg-story-button is-primary trpg-story-submit" type="submit">${escape(text)}</button>`;
const disclosure = (label, content, extraClass = '') => `<details class="trpg-story-disclosure ${extraClass}"><summary>${escape(label)}</summary>${content}</details>`;

function sourceInfo(item, word) {
    const messageId = item.sourceMessageId;
    const hasMessage = messageId !== null && messageId !== undefined && Number.isInteger(Number(messageId)) && Number(messageId) >= 0;
    if (!item.evidence && !hasMessage && item.sourceDay == null) return '';
    const source = [item.sourceDay == null ? '' : `${word('Story day', 'วันที่ในเรื่อง')} ${item.sourceDay}`, hasMessage ? `${word('Message', 'ข้อความ')} #${Number(messageId) + 1}` : ''].filter(Boolean).join(' · ');
    return disclosure(word('Source evidence', 'หลักฐานจากเนื้อเรื่อง'), `<div class="trpg-story-source">${source ? `<small>${escape(source)}</small>` : ''}${item.evidence ? `<blockquote>${escape(item.evidence)}</blockquote>` : ''}${hasMessage ? action(word('View source message', 'ดูข้อความต้นทาง'), 'story-source-message', {'message-id': Number(messageId)}) : ''}</div>`);
}

function memoryLabels(word) {
    return {
        kinds: [['Fact', word('Important fact', 'ข้อเท็จจริงสำคัญ')], ['Promise', word('Promise', 'คำสัญญา')], ['Secret', word('Secret', 'ความลับ')], ['Thread', word('Unresolved thread', 'เรื่องที่ยังค้าง')]],
        statuses: [['Active', word('Active', 'ยังดำเนินอยู่')], ['Resolved', word('Resolved', 'คลี่คลายแล้ว')], ['Archived', word('Archived', 'เก็บเข้าคลัง')]],
        importance: [['Low', word('Low', 'ต่ำ')], ['Normal', word('Normal', 'ปกติ')], ['High', word('High', 'สูง')]],
    };
}

function memoryForm(item, word) {
    const labels = memoryLabels(word);
    return `<form data-form="story-memory" class="trpg-story-form">${hidden('id', item.id || '')}
        ${field(word('Title', 'ชื่อเรื่อง'), 'title', item.title, {required: true, maxLength: 160, wide: true})}
        ${textarea(word('What should be remembered?', 'รายละเอียดที่ต้องจำ'), 'detail', item.detail, 2400)}
        ${select(word('Kind', 'ประเภท'), 'kind', labels.kinds, item.kind || 'Fact')}
        ${select(word('Status', 'สถานะ'), 'status', labels.statuses, item.status || 'Active')}
        ${field(word('People (comma separated)', 'ผู้เกี่ยวข้อง (คั่นด้วยจุลภาค)'), 'people', list(item.people).join(', '), {maxLength: 2040})}
        ${field(word('Keywords (comma separated)', 'คำค้น (คั่นด้วยจุลภาค)'), 'keywords', list(item.keywords).join(', '), {maxLength: 1968})}
        ${select(word('Importance', 'ความสำคัญ'), 'importance', labels.importance, item.importance || 'Normal')}
        ${checkbox(word('Pin this active memory for the AI', 'ตรึงความจำนี้ให้ AI เมื่อยังดำเนินอยู่'), 'pinned', item.pinned === true)}
        ${textarea(word('Resolution, if any', 'ผลการคลี่คลาย (ถ้ามี)'), 'resolution', item.resolution, 1000, 2)}
        ${textarea(word('Source evidence', 'หลักฐานจากเนื้อเรื่อง'), 'evidence', item.evidence, 1000, 2)}
        ${submit(word('Save memory', 'บันทึกความจำ'))}</form>`;
}

function memoryCard(item, word) {
    const labels = memoryLabels(word), name = (options, value) => options.find(([key]) => key === value)?.[1] || value;
    const buttons = [];
    if (item.status !== 'Active') buttons.push(action(word('Reopen memory', 'เปิดเรื่องอีกครั้ง'), 'story-memory-status', {id: item.id, status: 'Active'}));
    if (item.status === 'Active') buttons.push(action(word('Confirm resolved', 'ยืนยันว่าคลี่คลายแล้ว'), 'story-memory-status', {id: item.id, status: 'Resolved'}));
    if (item.status !== 'Archived') buttons.push(action(word('Archive', 'เก็บเข้าคลัง'), 'story-memory-status', {id: item.id, status: 'Archived'}));
    return `<article class="trpg-story-card" data-story-memory-id="${escape(item.id)}">
        <header><div class="trpg-story-badges">${badge(name(labels.kinds, item.kind))}${badge(name(labels.statuses, item.status), item.status)}${item.pinned ? badge(word('Pinned', 'ตรึงไว้')) : ''}${item.importance === 'High' ? badge(word('High importance', 'ความสำคัญสูง')) : ''}</div><h4>${escape(item.title)}</h4></header>
        ${item.detail ? `<p class="trpg-story-prose">${escape(item.detail)}</p>` : ''}
        ${list(item.people).length ? `<p class="trpg-story-meta">${escape(word('People', 'ผู้เกี่ยวข้อง'))}: ${escape(item.people.join(', '))}</p>` : ''}
        ${item.resolution ? `<p class="trpg-story-resolution"><strong>${escape(word('Resolution', 'ผลการคลี่คลาย'))}</strong> ${escape(item.resolution)}</p>` : ''}
        ${sourceInfo(item, word)}<div class="trpg-story-actions">${buttons.join('')}</div>
        ${disclosure(word('Edit memory', 'แก้ไขความจำ'), memoryForm(item, word))}</article>`;
}

export function renderStoryMemoryPanel(panel, state, language = 'en') {
    if (!panel) return;
    const word = words(language), records = normalizeStoryMemories(state?.storyMemories);
    const importance = {High: 2, Normal: 1, Low: 0};
    const active = records.filter(item => item.status === 'Active').sort((a, b) => Number(b.pinned) - Number(a.pinned) || importance[b.importance] - importance[a.importance] || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const closed = records.filter(item => item.status !== 'Active').sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    panel.innerHTML = `<div class="trpg-story-workspace">${heading(word('Story Memory', 'ความจำเรื่องสำคัญ'), word('Keep confirmed facts, promises, secrets and unresolved threads for this chat.', 'เก็บข้อเท็จจริง คำสัญญา ความลับ และเรื่องที่ยังค้าง ซึ่งยืนยันแล้วในแชตนี้'))}
        <p class="trpg-story-note">${escape(word('Active memories are recalled when relevant. Pins have priority. Resolving or archiving keeps the record so you can reopen it later.', 'ความจำที่ยังดำเนินอยู่จะถูกส่งให้ AI เมื่อเกี่ยวข้อง รายการที่ตรึงไว้มีลำดับก่อน การคลี่คลายหรือเก็บเข้าคลังยังเก็บข้อมูลไว้และเปิดกลับได้'))}</p>
        <div class="trpg-story-summary">${badge(`${active.length} ${word('active', 'ยังดำเนินอยู่')}`)}${badge(`${active.filter(item => item.pinned).length} ${word('pinned', 'ตรึงไว้')}`)}${badge(`${closed.length} ${word('resolved / archived', 'คลี่คลายแล้ว / เก็บเข้าคลัง')}`)}</div>
        ${disclosure(word('Add memory', 'เพิ่มความจำ'), memoryForm({}, word), 'trpg-story-create')}
        <div class="trpg-story-cards">${active.length ? active.map(item => memoryCard(item, word)).join('') : empty(word('No active memories yet. Important confirmed events will appear here, or you can add one yourself.', 'ยังไม่มีความจำที่ดำเนินอยู่ เหตุการณ์สำคัญที่ยืนยันแล้วจะปรากฏที่นี่ หรือเพิ่มด้วยตนเองได้'))}</div>
        ${closed.length ? disclosure(`${word('Resolved and archived', 'คลี่คลายแล้วและเก็บเข้าคลัง')} (${closed.length})`, `<div class="trpg-story-cards">${closed.map(item => memoryCard(item, word)).join('')}</div>`) : ''}</div>`;
}

function agendaLabels(word) {
    return {
        kinds: [['Appointment', word('Appointment', 'นัดหมาย')], ['Deadline', word('Deadline', 'เส้นตาย')]],
        statuses: [['Scheduled', word('Scheduled', 'รอดำเนินการ')], ['Completed', word('Completed', 'เสร็จแล้ว')], ['Cancelled', word('Cancelled', 'ยกเลิก')]],
        reminders: {Upcoming: word('Upcoming', 'ยังไม่ถึงกำหนด'), Today: word('Today', 'วันนี้'), Due: word('Due now', 'ถึงกำหนดแล้ว'), Overdue: word('Overdue', 'เลยกำหนด'), Unscheduled: word('Time not fixed', 'ยังไม่กำหนดเวลาชัดเจน'), Completed: word('Completed', 'เสร็จแล้ว'), Cancelled: word('Cancelled', 'ยกเลิก')},
    };
}

function agendaForm(item, state, word) {
    const labels = agendaLabels(word), quests = list(state?.quests);
    const options = [['', word('No linked quest', 'ไม่เชื่อมกับเควสต์')], ...quests.map(quest => [String(quest.id), quest.name || quest.title || quest.id])];
    if (item.questId && !quests.some(quest => String(quest.id) === item.questId)) options.push([item.questId, item.questId]);
    return `<form data-form="story-agenda" class="trpg-story-form">${hidden('id', item.id || '')}
        ${field(word('Title', 'ชื่อนัดหมายหรือเส้นตาย'), 'title', item.title, {required: true, maxLength: 180, wide: true})}
        ${textarea(word('Details', 'รายละเอียด'), 'detail', item.detail, 700)}
        ${select(word('Kind', 'ประเภท'), 'kind', labels.kinds, item.kind || 'Appointment')}
        ${select(word('Status', 'สถานะ'), 'status', labels.statuses, item.status || 'Scheduled')}
        ${field(word('Due story day (optional)', 'วันที่ในเรื่อง (ไม่บังคับ)'), 'dueDay', item.dueDay ?? '', {type: 'number', min: 1, max: 999999, maxLength: null})}
        ${field(word('Due time (optional)', 'เวลา (ไม่บังคับ)'), 'dueTime', item.dueTime || '', {type: 'time', maxLength: null})}
        ${field(word('Time as stated in the story', 'เวลาตามที่เนื้อเรื่องระบุ'), 'whenText', item.whenText, {maxLength: 180, placeholder: word('For example: after the festival', 'ตัวอย่าง: หลังงานเทศกาล'), wide: true})}
        ${field(word('People (comma separated)', 'ผู้เกี่ยวข้อง (คั่นด้วยจุลภาค)'), 'people', list(item.people).join(', '), {maxLength: 1472})}
        ${field(word('Location', 'สถานที่'), 'location', item.location)}
        ${select(word('Linked quest (optional)', 'เควสต์ที่เกี่ยวข้อง (ไม่บังคับ)'), 'questId', options, item.questId || '')}
        ${textarea(word('Outcome, if any', 'ผลลัพธ์ (ถ้ามี)'), 'resolution', item.resolution, 500, 2)}
        ${textarea(word('Source evidence', 'หลักฐานจากเนื้อเรื่อง'), 'evidence', item.evidence, 700, 2)}
        ${submit(word('Save appointment', 'บันทึกนัดหมาย'))}</form>`;
}

function agendaCard(item, state, word) {
    const labels = agendaLabels(word), reminder = storyAgendaState(item, state?.worldClock);
    const kind = labels.kinds.find(([key]) => key === item.kind)?.[1] || item.kind;
    const timing = [item.dueDay == null ? '' : `${word('Story day', 'วันที่ในเรื่อง')} ${item.dueDay}`, item.dueTime || ''].filter(Boolean).join(' · ');
    const quest = list(state?.quests).find(entry => String(entry.id) === item.questId);
    const buttons = item.status === 'Scheduled'
        ? [action(word('Confirm completed', 'ยืนยันว่าเสร็จแล้ว'), 'story-agenda-status', {id: item.id, status: 'Completed'}), action(word('Cancel appointment', 'ยกเลิกนัดหมาย'), 'story-agenda-status', {id: item.id, status: 'Cancelled'})]
        : [action(word('Reopen appointment', 'เปิดนัดหมายอีกครั้ง'), 'story-agenda-status', {id: item.id, status: 'Scheduled'})];
    return `<article class="trpg-story-card" data-story-agenda-id="${escape(item.id)}" data-reminder="${escape(reminder)}">
        <header><div class="trpg-story-badges">${badge(kind)}${badge(labels.reminders[reminder] || reminder, reminder)}</div><h4>${escape(item.title)}</h4></header>
        ${timing ? `<p class="trpg-story-timing">${escape(timing)}</p>` : ''}${item.whenText ? `<p class="trpg-story-meta">${escape(item.whenText)}</p>` : ''}
        ${item.detail ? `<p class="trpg-story-prose">${escape(item.detail)}</p>` : ''}
        ${list(item.people).length ? `<p class="trpg-story-meta">${escape(word('People', 'ผู้เกี่ยวข้อง'))}: ${escape(item.people.join(', '))}</p>` : ''}
        ${item.location ? `<p class="trpg-story-meta">${escape(word('Location', 'สถานที่'))}: ${escape(item.location)}</p>` : ''}
        ${item.questId ? `<p class="trpg-story-meta">${escape(word('Quest', 'เควสต์'))}: ${escape(quest?.name || quest?.title || item.questId)}</p>` : ''}
        ${item.resolution ? `<p class="trpg-story-resolution"><strong>${escape(word('Outcome', 'ผลลัพธ์'))}</strong> ${escape(item.resolution)}</p>` : ''}
        ${sourceInfo(item, word)}<div class="trpg-story-actions">${buttons.join('')}</div>
        ${disclosure(word('Edit appointment', 'แก้ไขนัดหมาย'), agendaForm(item, state, word))}</article>`;
}

export function renderStoryAgendaPanel(panel, state, language = 'en') {
    if (!panel) return;
    const word = words(language), records = normalizeStoryAgenda(state?.storyAgenda), summary = storyAgendaSummary(records, state?.worldClock);
    const priority = {Overdue: 0, Due: 1, Today: 2, Upcoming: 3, Unscheduled: 4};
    const active = records.filter(item => item.status !== 'Completed' && item.status !== 'Cancelled').sort((a, b) =>
        priority[storyAgendaState(a, state?.worldClock)] - priority[storyAgendaState(b, state?.worldClock)] || (a.dueDay ?? Infinity) - (b.dueDay ?? Infinity) || String(a.dueTime || '').localeCompare(String(b.dueTime || '')));
    const closed = records.filter(item => item.status === 'Completed' || item.status === 'Cancelled');
    panel.innerHTML = `<div class="trpg-story-workspace">${heading(word('Appointments & Deadlines', 'นัดหมายและเส้นตาย'), word('Track plans and time limits using the time inside the story.', 'ติดตามนัดหมายและงานที่มีกำหนดเวลาด้วยเวลาในเนื้อเรื่อง'))}
        <p class="trpg-story-note">${escape(word('Reminders follow the story clock. Vague timing stays as written until the story confirms a date. Being overdue does not automatically fail a quest or cancel an appointment.', 'การเตือนใช้เวลาในเนื้อเรื่อง เวลาที่ยังไม่ชัดเจนจะเก็บตามข้อความเดิมจนกว่าเรื่องจะยืนยันวัน การเลยกำหนดไม่ทำให้เควสต์ล้มเหลวหรือยกเลิกนัดหมายเอง'))}</p>
        <div class="trpg-story-summary">${badge(`${summary.active} ${word('scheduled', 'รอดำเนินการ')}`)}${badge(`${summary.today} ${word('today', 'วันนี้')}`, 'Today')}${badge(`${summary.due} ${word('due', 'ถึงกำหนด')}`, 'Due')}${badge(`${summary.overdue} ${word('overdue', 'เลยกำหนด')}`, 'Overdue')}</div>
        ${disclosure(word('Add appointment or deadline', 'เพิ่มนัดหมายหรือเส้นตาย'), agendaForm({}, state, word), 'trpg-story-create')}
        <div class="trpg-story-cards">${active.length ? active.map(item => agendaCard(item, state, word)).join('') : empty(word('No upcoming plans yet. Confirmed appointments and deadlines will appear here, or you can add one yourself.', 'ยังไม่มีนัดหมายที่รอดำเนินการ นัดหมายและเส้นตายที่ยืนยันแล้วจะปรากฏที่นี่ หรือเพิ่มด้วยตนเองได้'))}</div>
        ${closed.length ? disclosure(`${word('Completed and cancelled', 'เสร็จแล้วและยกเลิก')} (${closed.length})`, `<div class="trpg-story-cards">${closed.map(item => agendaCard(item, state, word)).join('')}</div>`) : ''}</div>`;
}

function objectiveLabels(word) {
    return [['Pending', word('Pending', 'รอดำเนินการ')], ['Completed', word('Completed', 'สำเร็จแล้ว')], ['Skipped', word('Skipped', 'ข้ามไว้')]];
}

function objectiveForm(item, quest, word) {
    return `<form data-form="quest-objective" class="trpg-story-form">${hidden('questId', quest.id)}${hidden('id', item.id || '')}
        ${field(word('Objective title', 'ชื่อเป้าหมายย่อย'), 'title', item.title, {required: true, maxLength: 180, wide: true})}
        ${select(word('Status', 'สถานะ'), 'status', objectiveLabels(word), item.status || 'Pending')}
        ${checkbox(word('Optional objective', 'เป้าหมายเสริม (ไม่บังคับ)'), 'optional', item.optional === true)}
        ${textarea(word('Notes', 'หมายเหตุ'), 'notes', item.notes, 1200, 2)}
        ${textarea(word('Source evidence', 'หลักฐานจากเนื้อเรื่อง'), 'evidence', item.evidence, 1200, 2)}
        ${submit(word('Save objective', 'บันทึกเป้าหมายย่อย'))}</form>`;
}

export function renderQuestObjectives(quest = {}, language = 'en') {
    const word = words(language), objectives = normalizeQuestObjectives(quest?.objectives), labels = objectiveLabels(word);
    const readonly = quest?.status === 'Completed' || quest?.status === 'Failed';
    const required = objectives.filter(item => !item.optional), completed = required.filter(item => item.status === 'Completed').length;
    const ready = questObjectivesReady(quest), progress = questObjectiveProgress(quest);
    const optional = objectives.filter(item => item.optional), optionalCompleted = optional.filter(item => item.status === 'Completed').length;
    const cards = objectives.map(item => {
        const status = labels.find(([key]) => key === item.status)?.[1] || item.status;
        const quick = readonly ? '' : `<div class="trpg-story-actions">${item.status === 'Completed'
            ? action(word('Reopen objective', 'เปิดเป้าหมายอีกครั้ง'), 'quest-objective-status', {'quest-id': quest.id, id: item.id, status: 'Pending'})
            : action(word('Confirm objective completed', 'ยืนยันว่าเป้าหมายสำเร็จแล้ว'), 'quest-objective-status', {'quest-id': quest.id, id: item.id, status: 'Completed'})}</div>`;
        return `<article class="trpg-story-objective" data-quest-objective-id="${escape(item.id)}"><header><h5>${escape(item.title)}</h5><div class="trpg-story-badges">${badge(item.optional ? word('Optional', 'เป้าหมายเสริม') : word('Required', 'จำเป็น'))}${badge(status, item.status)}</div></header>
            ${item.notes ? `<p class="trpg-story-prose">${escape(item.notes)}</p>` : ''}${sourceInfo(item, word)}${quick}
            ${readonly ? '' : disclosure(word('Edit objective', 'แก้ไขเป้าหมายย่อย'), objectiveForm(item, quest, word))}</article>`;
    }).join('');
    return `<section class="trpg-story-objectives"><header class="trpg-story-objectives-heading"><h4>${escape(word('Quest objectives', 'เป้าหมายย่อย'))}</h4>${required.length ? `<span>${completed} / ${required.length} ${escape(word('required completed', 'เป้าหมายจำเป็นสำเร็จ'))}</span>` : objectives.length ? `<span>${escape(word('No required objectives', 'ไม่มีเป้าหมายจำเป็น'))}</span>` : ''}</header>
        ${optional.length ? `<p class="trpg-story-meta">${optionalCompleted} / ${optional.length} ${escape(word('optional completed', 'เป้าหมายเสริมสำเร็จ'))}</p>` : ''}
        ${objectives.length ? `<div class="trpg-story-progress" role="progressbar" aria-label="${escape(word('Required objective progress', 'ความคืบหน้าเป้าหมายจำเป็น'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Number(progress) || 0}"><span style="width:${Math.max(0, Math.min(100, Number(progress) || 0))}%"></span></div>${cards}` : empty(word('No steps recorded yet. Add the goals confirmed in the story to track them separately.', 'ยังไม่มีเป้าหมายย่อย เพิ่มเป้าหมายที่เนื้อเรื่องยืนยันแล้วเพื่อติดตามแต่ละขั้น'))}
        ${ready && quest.status === 'Active' ? `<p class="trpg-story-note">${escape(word('All required objectives are satisfied. Confirm the quest outcome when the story agrees. This button does not grant a reward.', 'ผ่านเป้าหมายจำเป็นครบแล้ว ยืนยันจบเควสต์เมื่อเนื้อเรื่องยืนยันผล ปุ่มนี้ไม่จ่ายรางวัลเอง'))}</p>${action(word('Confirm quest completed', 'ยืนยันจบเควสต์'), 'quest-complete', {id: quest.id}, true)}` : ''}
        ${readonly ? `<p class="trpg-story-note">${escape(word('This quest is closed. Its objectives remain available as a record.', 'เควสต์นี้จบแล้ว เป้าหมายย่อยยังเก็บไว้สำหรับดูย้อนหลัง'))}</p>` : disclosure(word('Add objective', 'เพิ่มเป้าหมายย่อย'), objectiveForm({}, quest, word), 'trpg-story-create')}</section>`;
}
