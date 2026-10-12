// @ts-check

/** @param {{ availability?: string, stock?: number }} product */
export function availabilityLabel(product) {
  if (product.availability === 'sold') return 'Sold';
  if (product.availability === 'reserved') return 'Reserved';
  return (product.stock || 0) > 0 ? 'Available' : 'Ask about availability';
}
