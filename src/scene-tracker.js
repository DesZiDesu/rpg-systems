// Small, per-reply scene records; the host may complete omitted scene details.
const value = (source, limit = 180) => typeof source === 'string' ? source.trim().slice(0, limit) : '';
const known = source => source && !/^(?:unknown|none|n\/a|unspecified|not specified|not known|undefined|null|tbd|ไม่ทราบ|ไม่ระบุ|ไม่รู้|—|–|-|\?|…|\.{2,})$/i.test(source) ? source : '';
export const SCENE_REQUIRED_FIELDS = Object.freeze(['dayName','day','month','year','era','calendar','time','period','season',
    'location','region','continent','weather','temperature','lighting','participants','position','objective','safety','atmosphere','elapsed']);

export function missingSceneFields(snapshot) {
    return SCENE_REQUIRED_FIELDS.filter(key => key === 'temperature'
        ? snapshot?.temperature == null || !Number.isFinite(Number(snapshot.temperature))
        : key === 'day' ? !Number.isInteger(Number(snapshot?.day)) || Number(snapshot.day) < 1
            : key === 'participants' ? !Array.isArray(snapshot?.participants) || !snapshot.participants.some(name => known(value(name, 70)))
                : key === 'time' ? !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value(snapshot?.time, 20))
                    : !known(value(snapshot?.[key], 180)));
}

// Only allow bounded scene facts; explicit canonical operations take precedence.
export function sceneTrackerOperations(details, operations = []) {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
    const paths = {location:'location.place', continent:'location.continent', region:'location.region',
        detail:'location.detail', position:'scene.position', weather:'scene.weather', temperature:'scene.temperature',
        time:'worldClock.time', day:'worldClock.day', dayName:'worldClock.dayName', period:'worldClock.phase'};
    return Object.entries(paths).flatMap(([key,path]) => {
        if (operations.some(op => op[1] === path)) return [];
        let fact = details[key];
        if (key === 'temperature' || key === 'day') {
            if (fact === null || fact === undefined || typeof fact === 'boolean' || String(fact).trim() === '') return [];
            fact = Number(fact);
            if (!Number.isFinite(fact) || (key === 'day' && (!Number.isInteger(fact) || fact < 1))
                || (key === 'temperature' && (fact < -1000 || fact > 1000))) return [];
        } else {
            fact = known(value(fact, 180));
            if (!fact || (key === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(fact))) return [];
        }
        return [['set',path,fact]];
    });
}

export function sceneSnapshot(state, supplement = {}, speakers = []) {
    const clock = state?.worldClock || {}, location = state?.onboarding?.locationSeeded === false ? {} : state?.location || {}, scene = state?.scene || {};
    const extra = supplement && typeof supplement === 'object' && !Array.isArray(supplement) ? supplement : {};
    const read = (key, fallback, limit) => known(value(extra[key], limit)) || known(value(fallback, limit)) || '';
    const participants = Array.isArray(extra.participants) && extra.participants.length ? extra.participants : speakers;
    const names = [...new Set(participants.filter(name => typeof name === 'string').map(name => value(name, 70)).filter(known))].slice(0, 8);
    return {
        day: Number.isFinite(Number(clock.day)) ? Math.max(1, Math.floor(Number(clock.day))) : null,
        dayName: read('dayName', clock.dayName, 50), time: read('time', clock.time, 20),
        period: read('period', clock.phase, 50), location: read('location', location.place || location.detail, 180),
        region: read('region', [location.region,location.continent].filter(known).filter((part,index,all) => all.indexOf(part) === index).join(' · '), 120),
        continent: read('continent', location.continent, 100),
        weather: read('weather', scene.weather, 100),
        temperature: Number.isFinite(Number(scene.temperature)) && scene.temperature !== null ? Number(scene.temperature) : null,
        participants: names, position: read('position', scene.position, 120),
        objective: read('objective', '', 180), atmosphere: read('atmosphere', '', 180),
        lighting: read('lighting', '', 100), safety: read('safety', '', 120),
        season: read('season', '', 80), elapsed: read('elapsed', '', 60),
        month: read('month', '', 80), year: read('year', '', 80),
        era: read('era', '', 80), calendar: read('calendar', '', 80),
    };
}

