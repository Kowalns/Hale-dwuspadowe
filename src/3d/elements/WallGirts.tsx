import React from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { girtMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface WallGirtsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  hallLength: number;
}

/**
 * Renders two RHS wall girts running along the full building length (X direction)
 * at Y=wallHeight/2 on both sides (Z=0 and Z=span).
 *
 * The RHS geometry extrudes along Z axis. To make girts run along X,
 * we create geometry with length=hallLength and rotate [0, Math.PI/2, 0].
 */
export const WallGirts = React.memo(function WallGirts({
  profile,
  wallHeight,
  span,
  hallLength,
}: WallGirtsProps) {
  const width = profile.b / 1000;
  const height = profile.h / 1000;
  const thickness = (profile.t ?? 4) / 1000;

  const geometry = useRHSGeometry({ width, height, thickness, length: hallLength });

  const girtY = wallHeight / 2;

  return (
    <group name="wall-girts">
      {/* Wall girt on Z=0 side */}
      <mesh
        geometry={geometry}
        material={girtMaterial}
        position={[0, girtY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        receiveShadow
      />
      {/* Wall girt on Z=span side */}
      <mesh
        geometry={geometry}
        material={girtMaterial}
        position={[0, girtY, span]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
});
