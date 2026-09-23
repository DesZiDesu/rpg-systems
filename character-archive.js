// Large, character-wide records belong to the character card, not the global
// SillyTavern settings payload. Keep legacy settings as a fallback until the
// server has acknowledged each archive migration.
export const ARCHIVE_FIELDS = Object.freeze({
    npcs: 'tretaresia_rpg_npcs',
    lore: 'tretaresia_rpg_lore',
});
const LEGACY_FIELDS = Object.freeze({npcs:'npcCharacterLibraries',lore:'loreCharacterLibraries'});
const writes = new Map();

function cardFor(context, owner) {
    if (!owner?.startsWith('card:')) return null;
    const avatar = owner.slice(5);
    return context.characters?.find(card => card?.avatar === avatar) || null;
}

function cardArchive(card, kind) {
    const field = ARCHIVE_FIELDS[kind];
    if (!field || !card) return null;
    let archive = card.data?.extensions?.[field];
    if (!Array.isArray(archive) && typeof card.json_data === 'string') {
        try { archive = JSON.parse(card.json_data)?.data?.extensions?.[field]; }
        catch { /* An unparsed card cannot replace the intact legacy archive. */ }
    }
    return Array.isArray(archive) ? archive : null;
}

export function readCharacterArchive(context, settings, owner, kind) {
    const stored = cardArchive(cardFor(context, owner), kind);
    if (stored) return stored;
    const legacy = settings?.[LEGACY_FIELDS[kind]]?.[owner];
    return Array.isArray(legacy) ? legacy : [];
}

function clearLegacy(context, settings, owner, kind, save = true) {
    const legacy = settings?.[LEGACY_FIELDS[kind]];
    if (!legacy || !Object.hasOwn(legacy, owner)) return false;
    delete legacy[owner];
    if (!Object.keys(legacy).length) delete settings[LEGACY_FIELDS[kind]];
    if (save) context.saveSettingsDebounced?.();
    return true;
}

function queueCardWrite(owner, operation) {
    const previous = writes.get(owner) || Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    writes.set(owner, result);
    void result.finally(() => { if (writes.get(owner) === result) writes.delete(owner); }).catch(() => undefined);
    return result;
}

export async function writeCharacterArchive(context, settings, owner, kind, records, {migration = false} = {}) {
    const field = ARCHIVE_FIELDS[kind];
    if (!field || !Array.isArray(records)) throw Error('Invalid character archive');
    return queueCardWrite(owner, async () => {
        let card = cardFor(context, owner);
        if (!card) throw Error('การ์ดตัวละครนี้ไม่พร้อมใช้งาน กรุณาเปิดการ์ดอีกครั้ง');
        if (migration && cardArchive(card, kind)) {
            clearLegacy(context, settings, owner, kind, false);
            return cardArchive(card, kind);
        }
        const response = await (context.fetch || fetch)('/api/characters/merge-attributes', {
            method: 'POST', headers: context.getRequestHeaders(),
            body: JSON.stringify({avatar:card.avatar,data:{extensions:{[field]:records}}}),
        });
        if (!response.ok) {
            const error = Error(`บันทึกคลัง ${kind === 'npcs' ? 'NPC' : 'Lore'} ไม่สำเร็จ (HTTP ${response.status})`);
            error.status = response.status;
            throw error;
        }
        // Update memory only after the server accepts the card write. A later
        // character edit must also see the new value in its JSON editor field.
        card = cardFor(context, owner);
        if (card) {
            card.data ||= {};
            card.data.extensions ||= {};
            card.data.extensions[field] = records;
            if (typeof card.json_data === 'string') {
                try {
                    const json = JSON.parse(card.json_data);
                    json.data ||= {};
                    json.data.extensions ||= {};
                    json.data.extensions[field] = records;
                    card.json_data = JSON.stringify(json);
                    if (context.characters?.[context.characterId]?.avatar === card.avatar) {
                        const editor = globalThis.document?.getElementById?.('character_json_data');
                        if (editor) editor.value = card.json_data;
                    }
                } catch (error) { console.warn('[Tretaresia RPG] Could not refresh character JSON after saving the archive.', error); }
            }
        }
        clearLegacy(context, settings, owner, kind, !migration);
        return records;
    });
}

export async function migrateCharacterArchives(context, settings) {
    let cleaned = false;
    archiveKinds: for (const kind of Object.keys(ARCHIVE_FIELDS)) {
        const legacy = settings?.[LEGACY_FIELDS[kind]];
        if (!legacy || typeof legacy !== 'object') continue;
        for (const [owner, records] of Object.entries(legacy)) {
            if (!cardFor(context, owner)) continue; // Preserve data for cards not loaded here.
            try {
                if (cardArchive(cardFor(context, owner), kind) || Array.isArray(records) && !records.length) {
                    cleaned = clearLegacy(context, settings, owner, kind, false) || cleaned;
                } else if (Array.isArray(records)) {
                    await writeCharacterArchive(context, settings, owner, kind, records, {migration:true});
                    cleaned = true;
                }
            } catch (error) {
                console.warn(`[Tretaresia RPG] ${kind} archive migration for ${owner} was deferred; original settings remain intact.`, error);
                // An unavailable server/session affects every card. Avoid a
                // burst of doomed writes; retry when the chat changes.
                if (!error.status || error.status === 401 || error.status === 403 || error.status >= 500) break archiveKinds;
            }
        }
    }
    if (cleaned) context.saveSettingsDebounced?.();
}
