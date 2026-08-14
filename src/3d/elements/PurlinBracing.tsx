import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { bracingMaterial } from '../materials';

interface PurlinBracingProps {
  wallHeight: number;
  span: number;
  roofAngle: number;
  purlinSpacing: number;
  columnSpacing: number;
  numberOfFrames: number;
}

/**
 * Small rectangular profiles (40x20x2mm) connecting adjacent purlins at mid-span.
 * They run in the Z direction (across the slope) at the midpoint between frames.
 */
export const PurlinBracing = React.memo(function PurlinBracing({
  wallHeight,
  span,
  roofAngle,
  purlinSpacing,
  columnSpacing,
  numberOfFrames,
}: PurlinBracingProps) {
  // 40x20x2mm converted to meters
  const width = 0.04;
  const height = 0.02;
  const thickness = 0.002;

  const roofAngleRad = (roofAngle * Math.PI) / 180;
  const halfSpan = span / 2;
  const slopeLength = halfSpan / Math.cos(roofAngleRad);

  // Distance between purlins along the slope direction - this is the bracing length
  const bracingLength = purlinSpacing;
  const geometry = useRHSGeometry({ width, height, thickness, length: bracingLength });

  // Compute bracing positions
  const bracingPositions = useMemo(() => {
    const positions: Array<{ x: number; y: number; z: number; side: 'left' | 'right' }> = [];
    const numPurlins = Math.floor(slopeLength / purlinSpacing);

    // Place bracing at midpoint between frames (bays = frames - 1)
    for (let frame = 0; frame < numberOfFrames - 1; frame++) {
      const midX = (frame + 0.5) * columnSpacing;

      for (let p = 1; p < numPurlins; p++) {
        const distAlongSlope = (p + 0.5) * purlinSpacing; // midpoint between purlins
        const horizontalDist = distAlongSlope * Math.cos(roofAngleRad);
        const verticalDist = distAlongSlope * Math.sin(roofAngleRad);

        if (horizontalDist < halfSpan) {
          // Left slope
          positions.push({
            x: midX,
            y: wallHeight + verticalDist,
            z: horizontalDist,
            side: 'left',
          });
          // Right slope
          positions.push({
            x: midX,
            y: wallHeight + verticalDist,
            z: span - horizontalDist,
            side: 'right',
          });
        }
      }
    }
    return positions;
  }, [slopeLength, purlinSpacing, numberOfFrames, columnSpacing, roofAngleRad, halfSpan, wallHeight, span]);

  return (
    <group name="purlin-bracing">
      {bracingPositions.map((pos, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={bracingMaterial}
          position={[pos.x, pos.y, pos.z]}
          rotation={[
            pos.side === 'left' ? roofAngleRad : -roofAngleRad,
            0,
            Math.PI / 2,
          ]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
});
