import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useSquareTubeGeometry } from '../profiles/SquareTubeGeometry';
import { rafterMaterial, bracingMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface TrussProps {
  chordProfile: SteelProfile;
  wallHeight: number;
  span: number;
  roofAngle: number;
  trussHeight: number;
  columnSpacing: number;
  numberOfFrames: number;
}

/**
 * Renders parallel chord trusses for span > 18m.
 * Each frame has a truss spanning the full width.
 * - Top chord follows the roof slope
 * - Bottom chord is horizontal at wallHeight
 * - Web members: verticals + diagonals in a V/W pattern
 */
export const Truss = React.memo(function Truss({
  chordProfile,
  wallHeight,
  span,
  roofAngle,
  trussHeight,
  columnSpacing,
  numberOfFrames,
}: TrussProps) {
  const size = chordProfile.h / 1000; // Square tube size in meters
  const thickness = (chordProfile.t ?? 4) / 1000;

  const roofAngleRad = (roofAngle * Math.PI) / 180;
  const halfSpan = span / 2;
  const slopeLength = halfSpan / Math.cos(roofAngleRad);

  const topChordGeometry = useSquareTubeGeometry({ size, thickness, length: slopeLength });
  const bottomChordGeometry = useSquareTubeGeometry({ size, thickness, length: span });

  const framePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < numberOfFrames; i++) {
      positions.push(i * columnSpacing);
    }
    return positions;
  }, [numberOfFrames, columnSpacing]);

  return (
    <group name="trusses">
      {framePositions.map((x, i) => (
        <TrussFrame
          key={i}
          x={x}
          wallHeight={wallHeight}
          span={span}
          roofAngleRad={roofAngleRad}
          trussHeight={trussHeight}
          topChordGeometry={topChordGeometry}
          bottomChordGeometry={bottomChordGeometry}
          webMemberSize={size * 0.5}
          webMemberThickness={thickness * 0.5}
        />
      ))}
    </group>
  );
});

interface TrussFrameProps {
  x: number;
  wallHeight: number;
  span: number;
  roofAngleRad: number;
  trussHeight: number;
  topChordGeometry: THREE.ExtrudeGeometry;
  bottomChordGeometry: THREE.ExtrudeGeometry;
  webMemberSize: number;
  webMemberThickness: number;
}

function TrussFrame({
  x,
  wallHeight,
  span,
  roofAngleRad,
  trussHeight,
  topChordGeometry,
  bottomChordGeometry,
  webMemberSize,
  webMemberThickness,
}: TrussFrameProps) {
  const halfSpan = span / 2;

  // Web members: divide span into segments
  const webMembers = useMemo(() => {
    const numPanels = Math.max(4, Math.round(span / 2)); // panels along the truss
    const panelWidth = span / numPanels;
    const members: Array<{
      start: [number, number, number];
      end: [number, number, number];
    }> = [];

    for (let i = 0; i <= numPanels; i++) {
      const z = i * panelWidth;
      // Calculate top chord height at this Z position
      const distFromCenter = Math.abs(z - halfSpan);
      const topY = wallHeight + trussHeight + (halfSpan - distFromCenter) * Math.tan(roofAngleRad);
      const bottomY = wallHeight;

      // Vertical members
      if (i > 0 && i < numPanels) {
        members.push({
          start: [x, bottomY, z],
          end: [x, topY, z],
        });
      }

      // Diagonals
      if (i < numPanels) {
        const nextZ = (i + 1) * panelWidth;
        const nextDistFromCenter = Math.abs(nextZ - halfSpan);
        const nextTopY = wallHeight + trussHeight + (halfSpan - nextDistFromCenter) * Math.tan(roofAngleRad);

        // Diagonal from bottom-left to top-right
        members.push({
          start: [x, bottomY, z],
          end: [x, nextTopY, nextZ],
        });
        // Diagonal from top-left to bottom-right
        members.push({
          start: [x, topY, z],
          end: [x, bottomY, nextZ],
        });
      }
    }
    return members;
  }, [span, halfSpan, wallHeight, trussHeight, roofAngleRad, x]);

  // Use a small tube geometry for reference (unused directly but kept for potential future use)
  useSquareTubeGeometry({ size: webMemberSize, thickness: webMemberThickness, length: 1 });

  return (
    <group>
      {/* Bottom chord - horizontal at wallHeight, spans along Z */}
      <mesh
        geometry={bottomChordGeometry}
        material={rafterMaterial}
        position={[x, wallHeight, 0]}
        castShadow
        receiveShadow
      />
      {/* Top chord left side - from Z=0 sloping up */}
      <mesh
        geometry={topChordGeometry}
        material={rafterMaterial}
        position={[x, wallHeight + trussHeight, 0]}
        rotation={[roofAngleRad, 0, 0]}
        castShadow
        receiveShadow
      />
      {/* Top chord right side - from Z=span sloping down (mirror) */}
      <mesh
        geometry={topChordGeometry}
        material={rafterMaterial}
        position={[x, wallHeight + trussHeight, span]}
        rotation={[-roofAngleRad, Math.PI, 0]}
        castShadow
        receiveShadow
      />
      {/* Web members as cylinders */}
      {webMembers.map((member, i) => (
        <WebMember
          key={i}
          start={member.start}
          end={member.end}
        />
      ))}
    </group>
  );
}

interface WebMemberProps {
  start: [number, number, number];
  end: [number, number, number];
}

function WebMember({ start, end }: WebMemberProps) {
  const { position, rotation, memberLength } = useMemo(() => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    const midZ = (start[2] + end[2]) / 2;

    // Calculate rotation to align cylinder (Y-axis) with direction
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [midX, midY, midZ] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      memberLength: len,
    };
  }, [start, end]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      material={bracingMaterial}
    >
      <cylinderGeometry args={[0.015, 0.015, memberLength, 6]} />
    </mesh>
  );
}
