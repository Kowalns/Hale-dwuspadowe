/**
 * Calculate column spacing based on hall length.
 * Base spacing: 5m, n = round(L / 5), actual spacing = L / n
 */
export function calculateColumnSpacing(length: number): { spacing: number; count: number } {
  const n = Math.round(length / 5);
  const spacing = length / n;
  return { spacing, count: n };
}

/**
 * Calculate purlin spacing along the roof slope.
 * Target: 2-2.5m spacing.
 */
export function calculatePurlinSpacing(roofSlopeLength: number): number {
  const targetSpacing = 2.25; // midpoint of 2-2.5m range
  const n = Math.round(roofSlopeLength / targetSpacing);
  if (n === 0) return roofSlopeLength;
  return roofSlopeLength / n;
}

/**
 * Calculate ridge height: wallHeight + (span/2) * tan(roofAngle)
 */
export function calculateRidgeHeight(wallHeight: number, span: number, roofAngleDeg: number): number {
  const roofAngleRad = (roofAngleDeg * Math.PI) / 180;
  return wallHeight + (span / 2) * Math.tan(roofAngleRad);
}

/**
 * Calculate the length of the roof slope: (span/2) / cos(roofAngle)
 */
export function calculateRoofSlopeLength(span: number, roofAngleDeg: number): number {
  const roofAngleRad = (roofAngleDeg * Math.PI) / 180;
  return (span / 2) / Math.cos(roofAngleRad);
}
