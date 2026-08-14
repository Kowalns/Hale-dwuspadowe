import React, { useMemo } from 'react';
import { plateMaterial } from '../materials';
import type { SteelProfile, ConnectionPlateResults } from '../../types';

interface BasePlatesProps {
  sideColumnProfile: SteelProfile;
  endColumnProfile: SteelProfile;
  wallHeight: number;
  span: number;
  length: number;
  columnSpacing: number;
  numberOfFrames: number;
  ridgeHeight: number;
  connectionPlates: ConnectionPlateResults;
}

/**
 * Renders horizontal base plates at the bottom of every column (side + end).
 * The plate is flat on the ground (Y=0) with dimensions from connectionPlates.basePlate.
 */
export const BasePlates = React.memo(function BasePlates({
  span,
  length: hallLength,
  columnSpacing,
  numberOfFrames,
  connectionPlates,
}: BasePlatesProps) {
  const { width, height, thickness } = connectionPlates.basePlate;

  // Convert mm to meters
  const plateW = width / 1000;
  const plateH = height / 1000;
  const plateT = thickness / 1000;

  // Side column positions (same logic as SideColumns.tsx)
  const sidePositions = useMemo(() => {
    const pos: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < numberOfFrames; i++) {
      const x = i * columnSpacing;
      pos.push({ x, z: 0 });
      pos.push({ x, z: span });
    }
    return pos;
  }, [numberOfFrames, columnSpacing, span]);

  // End column positions (same logic as EndColumns.tsx)
  const endPositions = useMemo(() => {
    const targetSpacing = 3.0;
    const n = Math.max(1, Math.round(span / targetSpacing) - 1);
    const pos: Array<{ x: number; z: number }> = [];
    for (let i = 1; i <= n; i++) {
      const z = (i / (n + 1)) * span;
      pos.push({ x: 0, z });
      pos.push({ x: hallLength, z });
    }
    return pos;
  }, [span, hallLength]);

  const allPositions = useMemo(
    () => [...sidePositions, ...endPositions],
    [sidePositions, endPositions]
  );

  return (
    <group name="base-plates">
      {allPositions.map((pos, i) => (
        <mesh
          key={i}
          material={plateMaterial}
          position={[pos.x, plateT / 2, pos.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[plateW, plateT, plateH]} />
        </mesh>
      ))}
    </group>
  );
});
