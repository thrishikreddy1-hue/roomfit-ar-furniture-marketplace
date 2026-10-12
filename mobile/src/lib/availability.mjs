// @ts-check

/** @param {{ availability?: string, stock?: number, isSample?: boolean }} product */
export function availabilityLabel(product) {
  if (product.isSample) return 'Sample preview';
  if (product.availability === 'sold') return 'Sold';
  if (product.availability === 'reserved') return 'Reserved';
  return (product.stock || 0) > 0 ? 'Available' : 'Ask about availability';
}
