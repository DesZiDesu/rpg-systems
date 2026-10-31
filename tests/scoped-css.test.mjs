import test from 'node:test';
import assert from 'node:assert/strict';
import {build,expand} from '../tools/build-scoped-css.mjs';

test('shipped Kinetic and Pokémon chat theme sheets match their sources',async()=>{assert.deepEqual(await build({check:true}),[]);});
test('scope tokens expand only as whole selector words',()=>{
 const out=expand('/* K = window. */\nK .a,K[data-x]{color:red}\n.Kicker{}\n@keyframes k-pop{}',{K:'#w'});
 assert.equal(out,'/* */\n#w .a,#w[data-x]{color:red}\n.Kicker{}\n@keyframes k-pop{}');
});
