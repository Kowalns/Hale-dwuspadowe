import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { girtMaterial } from '../materials';
import type { SteelProfile, Opening } from '../../types';

interface WallGirtsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  hallLength: number;
  openings?: Opening[];
  columnSpacing?: number;
  numberOfFrames?: number;
}

/**
 * Renders RHS wall girts running along the full building length (X direction)
 * at Y=wallHeight/2 on both sides (Z=0 and Z=span).
 *
 * When openings/columnSpacing/numberOfFrames are provided, girts are rendered per-bay
 * and skipped in bays that contain a gate (sectional_gate or sliding_gate).
 *
 * The RHS geometry extrudes along Z axis. To make girts run along X,
 * we create geometry with length and rotate [0, Math.PI/2, 0].
 */
export const WallGirts = React.memo(function WallGirts({
  profile,
  wallHeight,
  span,
  hallLength,
  openings,
  columnSpacing,
  numberOfFrames,
}: WallGirtsProps) {
  const width = profile.b / 1000;
  const height = profile.h / 1000;
  const thickness = (profile.t ?? 4) / 1000;

  const girtY = wallHeight / 2;

  // Determine which bays have gates for each side wall
  const hasPerBayInfo = columnSpacing != null && numberOfFrames != null;

  const bayData = useMemo(() => {
    if (!hasPerBayInfo || !openings || !columnSpacing || !numberOfFrames) return null;

    const numBays = numberOfFrames - 1;
    const leftBays: boolean[] = new Array(numBays).fill(false); // true = has gate, skip
    const rightBays: boolean[] = new Array(numBays).fill(false);

    for (const opening of openings) {
      if (opening.type !== 'sectional_gate' && opening.type !== 'sliding_gate') continue;

      if (opening.wall === 'side_left') {
        // positionX is the local horizontal position along the wall (from left edge)
        // For side_left, worldX = positionX
        const worldX = opening.positionX;
        const bayIndex = Math.floor(worldX / columnSpacing);
        if (bayIndex >= 0 && bayIndex < numBays) {
          leftBays[bayIndex] = true;
        }
      } else if (opening.wall === 'side_right') {
        // For side_right, worldX = hallLength - positionX
        const worldX = hallLength - opening.positionX;
        const bayIndex = Math.floor(worldX / columnSpacing);
        if (bayIndex >= 0 && bayIndex < numBays) {
          rightBays[bayIndex] = true;
        }
      }
    }

    return { leftBays, rightBays, numBays };
  }, [hasPerBayInfo, openings, columnSpacing, numberOfFrames, hallLength]);

  // If no per-bay info, render single full-length girts (original behavior)
  if (!bayData) {
    return (
      <WallGirtsFullLength
        width={width}
        height={height}
        thickness={thickness}
        hallLength={hallLength}
        girtY={girtY}
        span={span}
      />
    );
  }

  // Render per-bay segments, skipping bays with gates
  return (
    <group name="wall-girts">
      {/* Left wall (Z=0) */}
      {bayData.leftBays.map((hasGate, i) => {
        if (hasGate) return null;
        return (
          <BayGirtSegment
            key={`left-${i}`}
            bayIndex={i}
            columnSpacing={columnSpacing!}
            numBays={bayData.numBays}
            hallLength={hallLength}
            girtY={girtY}
            z={0}
            width={width}
            height={height}
            thickness={thickness}
          />
        );
      })}
      {/* Right wall (Z=span) */}
      {bayData.rightBays.map((hasGate, i) => {
        if (hasGate) return null;
        return (
          <BayGirtSegment
            key={`right-${i}`}
            bayIndex={i}
            columnSpacing={columnSpacing!}
            numBays={bayData.numBays}
            hallLength={hallLength}
            girtY={girtY}
            z={span}
            width={width}
            height={height}
            thickness={thickness}
          />
        );
      })}
    </group>
  );
});

interface WallGirtsFullLengthProps {
  width: number;
  height: number;
  thickness: number;
  hallLength: number;
  girtY: number;
  span: number;
}

function WallGirtsFullLength({ width, height, thickness, hallLength, girtY, span }: WallGirtsFullLengthProps) {
  const geometry = useRHSGeometry({ width, height, thickness, length: hallLength });

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
}

interface BayGirtSegmentProps {
  bayIndex: number;
  columnSpacing: number;
  numBays: number;
  hallLength: number;
  girtY: number;
  z: number;
  width: number;
  height: number;
  thickness: number;
}

function BayGirtSegment({
  bayIndex,
  columnSpacing,
  numBays,
  hallLength,
  girtY,
  z,
  width,
  height,
  thickness,
}: BayGirtSegmentProps) {
  // Last bay might be shorter if hallLength is not an exact multiple of columnSpacing
  const bayStart = bayIndex * columnSpacing;
  const bayEnd = bayIndex === numBays - 1 ? hallLength : (bayIndex + 1) * columnSpacing;
  const segmentLength = bayEnd - bayStart;

  const geometry = useRHSGeometry({ width, height, thickness, length: segmentLength });

  // Position: the RHS geometry extrudes along Z, rotated by PI/2 around Y to run along X.
  // After rotation [0, PI/2, 0], the extrusion direction (Z) maps to -X.
  // Origin of geometry after rotation is at the end of the segment,
  // so we position at bayEnd to have it extend back to bayStart.
  // Actually with rotation [0, PI/2, 0]: Z-axis becomes -X direction.
  // So geometry starts at position and extends in -X direction.
  // Position X should be at bayEnd so it extends back to bayStart. 
  // But the original full-length girt uses position [0, girtY, z] with length=hallLength,
  // which means it starts at X=0 and extends to X=-hallLength? No - after rotation the local Z+ maps to local -X in world.
  // Let me check: rotation [0, PI/2, 0] rotates local Z to -X. So geometry at (0,0,0) would go from x=0 to x=-length? 
  // Actually, the original is at position=[0, girtY, 0] with length=hallLength.
  // With rotation [0, PI/2, 0], the extrusion goes from the mesh position in the -X direction... 
  // But wait: ExtrudeGeometry extrudes along +Z from 0 to depth. After rotation [0, PI/2, 0]:
  // +Z becomes -X. So geometry at position [0, girtY, 0] extends from x=0 to x=-hallLength?
  // That doesn't match. Let me think again: rotation matrix for Y by PI/2:
  // x' = z, z' = -x. So local Z=hallLength maps to world X=hallLength (and local X maps to world -Z).
  // Wait: R_y(theta) rotates local z toward x. For theta=PI/2: 
  // local [0,0,1] -> [sin(PI/2), 0, cos(PI/2)] = [1, 0, 0]. So local +Z maps to world +X.
  // Yes! So mesh at position [0, girtY, 0] with extrusion along local Z from 0 to hallLength
  // means world X goes from 0 to hallLength. 
  // For a segment: position at [bayStart, girtY, z] with length=segmentLength.
  // Local Z from 0 to segmentLength maps to world X from bayStart to bayStart+segmentLength.
  // But wait: the position shifts the origin. The geometry extrudes from Z=0 to Z=segmentLength in local space.
  // After rotation, that maps to X=0 to X=segmentLength in the mesh's local rotated frame.
  // Then position moves the mesh to [bayStart, girtY, z]. So total world X: bayStart to bayStart+segmentLength. 

  return (
    <mesh
      geometry={geometry}
      material={girtMaterial}
      position={[bayStart, girtY, z]}
      rotation={[0, Math.PI / 2, 0]}
      castShadow
      receiveShadow
    />
  );
}
