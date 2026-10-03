import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const page=await readFile(new URL('../docs/previews/main-chat-systems.html',import.meta.url),'utf8');
const script=await readFile(new URL('../docs/previews/main-chat-gallery.js',import.meta.url),'utf8');
test('gallery runs production loader and composer anchor and clearly labels simulated responses',()=>{assert.match(page,/id="send_form"/);assert.match(page,/คำตอบ NPC จำลอง/);assert.match(page,/ไม่มีการเรียก API/);assert.match(script,/startHStatsPreview/);assert.match(script,/generateQuietPrompt/);assert.doesNotMatch(script,/applyAuctionAction|applyMarketplaceAction|renderAuctionCard|renderMarketplaceChatCard/);});
test('gallery covers every optional Main Chat system and native summary status',()=>{for(const section of ['buy','sell','auction','missions','groups','records','resources','summary'])assert.match(script,new RegExp(`'${section}'`));assert.match(script,/createMemoryComposerStatus/);});
