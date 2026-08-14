import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { girtMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface GableGirtsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  hallLength: number;
  ridgeHeight: number;
}

/**
 * Renders horizontal RHS girts on gable walls (X=0 and X=hallLength).
 * Girts run along Z axis between adjacent end column positions.
 * Number of rows: 1 if wallHeight<=5 (at H/2), 2 if wallHeight>5 (at H/3 and 2H/3).
 * Uses same targetSpacing=3m logic as EndColumns to determine column Z positions.
 */
export const GableGirts = React.memo(function GableGirts({
  profile,
  wallHeight,
  span,
  hallLength,
  ridgeHeight: _ridgeHeight,
}: GableGirtsProps) {
  const width = profile.b / 1000;
  const height = profile.h / 1000;
  const thickness = (profile.t ?? 4) / 1000;

  // Calculate girt row heights
  const girtHeights = useMemo(() => {
    if (wallHeight <= 5) {
      return [wallHeight / 2];
    }
    return [wallHeight / 3, (2 * wallHeight) / 3];
  }, [wallHeight]);

  // Calculate end column Z positions (same logic as EndColumns.tsx)
  const columnZPositions = useMemo(() => {
    const targetSpacing = 3.0;
    const n = Math.max(1, Math.round(span / targetSpacing) - 1);
    const positions: number[] = [0]; // start edge
    for (let i = 1; i <= n; i++) {
      positions.push((i / (n + 1)) * span);
    }
    positions.push(span); // end edge
    positions.sort((a, b) => a - b);
    return positions;
  }, [span]);

  // Calculate girt segments between adjacent column positions
  const segments = useMemo(() => {
    const result: Array<{
      x: number;
      y: number;
      z: number;
      segLength: number;
    }> = [];

    for (const girtY of girtHeights) {
      for (let gableX of [0, hallLength]) {
        for (let i = 0; i < columnZPositions.length - 1; i++) {
          const z0 = columnZPositions[i];
          const z1 = columnZPositions[i + 1];
          const segLength = z1 - z0;
          result.push({
            x: gableX,
            y: girtY,
            z: z0,
            segLength,
          });
        }
      }
    }

    return result;
  }, [girtHeights, hallLength, columnZPositions]);

  return (
    <group name="gable-girts">
      {segments.map((seg, i) => (
        <GableGirtSegment
          key={i}
          x={seg.x}
          y={seg.y}
          z={seg.z}
          segLength={seg.segLength}
          width={width}
          height={height}
          thickness={thickness}
        />
      ))}
    </group>
  );
});

interface GableGirtSegmentProps {
  x: number;
  y: number;
  z: number;
  segLength: number;
  width: number;
  height: number;
  thickness: number;
}

function GableGirtSegment({ x, y, z, segLength, width, height, thickness }: GableGirtSegmentProps) {
  // RHS geometry extrudes along Z axis - gable girts run along Z so no rotation needed
  const geometry = useRHSGeometry({ width, height, thickness, length: segLength });

  return (
    <mesh
      geometry={geometry}
      material={girtMaterial}
      position={[x, y, z]}
      castShadow
      receiveShadow
    />
  );
}
