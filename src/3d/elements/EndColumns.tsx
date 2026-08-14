import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { columnMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface EndColumnsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  length: number;
  ridgeHeight: number;
}

/**
 * Renders RHS/SHS end columns on both gable ends (X=0 and X=length).
 * Intermediate columns are placed between the corners.
 * Their height varies linearly from wallHeight at edges to ridgeHeight at center.
 */
export const EndColumns = React.memo(function EndColumns({
  profile,
  wallHeight,
  span,
  length: hallLength,
  ridgeHeight,
}: EndColumnsProps) {
  // Convert mm to meters
  const width = profile.b / 1000;
  const height = profile.h / 1000;
  const thickness = (profile.t ?? 4) / 1000;

  // Calculate intermediate column positions along Z axis
  // Typically every ~3m or so on the gable end
  const intermediatePositions = useMemo(() => {
    const targetSpacing = 3.0; // target spacing for end columns
    const n = Math.max(1, Math.round(span / targetSpacing) - 1); // number of intermediate columns
    const positions: Array<{ z: number; colHeight: number }> = [];

    for (let i = 1; i <= n; i++) {
      const z = (i / (n + 1)) * span;
      // Height follows roof slope: increases linearly from wallHeight to ridgeHeight at center
      const distFromEdge = Math.min(z, span - z);
      const colHeight = wallHeight + (ridgeHeight - wallHeight) * (distFromEdge / (span / 2));
      positions.push({ z, colHeight });
    }
    return positions;
  }, [span, wallHeight, ridgeHeight]);

  return (
    <group name="end-columns">
      {/* Gable end at X=0 */}
      {intermediatePositions.map((pos, i) => (
        <EndColumn
          key={`front-${i}`}
          x={0}
          z={pos.z}
          colHeight={pos.colHeight}
          width={width}
          height={height}
          thickness={thickness}
        />
      ))}
      {/* Gable end at X=length */}
      {intermediatePositions.map((pos, i) => (
        <EndColumn
          key={`back-${i}`}
          x={hallLength}
          z={pos.z}
          colHeight={pos.colHeight}
          width={width}
          height={height}
          thickness={thickness}
        />
      ))}
    </group>
  );
});

interface EndColumnProps {
  x: number;
  z: number;
  colHeight: number;
  width: number;
  height: number;
  thickness: number;
}

function EndColumn({ x, z, colHeight, width, height, thickness }: EndColumnProps) {
  const geometry = useRHSGeometry({ width, height, thickness, length: colHeight });
  return (
    <mesh
      geometry={geometry}
      material={columnMaterial}
      position={[x, 0, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    />
  );
}
