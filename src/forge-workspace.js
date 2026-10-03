import { FORGE_DEFAULTS, FORGE_PRESET_FIELDS, validateForgePreset, exportForgePreset, importForgePreset } from './forge-presets.js?v=0.50.0';
import { uiText } from './ui-language.js?v=0.50.0';

const labels = { origins: 'Origin locations / ถิ่นกำเนิด', standings: 'Social standings / สถานะทางสังคม', skillCategories: 'Skill categories / หมวดสกิล', masteryRanks: 'Mastery ranks / ขั้นความเชี่ยวชาญ', pathRanks: 'Path ranks / อันดับเส้นทาง' };
const node = (tag, value = '') => { const result = document.createElement(tag); result.textContent = value; return result; };
export function mountForgeWorkspace(host, api) {
    let preset = api.config();
    const root = node('section'); root.className = 'rf-power-workspace'; host.replaceChildren(root);
    const status = node('p'); status.setAttribute('role', 'status');
    const save = async next => { preset = await api.save(validateForgePreset(next)); render(); };
    function render() {
        root.replaceChildren(node('h3', uiText('Character Forge Preset')), status);
        status.textContent = '';
        const toolbar = node('div'); toolbar.className = 'rf-power-toolbar';
        const mode = node('select'); mode.setAttribute('aria-label', 'Character Forge preset mode');
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
        const action = (label, handler) => { const button = node('button', uiText(label)); button.type = 'button'; button.onclick = handler; toolbar.append(button); };
        toolbar.append(mode); action('Import JSON', () => file.click());
        action('Export JSON', () => { const source = exportForgePreset(preset.mode === 'tretaresia' ? { mode: 'custom', name: 'Original', ...FORGE_DEFAULTS } : preset);
            const url = URL.createObjectURL(new Blob([source], { type: 'application/json' })), link = node('a');
            link.href = url; link.download = 'roleforge-character-forge.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        }); toolbar.append(file); root.append(toolbar);
        root.append(node('p', uiText('Preset shared across chats of this character card. Existing profiles are retained.')));
        if (preset.mode !== 'custom') { root.append(node('p', uiText('Choose Custom to start with empty lists, or export the original preset and import it to edit.'))); return; }
        const form = node('form'); form.className = 'rf-power-editor';
        const nameLabel = node('label', uiText('Preset name')); const name = node('input'); name.maxLength = 80; name.value = preset.name; nameLabel.append(name); form.append(nameLabel);
        for (const key of FORGE_PRESET_FIELDS) {
            const label = node('label', uiText(labels[key] + ' — one choice per line'));
            const field = node('textarea'); field.name = key; field.rows = 4; field.value = preset[key].join('\n'); label.append(field); form.append(label);
        }
        const submit = node('button', uiText('Save preset')); submit.type = 'submit'; form.append(submit);
        form.onsubmit = event => { event.preventDefault(); const next = { ...preset, name: name.value };
            for (const key of FORGE_PRESET_FIELDS) next[key] = form.elements[key].value.split('\n').map(value => value.trim()).filter(Boolean);
            save(next).catch(error => { status.textContent = error.message; });
        }; root.append(form);
    }
    render(); return { root, refreshLanguage: render };
}
