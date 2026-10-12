// @ts-check
/** @type {Array<'width' | 'depth' | 'height'>} */
const AXES = ['width', 'depth', 'height'];
/** @param {number | null | undefined} value */
const known = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
/** @param {{width?: number | null, depth?: number | null, height?: number | null} | null | undefined} dimensions */
export function hasCompleteDimensions(dimensions) {
  return AXES.every((key) => known(dimensions?.[key]));
}

/** @param {{width?: number | null, depth?: number | null, height?: number | null} | null | undefined} dimensions */
export function dimensionsLabel(dimensions) {
  const labels = { width: 'W', depth: 'D', height: 'H' };
  if (!AXES.some((key) => known(dimensions?.[key]))) return 'Dimensions not provided';
  return AXES.map((key) => `${known(dimensions?.[key]) ? dimensions?.[key] : '—'} ${labels[key]}`).join(' × ') + ' cm';
}
