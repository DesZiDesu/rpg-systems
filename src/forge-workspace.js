import { FORGE_DEFAULTS, FORGE_PRESET_FIELDS, validateForgePreset, exportForgePreset, importForgePreset } from './forge-presets.js?v=0.59.0';
import { uiText } from './ui-language.js?v=0.59.0';

const labels = { origins: 'Origin locations / ถิ่นกำเนิด', standings: 'Social standings / สถานะทางสังคม', skillCategories: 'Skill categories / หมวดสกิล', masteryRanks: 'Mastery ranks / ขั้นความเชี่ยวชาญ', pathRanks: 'Path ranks / อันดับเส้นทาง', arsenalTypes: 'Arsenal types / ประเภทสิ่งของ', alignments: 'Alignment / แนวทางตัวละคร' };
const node = (tag, value = '') => { const result = document.createElement(tag); result.textContent = value; return result; };
export function mountForgeWorkspace(host, api) {
    let preset = api.config();
    const root = node('section'); root.className = 'rf-forge-workspace'; host.replaceChildren(root);
    const status = node('p'); status.setAttribute('role', 'status');
    const save = async next => { preset = await api.save(validateForgePreset(next)); render(); };
    function render() {
        root.replaceChildren(node('h3', uiText('Character Forge Preset')), status);
        status.textContent = '';
        const toolbar = node('div'); toolbar.className = 'rf-forge-toolbar';
        const mode = node('select'); mode.className = 'text_pole'; mode.setAttribute('aria-label', 'Character Forge preset mode');
        for (const [value, label] of [['tretaresia', uiText('Original Preset · ชุดเดิม')], ['custom', uiText('Custom')]]) {
            const option = node('option', label); option.value = value; mode.append(option);
        }
        mode.value = preset.mode;
        mode.onchange = () => save({ ...preset, mode: mode.value }).catch(error => { status.textContent = error.message; mode.value = preset.mode; });
        const file = node('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
        file.onchange = async () => { const chosen = file.files?.[0]; file.value = ''; if (!chosen) return;
            try { if (chosen.size > 1024 * 1024) throw Error('Preset file must be at most 1 MB');
                const imported = importForgePreset(await chosen.text());
                if (confirm(uiText('Replace this card’s Character Forge preset? Existing chat profiles remain saved.'))) await save(imported);
            } catch (error) { status.textContent = error.message; }
        };
        const action = (label, handler) => { const button = node('button', uiText(label)); button.className = 'menu_button'; button.type = 'button'; button.onclick = handler; toolbar.append(button); };
        toolbar.append(mode); action('Import JSON', () => file.click());
        action('Export JSON', () => { const source = exportForgePreset(preset.mode === 'tretaresia' ? { mode: 'custom', name: 'Original', ...FORGE_DEFAULTS } : preset);
            const url = URL.createObjectURL(new Blob([source], { type: 'application/json' })), link = node('a');
            link.href = url; link.download = 'roleforge-character-forge.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        }); toolbar.append(file); root.append(toolbar);
        root.append(node('p', uiText('Preset shared across chats of this character card. Existing profiles are retained.')));
        if (preset.mode !== 'custom') { root.append(node('p', uiText('Choose Custom to start with empty lists, or export the original preset and import it to edit.'))); return; }
        const form = node('form'); form.className = 'rf-forge-editor';
        const nameLabel = node('label', uiText('Preset name')); const name = node('input'); name.className = 'text_pole'; name.maxLength = 80; name.value = preset.name; nameLabel.append(name); form.append(nameLabel);
        const choiceReaders = {};
        for (const key of FORGE_PRESET_FIELDS) {
            const group = node('fieldset'); group.className = 'rf-forge-choices';
            group.append(node('legend', uiText(labels[key])));
            const rows = node('div'); rows.className = 'rf-forge-choice-rows';
            const max = key === 'arsenalTypes' ? 60 : 100;
            const addRow = (value = '') => {
                if (rows.childElementCount >= 64) { status.textContent = uiText('Use up to 64 choices.'); return; }
                const row = node('div'); row.className = 'rf-forge-choice-row';
                const input = node('input'); input.className = 'text_pole'; input.value = value; input.maxLength = max;
                input.setAttribute('aria-label', uiText(labels[key]));
                const remove = node('button', '×'); remove.className = 'menu_button'; remove.type = 'button';
                remove.setAttribute('aria-label', uiText('Remove choice')); remove.onclick = () => row.remove();
                row.append(input, remove); rows.append(row); return input;
            };
            preset[key].forEach(addRow);
            const add = node('button', uiText('+ Add choice')); add.className = 'menu_button'; add.type = 'button';
            add.onclick = () => addRow()?.focus();
            rows.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); addRow()?.focus(); } });
            const bulk = node('details'); bulk.append(node('summary', uiText('Bulk entry / ใส่หลายรายการ')));
            const field = node('textarea'); field.className = 'text_pole'; field.rows = 3;
            field.setAttribute('aria-label', uiText(labels[key] + ' — one choice per line'));
            const replace = node('button', uiText('Apply list')); replace.className = 'menu_button'; replace.type = 'button';
            replace.onclick = () => {
                const values = field.value.split('\n').map(value => value.trim()).filter(Boolean);
                try { validateForgePreset({ ...preset, [key]: values }); }
                catch (error) { status.textContent = error.message; return; }
                rows.replaceChildren(); values.forEach(addRow);
            };
            bulk.append(field, replace); group.append(rows, add, bulk); form.append(group);
            choiceReaders[key] = () => [...rows.querySelectorAll('input')].map(input => input.value.trim()).filter(Boolean);
        }
        const rankLabel = node('input'); rankLabel.className = 'text_pole'; rankLabel.maxLength = 100; rankLabel.value = preset.rankLabel;
        const rankTitle = node('label', uiText('Rank heading / ชื่อเรียกอันดับ')); rankTitle.append(rankLabel); form.append(rankTitle);
        const showRank = node('input'); showRank.type = 'checkbox'; showRank.checked = preset.showRank;
        const rankVisibility = node('label', uiText('Show rank / แสดงอันดับ')); rankVisibility.className = 'checkbox_label rf-forge-rank-visibility'; rankVisibility.prepend(showRank); form.append(rankVisibility);
        const submit = node('button', uiText('Save preset')); submit.className = 'menu_button'; submit.type = 'submit'; form.append(submit);
        form.onsubmit = event => { event.preventDefault(); const next = { ...preset, name: name.value, rankLabel: rankLabel.value, showRank: showRank.checked };
            for (const key of FORGE_PRESET_FIELDS) next[key] = choiceReaders[key]();
            save(next).catch(error => { status.textContent = error.message; });
        }; root.append(form);
    }
    render(); return { root, refreshLanguage: render };
}
