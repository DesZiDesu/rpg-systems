import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceIconMarkup} from '../src/commerce-icons.js';
import {defaultCurrencyScheme,MONEY_ICON_SETS,MONEY_ICON_SHAPES} from '../src/currency-config.js';
import {pixelFrames} from '../src/currency-icons.js';

test('All money sets have distinct pixel artwork and four changing complete frames',()=>{
 const drawings=MONEY_ICON_SETS.map(set=>{
  const frames=pixelFrames(set);
  assert.equal(new Set(frames.map(f=>JSON.stringify(f))).size,4,set);
  for(const frame of frames){assert.equal(frame.length,32);assert.ok(frame.every(row=>row.length===32));}
  return JSON.stringify(frames);
 });
 assert.equal(new Set(drawings).size,8);
});
test('Every set, unit and shape produces integer pixel SVG without smooth shapes or filters',()=>{
 for(const set of MONEY_ICON_SETS)for(const unit of defaultCurrencyScheme().units)for(const shape of MONEY_ICON_SHAPES){
  const svg=commerceIconMarkup('coin',unit.id,set,{...unit,iconSet:set,icon:shape});
  assert.match(svg,/class="rf-commerce-icon rf-pixel-money-icon"/);
  assert.match(svg,/data-motion="on"/);
  assert.equal((svg.match(/class="px-frame"/g)||[]).length,4);
  assert.doesNotMatch(svg,/<(?:path|circle|ellipse|filter|image)\b/u);
  assert.ok([...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/gu)].every(m=>m.slice(1).every(v=>Number.isInteger(Number(v)))));
 }
});
test('Legacy wallets follow the global icon choice while configured wallets retain each unit selection',()=>{
 const old={gold:1,silver:2,copper:3};
 assert.match(commerceIconMarkup('coin','gold','minted',old),/data-coin-style="minted"/);
 const scheme=defaultCurrencyScheme();scheme.units[0].iconSet='gem';scheme.units[1].iconSet='pixel';
 const wallet={...old,scheme};
 assert.match(commerceIconMarkup('coin','gold','minted',wallet),/data-coin-style="gem"/);
 assert.match(commerceIconMarkup('coin','silver','stack',wallet),/data-coin-style="pixel"/);
});
test('Animation off applies to wallet, session and direct unit configuration',()=>{
 const scheme=defaultCurrencyScheme();scheme.animated=false;
 for(const config of [{scheme},{currencyScheme:scheme},scheme,{...scheme.units[0],animated:false}])assert.match(commerceIconMarkup('coin','gold','stack',config),/data-motion="off"/);
});
test('Per-unit color is used by the pixel palette and forged SVG attributes cannot enter the document',()=>{
 const unit={...defaultCurrencyScheme().units[0],color:'#123456',iconSet:'gem'};
 assert.match(commerceIconMarkup('coin','gold','stack',unit),/--px-base:#123456/);
 const invalid={...unit,color:'"><script>alert(1)</script>',icon:'"><script>',iconSet:'"><script>'};
 const svg=commerceIconMarkup('coin','gold','stack',invalid);
 assert.doesNotMatch(svg,/<script|alert\(/);
 assert.match(svg,/data-coin-style="stack"/);
 assert.match(svg,/data-icon-shape="default"/);
});
test('Pixel art explicitly disables strokes inherited from the Incantation shell',()=>{
 assert.match(commerceIconMarkup('coin','gold','stack'),/style="stroke:none;stroke-width:0;/);
 assert.match(commerceIconMarkup('train'),/viewBox="0 0 24 24"/);
 assert.doesNotMatch(commerceIconMarkup('check'),/px-frame/);
});