function node(tag, className = '', content = '') {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = content;
    return element;
}

export function renderSceneTracker(snapshot, language = 'en') {
    const thai = language === 'th';
    const word = (en, th) => thai ? th : en;
    const card = node('section', 'trpg-scene-ledger');
    card.setAttribute('aria-label', word('Scene Tracker', 'ข้อมูลฉาก'));
    const side = node('div', 'trpg-scene-side');
    const number = snapshot.sequence ?? snapshot.day;
    side.append(node('span', '', '✦'), node('small', '', word('SCENE', 'ฉาก')),
        node('strong', '', number == null ? '—' : String(number).padStart(2, '0')));
    const body = node('div', 'trpg-scene-body');
    const top = node('div', 'trpg-scene-top');
    top.append(node('span', '', snapshot.missing?.length ? 'SCENE STATUS / PARTIAL' : 'SCENE STATUS / LIVE'),
        node('span', '', [snapshot.dayName,snapshot.day == null || snapshot.dayName === `Day ${snapshot.day}` ? '' : `${word('Day', 'วันที่')} ${snapshot.day}`].filter(Boolean).join(' · ') || '—'));
    const hero = node('div', 'trpg-scene-hero'), place = node('div');
    place.append(node('small', '', word('CURRENT LOCATION', 'ตำแหน่งในเนื้อเรื่อง')),
        node('strong', '', snapshot.location || '—'), node('span', '', snapshot.region || '—'));
    const hour = node('div', 'trpg-scene-hour');
    hour.append(node('strong', '', snapshot.time || '—'), node('small', '', snapshot.period || '—'));
    hero.append(place, hour);
    const weather = node('div', 'trpg-scene-weather');
    for (const [label, info] of [[word('WEATHER', 'อากาศ'), snapshot.weather || '—'],
        [word('TEMPERATURE', 'อุณหภูมิ'), snapshot.temperature == null ? '—' : `${snapshot.temperature}°C`]]) {
        const cell = node('div'); cell.append(node('small', '', label), node('strong', '', info)); weather.append(cell);
    }
    const people = node('div', 'trpg-scene-people');
    people.append(node('small', '', word('IN SCENE', 'ในฉาก')),
        node('strong', '', snapshot.participants?.join(', ') || '—'));
    const details = node('details', 'trpg-scene-details'), summary = node('summary', '', word('Scene details', 'ดูรายละเอียดทั้งหมด'));
    if (snapshot.elapsed) summary.append(node('span', '', ` · ${snapshot.elapsed}`));
    const fields = node('dl');
    for (const [label, info] of [
        [word('Position', 'ตำแหน่ง'), snapshot.position], [word('Season', 'ฤดูกาล'), snapshot.season],
        [word('Month', 'เดือน'), snapshot.month], [word('Year', 'ปี'), snapshot.year],
        [word('Era', 'ศักราช'), snapshot.era], [word('Calendar', 'ปฏิทิน'), snapshot.calendar],
        [word('Lighting', 'แสงสว่าง'), snapshot.lighting], [word('Safety', 'ความปลอดภัย'), snapshot.safety],
        [word('Objective', 'เป้าหมาย'), snapshot.objective], [word('Atmosphere', 'บรรยากาศ'), snapshot.atmosphere],
    ]) {
        if (!info) continue;
        const row = node('div'); row.append(node('dt', '', label), node('dd', '', info)); fields.append(row);
    }
    if (!fields.childElementCount) fields.append(node('div', '', word('No extra scene details yet', 'ยังไม่มีรายละเอียดฉากเพิ่มเติม')));
    details.append(summary, fields);body.append(top, hero, weather, people, details);card.append(side, body);
    return card;
}
