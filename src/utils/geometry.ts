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

/**
 * Calculate the effective top-of-rafter Y position based on wallHeight and purlin mounting mode.
 *
 * wallHeight is defined as the distance from column base to the plane of the upper purlin flanges.
 *
 * In 'on-top' mode: purlins sit above the rafter with a 10mm gap,
 *   so rafter top = wallHeight - 10mm - purlinHeight.
 *
 * In 'flush' mode: the upper purlin flange is flush with the rafter top,
 *   so rafter top = wallHeight.
 */
export function getEffectiveRafterTop(
  wallHeight: number,
  purlinMounting: 'on-top' | 'flush',
  purlinHeightM: number,
): number {
  if (purlinMounting === 'on-top') {
    return wallHeight - 0.01 - purlinHeightM;
  }
  return wallHeight;
}
