import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteDimensions, dimensionsLabel } from '../src/lib/dimensions.mjs';
import { checkFit } from '../src/lib/fit.js';

test('unknown and partial measurements stay honest, complete measurements keep their labels', () => {
  for (const dimensions of [undefined, null, {}, { width: null, depth: null, height: null }]) {
    assert.equal(dimensionsLabel(dimensions), 'Dimensions not provided');
    assert.equal(hasCompleteDimensions(dimensions), false);
    assert.equal(checkFit(dimensions, { width: 200, depth: 200 }), null);
  }
  assert.equal(dimensionsLabel({ width: 100 }), '100 W × — D × — H cm');
  assert.equal(checkFit({ width: 100 }, { width: 200, depth: 200 }), null);
  const complete = { width: 100, depth: 60, height: 80 };
  assert.equal(hasCompleteDimensions(complete), true);
  assert.equal(dimensionsLabel(complete), '100 W × 60 D × 80 H cm');
  assert.equal(checkFit(complete, { width: 120, depth: 80 }, 0).fits, true);
});
