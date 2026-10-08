import test from 'node:test';
import assert from 'node:assert/strict';
import {hasForeignTrackerData,stripForeignTrackerData,mapChatProse,cleanChatProse} from '../src/foreign-chat.js';

test('MVU transport stays separate from RoleForge story evidence',()=>{
    const story='<gametxt><tr-dialogue name="Cora">Welcome.</tr-dialogue></gametxt>';
    const data='<StatusPlaceHolderImpl/>\n<UpdateVariable><UpdateAnalysis>Killed 20 goblins, HP +90.</UpdateAnalysis><JSONPatch>[{"op":"replace","path":"/HP","value":900}]</JSONPatch></UpdateVariable>';
    assert.equal(hasForeignTrackerData(story+data),true);
    assert.equal(stripForeignTrackerData(story+data),story);
    assert.equal(stripForeignTrackerData(story+'<UpdateVariable>streaming partial JSON'),story);
    assert.equal(hasForeignTrackerData('<tr-narrative>Normal story.</tr-narrative>'),false);
});
test('a trimming cleaner cannot remove the newline that makes a frontend fence render',()=>{
    const input='Story.\n\n```html\n<!DOCTYPE html><html><body>UI</body></html>\n```\n\nEnd.';
    assert.equal(cleanChatProse(input,text=>text.trim()),input);
    assert.equal(cleanChatProse(' \n',text=>text.trim()),' \n');
});
test('literal examples, frontend HTML, script and code belong to the host',()=>{
    for(const literal of ['```xml\n<UpdateVariable>Example</UpdateVariable>\n```','`<StatusPlaceHolderImpl/>`',
        '<pre><code><UpdateVariable>Example</UpdateVariable></code></pre>',
        '<script>const tag="<UpdateVariable>example</UpdateVariable>";</script>']) {
        assert.equal(stripForeignTrackerData(literal),literal);
        assert.equal(hasForeignTrackerData(literal),false);
    }
    assert.equal(mapChatProse('hidden <code>hidden</code> visible',text=>text.replaceAll('hidden','')), ' <code>hidden</code> visible');
});
