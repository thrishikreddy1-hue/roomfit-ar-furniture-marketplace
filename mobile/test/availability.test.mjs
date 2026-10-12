import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availabilityLabel } from '../src/lib/availability.mjs';

test('explicit sold/reserved status overrides positive stock', () => {
  assert.equal(availabilityLabel({ availability: 'sold', stock: 5 }), 'Sold');
  assert.equal(availabilityLabel({ availability: 'reserved', stock: 5 }), 'Reserved');
});

test('legacy listings and zero-stock listings use an honest fallback', () => {
  assert.equal(availabilityLabel({ stock: 1 }), 'Available');
  assert.equal(availabilityLabel({ availability: 'available', stock: 0 }), 'Ask about availability');
  assert.equal(availabilityLabel({}), 'Ask about availability');
});
