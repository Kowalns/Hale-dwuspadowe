import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { columnMaterial } from '../materials';
import type { SteelProfile, Opening } from '../../types';

interface EndColumnsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  length: number;
  ridgeHeight: number;
  openings?: Opening[];
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
  openings,
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

  /**
   * Check if a column at a given Z position on a given wall is overlapped by an opening.
   * Returns the Y offset (top of the opening) if overlapped, or 0 if not.
   */
  const getColumnStartY = (wallName: 'end_front' | 'end_back', zPos: number): number => {
    if (!openings) return 0;
    for (const opening of openings) {
      if (opening.wall !== wallName) continue;
      // For end_front: positionX is stored in rotated local coords,
      // un-mirrored to world Z as (span - positionX).
      // For end_back: positionX maps directly to world Z.
      let openingWorldZ: number;
      if (wallName === 'end_front') {
        openingWorldZ = span - opening.positionX;
      } else {
        openingWorldZ = opening.positionX;
      }
      const halfW = opening.width / 2;
      if (zPos >= openingWorldZ - halfW && zPos <= openingWorldZ + halfW) {
        // Column overlaps with this opening; start from top of opening
        return opening.positionY + opening.height / 2;
      }
    }
    return 0;
  };

  return (
    <group name="end-columns">
      {/* Gable end at X=0 */}
      {intermediatePositions.map((pos, i) => {
        const startY = getColumnStartY('end_front', pos.z);
        const adjustedHeight = pos.colHeight - startY;
        if (adjustedHeight <= 0) return null;
        return (
          <EndColumn
            key={`front-${i}`}
            x={0}
            z={pos.z}
            startY={startY}
            colHeight={adjustedHeight}
            width={width}
            height={height}
            thickness={thickness}
          />
        );
      })}
      {/* Gable end at X=length */}
      {intermediatePositions.map((pos, i) => {
        const startY = getColumnStartY('end_back', pos.z);
        const adjustedHeight = pos.colHeight - startY;
        if (adjustedHeight <= 0) return null;
        return (
          <EndColumn
            key={`back-${i}`}
            x={hallLength}
            z={pos.z}
            startY={startY}
            colHeight={adjustedHeight}
            width={width}
            height={height}
            thickness={thickness}
          />
        );
      })}
    </group>
  );
});

interface EndColumnProps {
  x: number;
  z: number;
  startY: number;
  colHeight: number;
  width: number;
  height: number;
  thickness: number;
}

function EndColumn({ x, z, startY, colHeight, width, height, thickness }: EndColumnProps) {
  const geometry = useRHSGeometry({ width, height, thickness, length: colHeight });
  return (
    <mesh
      geometry={geometry}
      material={columnMaterial}
      position={[x, startY, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    />
  );
}
