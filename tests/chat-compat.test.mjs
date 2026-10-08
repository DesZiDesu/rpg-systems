import test from 'node:test';
import assert from 'node:assert/strict';
import {annotateStoryHtml,chatPresentationMode,installChatFormattingHooks} from '../src/chat-compat.js';

test('shared presentation is the default, with explicit native and original modes',()=>{
    assert.equal(chatPresentationMode({}),'shared');
    assert.equal(chatPresentationMode({preserveNativeChat:true}),'native');
    for(const mode of ['shared','native','roleforge'])assert.equal(chatPresentationMode({chatRegexMode:mode,preserveNativeChat:true}),mode);
    assert.equal(chatPresentationMode({chatRegexMode:'invalid'}),'shared');
});
test('after-Markdown protocol boundaries retain host HTML, widgets and names',()=>{
    const widget='<section class="card"><button data-action="buy">Buy</button><input value="2"><table><tr><td>5</td></tr></table></section>';
    const source=`<p><tr-header name="Cora"/><tr-narrative>She <strong>smiles</strong>.</tr-narrative><tr-dialogue name="Cora">Welcome.${widget}</tr-dialogue></p>`;
    const output=annotateStoryHtml(source);
    assert(output.includes(widget));assert(output.includes('She <strong>smiles</strong>.'));
    assert.equal((output.match(/data-roleforge-story=/g)||[]).length,3);
    assert(!/<\/?tr-/.test(output));assert(output.includes('data-roleforge-name="Cora"'));
});
test('literal tags inside code, comments, scripts, styles and attributes are not presentation boundaries',()=>{
    for(const example of [
        '<pre><code>&lt;tr-dialogue&gt;Example&lt;/tr-dialogue&gt;</code></pre>',
        '<code><tr-dialogue>Example</tr-dialogue></code>',
        '<!--<tr-header name="Example"/>-->',
        '<style>.card:after{content:"<tr-dialogue>"}</style>',
        '<custom-style>.card:after{content:"<tr-dialogue>"}</custom-style>',
        '<script>const example="<tr-dialogue>"</script>',
        '<div data-example="&lt;tr-dialogue&gt;">Widget</div>',
        "<div data-example='<tr-dialogue>'>Widget</div>",
    ])assert.equal(annotateStoryHtml(example),example);
});
test('empty headers, malformed closers and streaming blocks produce bounded neutral markup',()=>{
    assert.equal(annotateStoryHtml('<tr-header name="Cora"/>'),'<span data-roleforge-story="header" data-roleforge-name="Cora"></span>');
    const output=annotateStoryHtml('<tr-narrative>Starts<tr-dialogue name="Cora">Streaming');
    assert.equal((output.match(/<span /g)||[]).length,(output.match(/<\/span>/g)||[]).length);
    assert.equal(annotateStoryHtml('<header>Normal HTML header</header>'),'<header>Normal HTML header</header>');
    const oversized='<tr-dialogue>'+'.'.repeat(1000000);assert.equal(annotateStoryHtml(oversized),oversized);
});
test('names remain inert attributes and cannot add executable markup',()=>{
    const output=annotateStoryHtml('<tr-dialogue name="Cora" onclick="alert(1)">Safe</tr-dialogue>');
    assert(!output.includes('onclick'));assert.equal(output,'<span data-roleforge-story="dialogue" data-roleforge-name="Cora">Safe</span>');
});
test('real addHook-only API registers once, passes native user/reasoning unchanged, and releases its workspace',()=>{
    const hooks=[],formatter={stage:{BEFORE_REGEX:'beforeRegex',AFTER_MARKDOWN:'afterMarkdown'},addHook(fn,options){hooks.push({fn,...options});}};
    const settings={chatPresentation:true},api={context:()=>({messageFormatter:formatter}),settings:()=>settings,visible:source=>source.replace('PRIVATE','')};
    const release=installChatFormattingHooks(api);assert.equal(hooks.length,3);
    const input='<tr-dialogue name="Cora">Text</tr-dialogue>';
    assert.equal(hooks[0].fn('PRIVATEText',{}),'PRIVATEText','Regex sees source before reasoning cleanup');
    assert.equal(hooks[1].fn('PRIVATEText',{}),'Text','unhandled reasoning is cleaned after Regex');
    assert(hooks[2].fn(input,{}).includes('data-roleforge-story="dialogue"'));
    for(const meta of [{isUser:true},{isSystem:true},{isReasoning:true}])for(const hook of hooks)assert.equal(hook.fn(input,meta),input);
    settings.chatRegexMode='native';assert.equal(hooks[2].fn(input,{}),input);
    settings.chatRegexMode='shared';release();for(const hook of hooks)assert.equal(hook.fn(input,{}),input);
    const releaseAgain=installChatFormattingHooks(api);assert.equal(hooks.length,3);assert(hooks[2].fn(input,{}).includes('data-roleforge-story'));
    releaseAgain();assert.equal(hooks[0].fn('PRIVATEText',{}),'PRIVATEText');
});
