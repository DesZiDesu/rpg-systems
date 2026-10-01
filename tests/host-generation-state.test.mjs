import test from 'node:test';
import assert from 'node:assert/strict';
import {hostReplyGenerating,loadHostGenerationModule} from '../src/host-generation-state.js';

function fixture({stop = 'none',send = 'grid',generating,scripts = [],baseURI = 'https://example.test/st/'} = {}) {
    const body = {dataset:{},style:{display:'block'},isConnected:true,parentElement:null};
    if (generating !== undefined) body.dataset.generating = String(generating);
    const nodes = {
        mes_stop:{style:{display:stop},isConnected:true,parentElement:body},
        send_but:{style:{display:send},isConnected:true,parentElement:body},
        // A memory worker has its own Stop and must not block itself.
        memory_stop:{style:{display:'grid'},isConnected:true,parentElement:body},
    };
    const document = {body,baseURI,scripts,getElementById:id => nodes[id] || null,
        defaultView:{getComputedStyle:node => node.style}};
    return {document,nodes};
}

test('native idle composer wins over an orphan generation START and ignores the memory Stop',() => {
    const {document,nodes} = fixture();
    assert.equal(hostReplyGenerating({document,fallback:true}),false);
    nodes.send_but.style.display = 'none';
    assert.equal(hostReplyGenerating({document,fallback:true}),false,'a hidden native Stop still proves the story is idle while memory hides Send');
    nodes.mes_stop.style.display = 'grid';
    assert.equal(hostReplyGenerating({document,fallback:false}),true);
    nodes.mes_stop.parentElement.hidden = true;
    assert.equal(hostReplyGenerating({document,fallback:true}),false,'a Stop hidden by its ancestor is not a live story generation');
});

test('function and boolean host states are authoritative, including an explicit idle state',() => {
    const {document} = fixture({stop:'grid'});
    for (const isGenerating of [false,() => false]) {
        assert.equal(hostReplyGenerating({context:{isGenerating},document,fallback:true}),false);
    }
    for (const isGenerating of [true,() => true]) {
        assert.equal(hostReplyGenerating({context:{isGenerating},document,fallback:false}),true);
    }
    assert.equal(hostReplyGenerating({native:{isGenerating:false},context:{isGenerating:true},document,fallback:true}),false);
    assert.equal(hostReplyGenerating({native:{is_send_press:false,is_group_generating:false},context:{isGenerating:true},document,fallback:true}),false);
});

test('live native bindings follow individual and group generation without replacing their module',() => {
    const {document} = fixture();
    let send = false,group = false;
    const native = {get is_send_press() { return send; },get is_group_generating() { return group; }};
    const state = () => hostReplyGenerating({native,document,fallback:true});
    assert.equal(state(),false);
    send = true;assert.equal(state(),true);
    send = false;group = true;assert.equal(state(),true);
    group = false;assert.equal(state(),false);
    assert.equal(hostReplyGenerating({context:{is_group_generating:true},document}),true);
});

test('unavailable fork state falls back to native body and composer rather than throwing',() => {
    const throwing = {get isGenerating() { throw Error('Unavailable'); }};
    const {document,nodes} = fixture({generating:true});
    assert.equal(hostReplyGenerating({context:throwing,native:throwing,document,fallback:false}),true);
    document.body.dataset.generating = 'false';nodes.mes_stop.style.display = 'grid';
    assert.equal(hostReplyGenerating({document,fallback:true}),false);
    delete document.body.dataset.generating;delete nodes.mes_stop;
    assert.equal(hostReplyGenerating({document,fallback:true}),false,'visible native Send proves idle if the host has no Stop node');
    delete nodes.send_but;
    assert.equal(hostReplyGenerating({document,fallback:true}),true);
    assert.equal(hostReplyGenerating({document,fallback:false}),false);
    assert.equal(hostReplyGenerating({document:null,fallback:false}),false);
});

test('host module loader reuses only the already loaded same-origin script and preserves its cache query',async () => {
    const requested = [];
    const native = {is_send_press:false,is_group_generating:false};
    const {document} = fixture({scripts:[
        {src:'https://cdn.example.test/script.js?v=foreign'},
        {src:'https://example.test/st/scripts/other-script.js'},
        {src:'https://example.test/st/script.js?v=host-release-1&cache=abc'},
    ]});
    assert.equal(await loadHostGenerationModule(document,async url => { requested.push(url);return native; }),native);
    assert.deepEqual(requested,['https://example.test/st/script.js?v=host-release-1&cache=abc']);
});

test('host module loader resolves an existing relative installation path without guessing another endpoint',async () => {
    const requested = [];
    const {document} = fixture({baseURI:'https://example.test/nested/chat/',scripts:[{src:'../script.js?version=123'}]});
    assert.deepEqual(await loadHostGenerationModule(document,async url => { requested.push(url);return {is_send_press:false}; }),{is_send_press:false});
    assert.deepEqual(requested,['https://example.test/nested/script.js?version=123']);
});

test('missing, foreign or failed host imports return null and never probe a guessed script',async () => {
    let calls = 0;
    const importer = async () => { calls++;throw Error('Host import blocked'); };
    for (const scripts of [[],[{src:'https://foreign.test/script.js'}],[{src:'https://example.test/st/script.js/map'}],[{src:'https://example.test/st/scripts.js'}]]) {
        assert.equal(await loadHostGenerationModule(fixture({scripts}).document,importer),null);
    }
    assert.equal(await loadHostGenerationModule(null,importer),null);
    assert.equal(calls,0);
    assert.equal(await loadHostGenerationModule(fixture({scripts:[{src:'script.js?keep=this'}]}).document,importer),null);
    assert.equal(calls,1);
});
