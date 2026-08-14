import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { intermediateColumnMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface IntermediateColumnsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  columnSpacing: number;
  numberOfFrames: number;
  active: boolean;
}

/**
 * Renders RHS intermediate columns at the midpoint between each pair of main frame columns.
 * Placed on both side walls (Z=0 and Z=span).
 * X positions: i*columnSpacing + columnSpacing/2 for i=0..numberOfFrames-1.
 * Height = wallHeight. Only rendered if active prop is true.
 */
export const IntermediateColumns = React.memo(function IntermediateColumns({
  profile,
  wallHeight,
  span,
  columnSpacing,
  numberOfFrames,
  active,
}: IntermediateColumnsProps) {
  const width = profile.b / 1000;
  const height = profile.h / 1000;
  const thickness = (profile.t ?? 4) / 1000;

  const geometry = useRHSGeometry({ width, height, thickness, length: wallHeight });

  // Calculate X positions for intermediate columns
  const xPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < numberOfFrames; i++) {
      positions.push(i * columnSpacing + columnSpacing / 2);
    }
    return positions;
  }, [columnSpacing, numberOfFrames]);

  if (!active) {
    return null;
  }

  return (
    <group name="intermediate-columns">
      {xPositions.map((x, i) => (
        <React.Fragment key={i}>
          {/* Z=0 side */}
          <mesh
            geometry={geometry}
            material={intermediateColumnMaterial}
            position={[x, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          />
          {/* Z=span side */}
          <mesh
            geometry={geometry}
            material={intermediateColumnMaterial}
            position={[x, 0, span]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          />
        </React.Fragment>
      ))}
    </group>
  );
});
