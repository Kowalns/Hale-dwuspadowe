import React, { useMemo } from 'react';
import { useZProfileGeometry } from '../profiles/ZProfileGeometry';
import { purlinMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface PurlinsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  roofAngle: number;
  purlinSpacing: number;
  columnSpacing: number;
  numberOfFrames: number;
  hallLength: number;
}

/**
 * Renders Z-profile purlins running along building length (X direction)
 * on each roof slope. Spaced at purlinSpacing along the slope.
 *
 * The geometry is extruded along +Z (length = hallLength).
 * To make purlins run along +X, we rotate PI/2 around Y.
 * The cross-section is tilted by rotating around the beam axis (X) using a parent group.
 *
 * Purlin positions: evenly spaced along the slope from eave toward ridge.
 * Each purlin sits at a fixed Y,Z position on the roof surface and runs
 * horizontally along the full building length.
 */
export const Purlins = React.memo(function Purlins({
  profile,
  wallHeight,
  span,
  roofAngle,
  purlinSpacing,
  hallLength,
}: PurlinsProps) {
  const h = profile.h / 1000;
  const b_f = (profile.b_f ?? profile.b ?? 50) / 1000;
  const t = (profile.t ?? 2) / 1000;

  const geometry = useZProfileGeometry({ h, b_f, t, length: hallLength });

  const roofAngleRad = (roofAngle * Math.PI) / 180;
  const halfSpan = span / 2;
  const slopeLength = halfSpan / Math.cos(roofAngleRad);

  // Calculate purlin positions along the slope
  const purlinPositions = useMemo(() => {
    const positions: Array<{ y: number; z: number; side: 'left' | 'right' }> = [];
    const numPurlins = Math.floor(slopeLength / purlinSpacing);

    for (let i = 1; i <= numPurlins; i++) {
      const distAlongSlope = i * purlinSpacing;
      const horizontalDist = distAlongSlope * Math.cos(roofAngleRad);
      const verticalDist = distAlongSlope * Math.sin(roofAngleRad);

      // Left slope (Z=0 towards center)
      if (horizontalDist < halfSpan) {
        positions.push({
          y: wallHeight + verticalDist,
          z: horizontalDist,
          side: 'left',
        });
      }

      // Right slope (Z=span towards center)
      if (horizontalDist < halfSpan) {
        positions.push({
          y: wallHeight + verticalDist,
          z: span - horizontalDist,
          side: 'right',
        });
      }
    }
    return positions;
  }, [slopeLength, purlinSpacing, roofAngleRad, halfSpan, wallHeight, span]);

  return (
    <group name="purlins">
      {purlinPositions.map((pos, i) => (
        <group key={i} position={[0, pos.y, pos.z]} rotation={[0, Math.PI / 2, 0]}>
          {/* After Y rotation: local Z -> world X, local X -> world -Z
              To tilt cross-section to match roof slope, rotate around local Z (beam axis = world X)
              For left slope: tilt cross-section clockwise (positive Z rotation viewed from +Z)
              For right slope: tilt counter-clockwise */}
          <mesh
            geometry={geometry}
            material={purlinMaterial}
            rotation={[0, 0, pos.side === 'left' ? -roofAngleRad : roofAngleRad]}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </group>
  );
});
