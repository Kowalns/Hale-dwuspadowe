import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { girtMaterial } from '../materials';
import type { SteelProfile, Opening } from '../../types';

interface GableGirtsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  hallLength: number;
  openings?: Opening[];
}

/**
 * Renders horizontal RHS girts on gable walls (X=0 and X=hallLength).
 * Girts run along Z axis between adjacent end column positions.
 * Number of rows: 1 if wallHeight<=5 (at H/2), 2 if wallHeight>5 (at H/3 and 2H/3).
 * Uses same targetSpacing=3m logic as EndColumns to determine column Z positions.
 *
 * When end-wall gate openings are present, girt segments whose Y height falls within
 * the gate opening zone (floor to gate height) AND whose Z range overlaps the gate
 * width are suppressed to avoid rendering through the opening.
 */
export const GableGirts = React.memo(function GableGirts({
  profile,
  wallHeight,
  span,
  hallLength,
  openings,
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

  // Filter gate openings on end walls
  const endWallGates = useMemo(() => {
    if (!openings) return [];
    return openings.filter(
      (o) =>
        (o.wall === 'end_front' || o.wall === 'end_back') &&
        (o.type === 'sectional_gate' || o.type === 'sliding_gate')
    );
  }, [openings]);

  // Calculate girt segments between adjacent column positions, suppressing those
  // that pass through gate openings
  const segments = useMemo(() => {
    const result: Array<{
      x: number;
      y: number;
      z: number;
      segLength: number;
    }> = [];

    for (const girtY of girtHeights) {
      for (const gableX of [0, hallLength]) {
        // Determine which wall this gable corresponds to
        const wallName = gableX === 0 ? 'end_front' : 'end_back';

        for (let i = 0; i < columnZPositions.length - 1; i++) {
          const z0 = columnZPositions[i];
          const z1 = columnZPositions[i + 1];
          const segLength = z1 - z0;

          // Check if this segment is blocked by a gate opening
          const isBlocked = endWallGates.some((gate) => {
            if (gate.wall !== wallName) return false;

            // Convert gate positionX to world Z
            let centerZ: number;
            if (wallName === 'end_front') {
              centerZ = span - gate.positionX;
            } else {
              centerZ = gate.positionX;
            }

            const gateLeftZ = centerZ - gate.width / 2;
            const gateRightZ = centerZ + gate.width / 2;

            // Gate vertical extent: from floor (0) to gate.height
            const gateBottomY = 0;
            const gateTopY = gate.height;

            // Check vertical overlap: girt Y is within gate height range
            const yOverlaps = girtY >= gateBottomY && girtY <= gateTopY;

            // Check horizontal (Z) overlap: segment overlaps with gate Z range
            const zOverlaps = z0 < gateRightZ && z1 > gateLeftZ;

            return yOverlaps && zOverlaps;
          });

          if (!isBlocked) {
            result.push({
              x: gableX,
              y: girtY,
              z: z0,
              segLength,
            });
          }
        }
      }
    }

    return result;
  }, [girtHeights, hallLength, columnZPositions, endWallGates, span]);

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
