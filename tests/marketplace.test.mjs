import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarketplace, marketplaceView, marketplaceAvailableQuantity, createMarketplaceListing, applyMarketplaceAction } from '../src/marketplace-core.js';

const state = () => ({ player: { name: 'Nova' }, progression: { currency: { name: 'Crowns', gold: 10, silver: 0, copper: 0 } }, inventory: [{ id: 'blade', name: 'Moonblade', category: 'Equipment', quantity: 2, description: 'Silver edge' }], marketplace: { listings: [], receipts: [] } });
const act = (s, id, action, amount) => applyMarketplaceAction(s, id, action, { amount, revision: s.marketplace.listings.find(entry => entry.id === id)?.revision, now: '2026-10-02T12:00:00Z' });

test('listing reserves inventory and normalization keeps public views free of buyer ceilings', () => {
    let s = state(); const created = createMarketplaceListing(s, { itemId: 'blade', quantity: 1, askPrice: 20, floorPrice: 12, denomination: 'gold', buyer: { id: 'collector' } }, '2026-10-02T10:00:00Z');
    assert.equal(created.ok, true); s = created.next; assert.equal(marketplaceAvailableQuantity(s, s.inventory[0]), 1);
    const listing = s.marketplace.listings[0]; const view = marketplaceView(s); assert.equal(view.active.length, 1); assert.doesNotMatch(JSON.stringify(view), /maxBudget/); assert.equal(normalizeMarketplace(s.marketplace).listings.length, 1);
    assert.equal(listing.status, 'Active');
});

test('buyer offer, seller counteroffer and buyer response settle exactly once', () => {
    let s = createMarketplaceListing(state(), { itemId: 'blade', quantity: 1, askPrice: 20, floorPrice: 12, denomination: 'gold', buyer: { id: 'collector' } }, '2026-10-02T10:00:00Z').next;
    const id = s.marketplace.listings[0].id; s = act(s, id, 'invite').next; let listing = s.marketplace.listings[0];
    assert.equal(listing.offers[0].status, 'Pending'); const offered = listing.offers[0].amount;
    s = act(s, id, 'counter', 16).next; listing = s.marketplace.listings[0]; assert.equal(listing.offers[0].status, 'Countered'); assert.equal(listing.offers[0].counterAmount, 16);
    s = act(s, id, 'respond').next; listing = s.marketplace.listings[0]; assert.equal(listing.status, 'Sold'); assert.equal(listing.offers[0].status, 'Accepted'); assert.equal(s.inventory[0].quantity, 1); assert.equal(s.progression.currency.gold, 26); assert.equal(s.marketplace.receipts.length, 1); assert.equal(act(s, id, 'accept').ok, false); assert.ok(offered < 16);
});

test('counteroffer above buyer ceiling creates a new buyer offer without exposing ceiling', () => {
    let s = createMarketplaceListing(state(), { itemId: 'blade', quantity: 1, askPrice: 20, floorPrice: 12, denomination: 'gold', buyer: { id: 'adventurer' } }, '2026-10-02T10:00:00Z').next;
    const id = s.marketplace.listings[0].id; s = act(s, id, 'invite').next; s = act(s, id, 'counter', 999).next; s = act(s, id, 'respond').next;
    const view = marketplaceView(s); assert.equal(view.listings[0].offers[0].status, 'Pending'); assert.doesNotMatch(JSON.stringify(view), /maxBudget/); assert.ok(view.listings[0].offers[0].amount < 999);
});

test('cancel releases reserved inventory and invalid prices have no effect', () => {
    const initial = state(); assert.equal(createMarketplaceListing(initial, { itemId: 'blade', quantity: 3, askPrice: 10, floorPrice: 4, denomination: 'gold' }).error, 'reserved');
    let s = createMarketplaceListing(initial, { itemId: 'blade', quantity: 1, askPrice: 10, floorPrice: 4, denomination: 'gold' }, '2026-10-02T10:00:00Z').next; const id = s.marketplace.listings[0].id; s = act(s, id, 'cancel').next; assert.equal(s.marketplace.listings[0].status, 'Cancelled'); assert.equal(marketplaceAvailableQuantity(s, s.inventory[0]), 2);
});
