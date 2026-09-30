import test from 'node:test';
import assert from 'node:assert/strict';
import {renderStoryMemoryPanel, renderStoryAgendaPanel, renderQuestObjectives} from '../src/story-workspace.js';

test('memory workspace preserves saved prose safely in display, fields and source links', () => {
    const panel = {innerHTML: ''};
    renderStoryMemoryPanel(panel, {storyMemories: [{id: 'promise" onclick="bad()', title: '<img src=x onerror=bad()>', detail: 'Ashe said: "Meet me."\nKeep this line.', kind: 'Promise', status: 'Active', people: ['Ashe & Den'], pinned: true, evidence: '</textarea><script>bad()</script>', sourceMessageId: 0, sourceDay: 63}]}, 'th');
    assert.match(panel.innerHTML, /ความจำเรื่องสำคัญ/);
    assert.match(panel.innerHTML, /Keep this line\./);
    assert.match(panel.innerHTML, /Ashe &amp; Den/);
    assert.match(panel.innerHTML, /&lt;img src=x onerror=bad\(\)&gt;/);
    assert.match(panel.innerHTML, /data-id="promise&quot; onclick=&quot;bad\(\)"/);
    assert.match(panel.innerHTML, /&lt;\/textarea&gt;&lt;script&gt;bad\(\)&lt;\/script&gt;/);
    assert.doesNotMatch(panel.innerHTML, /<script>|<img | onclick="bad/);
    assert.match(panel.innerHTML, /ข้อความ #1/);
    assert.match(panel.innerHTML, /data-action="story-source-message" data-message-id="0"/);
});

test('memory cards prioritize pins and retain closed records in a reversible archive', () => {
    const panel = {innerHTML: ''};
    renderStoryMemoryPanel(panel, {storyMemories: [{id: 'normal', title: 'Normal memory'}, {id: 'pinned', title: 'Pinned memory', pinned: true}, {id: 'closed', title: 'Resolved memory', status: 'Resolved', resolution: 'Delivered the letter.'}]});
    assert.ok(panel.innerHTML.indexOf('data-story-memory-id="pinned"') < panel.innerHTML.indexOf('data-story-memory-id="normal"'));
    assert.match(panel.innerHTML, /<details[^>]*><summary>Resolved and archived \(1\)<\/summary>/);
    assert.match(panel.innerHTML, /data-action="story-memory-status" data-id="closed" data-status="Active"/);
    assert.doesNotMatch(panel.innerHTML, /data-action="story-memory-delete"/);
    assert.match(panel.innerHTML, /Delivered the letter\./);
});

test('agenda workspace shows all scheduled plans, narrative timing and reversible closed events', () => {
    const panel = {innerHTML: ''};
    const storyAgenda = Array.from({length: 16}, (_, index) => ({id: `plan-${index}`, title: `Plan ${index}`, dueDay: 80 + index, status: 'Scheduled'}));
    storyAgenda.push({id: 'late', title: 'Late delivery', dueDay: 62, kind: 'Deadline', questId: 'escort', location: '<script>gate</script>'});
    storyAgenda.push({id: 'vague', title: 'After festival', whenText: 'หลังงานเทศกาล'});
    storyAgenda.push({id: 'closed', title: 'Old meeting', status: 'Cancelled'});
    renderStoryAgendaPanel(panel, {storyAgenda, worldClock: {day: 63, time: '10:00'}, quests: [{id: 'escort', name: 'Merchant escort'}]}, 'th');
    assert.equal((panel.innerHTML.match(/data-story-agenda-id=/g) || []).length, 19);
    assert.ok(panel.innerHTML.indexOf('data-story-agenda-id="late"') < panel.innerHTML.indexOf('data-story-agenda-id="plan-0"'));
    assert.match(panel.innerHTML, /data-reminder="Overdue"/);
    assert.match(panel.innerHTML, /data-reminder="Unscheduled"/);
    assert.match(panel.innerHTML, /หลังงานเทศกาล/);
    assert.match(panel.innerHTML, /เควสต์: Merchant escort/);
    assert.doesNotMatch(panel.innerHTML, /<script>/);
    assert.match(panel.innerHTML, /data-action="story-agenda-status" data-id="closed" data-status="Scheduled"/);
    assert.match(panel.innerHTML, /การเลยกำหนดไม่ทำให้เควสต์ล้มเหลว/);
});

test('quest steps distinguish required and optional goals without completing or paying the quest', () => {
    const quest = {id: 'escort', status: 'Active', objectives: [{id: 'a', title: 'Reach village', status: 'Completed'}, {id: 'b', title: 'Deliver letter', status: 'Skipped'}, {id: 'c', title: 'Talk to Ashe', optional: true, status: 'Completed'}]};
    const markup = renderQuestObjectives(quest, 'th');
    assert.match(markup, /aria-valuenow="50"/);
    assert.match(markup, /1 \/ 2 เป้าหมายจำเป็นสำเร็จ/);
    assert.match(markup, /1 \/ 1 เป้าหมายเสริมสำเร็จ/);
    assert.match(markup, /ข้ามไว้/);
    assert.doesNotMatch(markup, /data-action="quest-complete"/);
    assert.match(markup, /data-form="quest-objective"/);
    quest.objectives[1].status = 'Completed';
    const ready = renderQuestObjectives(quest);
    assert.match(ready, /data-action="quest-complete" data-id="escort"/);
    assert.match(ready, /This button does not grant a reward/);
    assert.equal(quest.status, 'Active');
});

test('closed quests keep readable objectives and empty workspaces explain how to start', () => {
    const markup = renderQuestObjectives({id: 'closed', status: 'Completed', objectives: [{id: 'a', title: 'Rescue <Den>', status: 'Completed', evidence: 'He returned safely.'}]});
    assert.match(markup, /Rescue &lt;Den&gt;/);
    assert.match(markup, /He returned safely\./);
    assert.doesNotMatch(markup, /data-form="quest-objective"|data-action="quest-objective-status"|data-action="quest-complete"/);
    const memory = {innerHTML: ''}, agenda = {innerHTML: ''};
    renderStoryMemoryPanel(memory, {}); renderStoryAgendaPanel(agenda, {});
    assert.match(memory.innerHTML, /No active memories yet/);
    assert.match(agenda.innerHTML, /No upcoming plans yet/);
    assert.match(renderQuestObjectives({id: 'empty', status: 'Active'}), /No steps recorded yet/);
});
