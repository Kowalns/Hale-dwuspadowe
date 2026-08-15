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
  columnFlangeOffset: number;
}

/**
 * Renders cap plates (10mm thick) at the top of each side column.
 * Each cap plate matches the column cross-section dimensions and is rotated
 * around its TOP surface to follow the roof angle.
 *
 * Approach: A group is positioned at wallHeight (top of column) and rotated
 * by the roof angle. The mesh inside is offset by -plateThickness/2 in local Y,
 * so that the top surface of the plate aligns with the rotation pivot point.
 *
 * Dimensions: b (along X) x 10mm (Y) x h (along Z)
 */
export const ColumnCaps = React.memo(function ColumnCaps({
  sideColumnProfile,
  wallHeight,
  span,
  roofAngle,
  columnSpacing,
  numberOfFrames,
  columnFlangeOffset,
}: ColumnCapsProps) {
  // Column profile dimensions in meters
  const profileB = sideColumnProfile.b / 1000; // width along X
  const profileH = sideColumnProfile.h / 1000; // depth along Z
  const plateThickness = 0.01; // 10mm
  const roofAngleRad = (roofAngle * Math.PI) / 180;

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
          {/* Left side: pivot at inner edge (Z=columnFlangeOffset), plate extends toward Z=0 (outside) */}
          <group position={[x, wallHeight, columnFlangeOffset]} rotation={[-roofAngleRad, 0, 0]}>
            <mesh material={plateMaterial} position={[0, -plateThickness / 2, -profileH / 2]} castShadow receiveShadow>
              <boxGeometry args={[profileB, plateThickness, profileH]} />
            </mesh>
          </group>
          {/* Right side: pivot at inner edge (Z=span-columnFlangeOffset), plate extends toward Z=span (outside) */}
          <group position={[x, wallHeight, span - columnFlangeOffset]} rotation={[roofAngleRad, 0, 0]}>
            <mesh material={plateMaterial} position={[0, -plateThickness / 2, profileH / 2]} castShadow receiveShadow>
              <boxGeometry args={[profileB, plateThickness, profileH]} />
            </mesh>
          </group>
        </React.Fragment>
      ))}
    </group>
  );
});
