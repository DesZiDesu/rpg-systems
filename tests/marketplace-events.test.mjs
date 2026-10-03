import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarketplaceEvent, confirmedMarketplaceEvent } from '../src/marketplace-events.js';

const inventory = [{ id: 'blade', name: 'Moonblade', quantity: 2, category: 'Equipment', description: 'Silver edge' }];

test('confirms a direct NPC purchase offer only when the item is owned and evidence is in the reply', () => {
    const raw = { kind: 'npcPurchase', location: 'Old Market', evidence: 'Mira steps closer at the Old Market and offers to buy the Moonblade from you.', buyer: { id: 'mira', name: 'Mira', role: 'Collector' }, item: { id: 'blade', name: 'Moonblade', quantity: 1, description: 'Silver edge' }, askPrice: 20, floorPrice: 14, denomination: 'gold', negotiable: true };
    const event = confirmedMarketplaceEvent(raw, raw.evidence, 'I listen.', 'Old Market', inventory);
    assert.equal(event.kind, 'npcPurchase');
    assert.equal(event.item.name, 'Moonblade');
    assert.equal(event.floorPrice, 14);
    assert.equal(event.status, 'pending');
});

test('rejects planned, missing-item, and wrong-location NPC purchase events', () => {
    const raw = { kind: 'npcPurchase', location: 'Old Market', evidence: 'Mira plans to buy the Moonblade from you tomorrow.', buyer: { name: 'Mira' }, item: { id: 'blade', name: 'Moonblade', quantity: 1 }, askPrice: 20, floorPrice: 14, denomination: 'gold' };
    assert.equal(confirmedMarketplaceEvent(raw, raw.evidence, '', 'Old Market', inventory), null);
    assert.equal(confirmedMarketplaceEvent({ ...raw, evidence: 'Mira offers to buy the Sunstone from you at the Old Market.' }, 'Mira offers to buy the Sunstone from you at the Old Market.', '', 'Old Market', inventory), null);
    assert.equal(confirmedMarketplaceEvent({ ...raw, evidence: 'Mira offers to buy the Moonblade from you at the Old Market.' }, 'Mira offers to buy the Moonblade from you at the Old Market.', '', 'Other Market', inventory), null);
});

test('normalizes a paginated NPC shop catalog and caps visible entries', () => {
    const raw = { kind: 'npcShop', location: 'Old Market', evidence: 'You enter Mira shop at the Old Market and inspect the goods for sale.', seller: { id: 'mira', name: 'Mira', role: 'Merchant' }, denomination: 'gold', pageSize: 6, items: Array.from({ length: 45 }, (_, index) => ({ itemId: `item-${index}`, itemName: `Potion ${index}`, category: 'Consumable', description: 'Restores vitality', properties: ['Usable'], price: index + 1, stock: 3, negotiable: index % 2 === 0 })) };
    const event = normalizeMarketplaceEvent(raw);
    assert.equal(event.kind, 'npcShop');
    assert.equal(event.items.length, 40);
    assert.equal(event.pageSize, 6);
    assert.equal(event.items[0].negotiable, true);
    assert.equal(event.items[1].negotiable, false);
    assert.equal(event.status, 'pending');
    assert.ok(confirmedMarketplaceEvent(raw, raw.evidence, '', 'Old Market', inventory));
});
