import React, { useMemo } from 'react';
import { plateMaterial } from '../materials';
import type { ConnectionPlateResults } from '../../types';

interface EndPlatesProps {
  wallHeight: number;
  span: number;
  columnSpacing: number;
  numberOfFrames: number;
  connectionPlates: ConnectionPlateResults;
  rafterType: 'ipe' | 'truss';
}

/**
 * Renders vertical end plates (column-to-rafter connection) at the top of each side column.
 * Only rendered when rafterType === 'ipe' (IPE rafter).
 * When truss is active, TrussColumnHead provides its own end plates.
 * Positioned at Y=wallHeight, oriented vertically in the XY plane.
 * 2 per frame (one at Z=0, one at Z=span).
 */
export const EndPlates = React.memo(function EndPlates({
  wallHeight,
  span,
  columnSpacing,
  numberOfFrames,
  connectionPlates,
  rafterType,
}: EndPlatesProps) {
  // When truss is active, do not render end plates (TrussColumnHead has its own)
  if (rafterType === 'truss') {
    return null;
  }

  const { width, height, thickness } = connectionPlates.endPlate;

  // Convert mm to meters
  const plateW = width / 1000;
  const plateH = height / 1000;
  const plateT = thickness / 1000;

  const positions = useMemo(() => {
    const pos: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < numberOfFrames; i++) {
      const x = i * columnSpacing;
      pos.push({ x, z: 0 });
      pos.push({ x, z: span });
    }
    return pos;
  }, [numberOfFrames, columnSpacing, span]);

  return (
    <group name="end-plates">
      {positions.map((pos, i) => (
        <mesh
          key={i}
          material={plateMaterial}
          position={[pos.x, wallHeight, pos.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[plateW, plateH, plateT]} />
        </mesh>
      ))}
    </group>
  );
});
