import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const preview = await readFile(new URL('../docs/previews/marketplace.html', import.meta.url), 'utf8');

test('commerce preview keeps marketplace and auction attached to Main Chat messages', () => {
    for (const mount of ['market-card', 'auction-card', 'auction-ledger']) {
        assert.match(preview, new RegExp(`id=["']${mount}["']`), `preview has ${mount} mount`);
    }
    assert.match(preview, /renderMarketplaceChatCard/);
    assert.match(preview, /renderAuctionCard/);
    assert.match(preview, /applyMarketplaceAction/);
    assert.match(preview, /applyAuctionAction/);
    assert.match(preview, /auctionView\(auctionState,auctionOffer/);
});

test('commerce preview demonstrates real actions and responsive mode controls', () => {
    // A no-op auction callback would make the visual demo misleading: each card
    // must use the same core state and re-render after the action resolves.
    assert.doesNotMatch(preview, /runAuctionAction:async\(\)=>\(\{ok:true\}\)/);
    assert.match(preview, /if\(result\.ok\)auctionState=result\.next/);
    assert.match(preview, /if\(result\.ok\)state=result\.next/);
    assert.match(preview, /data-mode="desktop"/);
    assert.match(preview, /data-mode="mobile"/);
    assert.match(preview, /classList\.toggle\('is-mobile'/);
});

