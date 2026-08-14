import React, { useMemo } from 'react';
import { useIBeamGeometry } from '../profiles/IBeamGeometry';
import { rafterMaterial } from '../materials';
import { calculateRoofSlopeLength } from '../../utils/geometry';
import type { SteelProfile } from '../../types';

interface RafterProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  roofAngle: number;
  columnSpacing: number;
  numberOfFrames: number;
}

/**
 * Renders IPE rafters for span <= 18m.
 * Each frame has a pair of rafters going from wall top to ridge.
 * Left rafter: from (X, wallHeight, 0) to (X, ridgeHeight, span/2)
 * Right rafter: mirror
 */
export const Rafter = React.memo(function Rafter({
  profile,
  wallHeight,
  span,
  roofAngle,
  columnSpacing,
  numberOfFrames,
}: RafterProps) {
  const h = profile.h / 1000;
  const b = profile.b / 1000;
  const tw = (profile.tw ?? 7) / 1000;
  const tf = (profile.tf ?? 11) / 1000;

  const slopeLength = calculateRoofSlopeLength(span, roofAngle);
  const geometry = useIBeamGeometry({ h, b, tw, tf, length: slopeLength });

  const roofAngleRad = (roofAngle * Math.PI) / 180;

  const framePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < numberOfFrames; i++) {
      positions.push(i * columnSpacing);
    }
    return positions;
  }, [numberOfFrames, columnSpacing]);

  return (
    <group name="rafters">
      {framePositions.map((x, i) => (
        <group key={i} position={[x, wallHeight, 0]}>
          {/* Left rafter (Z=0 to Z=span/2) */}
          <mesh
            geometry={geometry}
            material={rafterMaterial}
            position={[0, 0, 0]}
            rotation={[-roofAngleRad, 0, 0]}
            castShadow
            receiveShadow
          />
          {/* Right rafter (Z=span to Z=span/2) - mirror */}
          <mesh
            geometry={geometry}
            material={rafterMaterial}
            position={[0, 0, span]}
            rotation={[roofAngleRad, Math.PI, 0]}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </group>
  );
});
