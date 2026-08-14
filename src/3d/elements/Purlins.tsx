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
  hallLength: number;
}

/**
 * Renders Z-profile purlins running along building length (X direction)
 * on each roof slope. Spaced at purlinSpacing along the slope.
 * ExtrudeGeometry goes along local Z; rotation around Y aligns it with global X.
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

      if (horizontalDist < halfSpan) {
        // Left slope (Z=0 towards center)
        positions.push({
          y: wallHeight + verticalDist,
          z: horizontalDist,
          side: 'left',
        });
        // Right slope (Z=span towards center)
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
        <mesh
          key={i}
          geometry={geometry}
          material={purlinMaterial}
          position={[0, pos.y, pos.z]}
          rotation={[
            pos.side === 'left' ? roofAngleRad : -roofAngleRad,
            -Math.PI / 2,
            0,
          ]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
});
