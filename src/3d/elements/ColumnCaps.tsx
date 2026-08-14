import React, { useMemo } from 'react';
import { plateMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface ColumnCapsProps {
  sideColumnProfile: SteelProfile;
  wallHeight: number;
  span: number;
  roofAngle: number;
  columnSpacing: number;
  numberOfFrames: number;
  rafterTopOffset: number;
}

/**
 * Renders cap plates (10mm thick) at the top of each side column.
 * Each cap plate matches the column cross-section dimensions and is
 * inclined at the roof angle (tilted toward the ridge).
 *
 * Dimensions: b (along X) x 10mm (Y) x h (along Z)
 * After column rotation [-PI/2, 0, 0], profile b goes along X and h goes along Z.
 */
export const ColumnCaps = React.memo(function ColumnCaps({
  sideColumnProfile,
  wallHeight,
  span,
  roofAngle,
  columnSpacing,
  numberOfFrames,
  rafterTopOffset,
}: ColumnCapsProps) {
  const roofAngleRad = (roofAngle * Math.PI) / 180;

  // Column profile dimensions in meters
  const profileB = sideColumnProfile.b / 1000; // width along X
  const profileH = sideColumnProfile.h / 1000; // depth along Z
  const plateThickness = 0.01; // 10mm

  const framePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < numberOfFrames; i++) {
      positions.push(i * columnSpacing);
    }
    return positions;
  }, [numberOfFrames, columnSpacing]);

  return (
    <group name="column-caps">
      {framePositions.map((x, i) => (
        <React.Fragment key={i}>
          {/* Left side (Z=0): plate tilted toward +Z (toward ridge) */}
          <mesh
            material={plateMaterial}
            position={[x, wallHeight + rafterTopOffset - plateThickness / 2, 0]}
            rotation={[-roofAngleRad, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[profileB, plateThickness, profileH]} />
          </mesh>
          {/* Right side (Z=span): plate tilted toward -Z (toward ridge) */}
          <mesh
            material={plateMaterial}
            position={[x, wallHeight + rafterTopOffset - plateThickness / 2, span]}
            rotation={[roofAngleRad, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[profileB, plateThickness, profileH]} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
});
