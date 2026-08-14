import React, { useMemo } from 'react';
import * as THREE from 'three';
import { rafterMaterial, bracingMaterial, plateMaterial } from '../materials';
import type { SteelProfile, ConnectionPlateResults } from '../../types';

interface TrussColumnHeadProps {
  chordProfile: SteelProfile;
  wallHeight: number;
  span: number;
  roofAngle: number;
  trussHeight: number;
  columnSpacing: number;
  numberOfFrames: number;
  connectionPlates: ConnectionPlateResults;
}

/**
 * Renders truss column heads (short truss stubs) at the top of each side column
 * when the rafter type is truss. Each head consists of:
 * - A short upper chord segment (~500mm) extending toward the hall center
 * - A short lower chord segment (~500mm) parallel, offset down by trussHeight
 * - One diagonal web member connecting them
 * - End plates (vertical, in XY plane) at the far ends of both chords
 *
 * The head is inclined at the roof angle, matching the truss slope.
 */
export const TrussColumnHead = React.memo(function TrussColumnHead({
  chordProfile,
  wallHeight,
  span,
  roofAngle,
  trussHeight,
  columnSpacing,
  numberOfFrames,
  connectionPlates,
}: TrussColumnHeadProps) {
  const framePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < numberOfFrames; i++) {
      positions.push(i * columnSpacing);
    }
    return positions;
  }, [numberOfFrames, columnSpacing]);

  const chordSize = chordProfile.h / 1000;
  const webSize = 0.03; // 30x30mm diagonal
  const headLength = 0.5; // 500mm stub length (horizontal projection along Z)

  const roofAngleRad = (roofAngle * Math.PI) / 180;

  // End plate dimensions from connectionPlates
  const { width, height, thickness } = connectionPlates.endPlate;
  const plateW = width / 1000;
  const plateH = height / 1000;
  const plateT = thickness / 1000;

  return (
    <group name="truss-column-heads">
      {framePositions.map((x, i) => (
        <React.Fragment key={i}>
          {/* Left side (Z=0): head extends toward +Z */}
          <ColumnHead
            x={x}
            wallHeight={wallHeight}
            roofAngleRad={roofAngleRad}
            trussHeight={trussHeight}
            headLength={headLength}
            chordSize={chordSize}
            webSize={webSize}
            plateW={plateW}
            plateH={plateH}
            plateT={plateT}
            side="left"
          />
          {/* Right side (Z=span): head extends toward -Z */}
          <ColumnHead
            x={x}
            wallHeight={wallHeight}
            roofAngleRad={roofAngleRad}
            trussHeight={trussHeight}
            headLength={headLength}
            chordSize={chordSize}
            webSize={webSize}
            plateW={plateW}
            plateH={plateH}
            plateT={plateT}
            side="right"
            span={span}
          />
        </React.Fragment>
      ))}
    </group>
  );
});

interface ColumnHeadProps {
  x: number;
  wallHeight: number;
  roofAngleRad: number;
  trussHeight: number;
  headLength: number;
  chordSize: number;
  webSize: number;
  plateW: number;
  plateH: number;
  plateT: number;
  side: 'left' | 'right';
  span?: number;
}

function ColumnHead({
  x,
  wallHeight,
  roofAngleRad,
  trussHeight,
  headLength,
  chordSize,
  webSize,
  plateW,
  plateH,
  plateT,
  side,
  span = 0,
}: ColumnHeadProps) {
  const members = useMemo(() => {
    // Rise over the 500mm horizontal run
    const rise = headLength * Math.tan(roofAngleRad);

    let topStart: THREE.Vector3;
    let topEnd: THREE.Vector3;
    let bottomStart: THREE.Vector3;
    let bottomEnd: THREE.Vector3;

    if (side === 'left') {
      // Left side: Z=0, extends toward +Z
      topStart = new THREE.Vector3(x, wallHeight, 0);
      topEnd = new THREE.Vector3(x, wallHeight + rise, headLength);
      bottomStart = new THREE.Vector3(x, wallHeight - trussHeight, 0);
      bottomEnd = new THREE.Vector3(x, wallHeight - trussHeight + rise, headLength);
    } else {
      // Right side: Z=span, extends toward -Z (mirror)
      topStart = new THREE.Vector3(x, wallHeight, span);
      topEnd = new THREE.Vector3(x, wallHeight + rise, span - headLength);
      bottomStart = new THREE.Vector3(x, wallHeight - trussHeight, span);
      bottomEnd = new THREE.Vector3(x, wallHeight - trussHeight + rise, span - headLength);
    }

    return { topStart, topEnd, bottomStart, bottomEnd };
  }, [x, wallHeight, roofAngleRad, trussHeight, headLength, side, span]);

  // End plate positions: at the far ends of both chords, vertical (XY plane)
  const platePosition = useMemo(() => {
    // Plate is centered between topEnd and bottomEnd in Y, at the Z of the ends
    const midY = (members.topEnd.y + members.bottomEnd.y) / 2;
    return new THREE.Vector3(members.topEnd.x, midY, members.topEnd.z);
  }, [members]);

  return (
    <group>
      {/* Upper chord */}
      <TrussHeadMember
        start={members.topStart}
        end={members.topEnd}
        size={chordSize}
        material={rafterMaterial}
      />
      {/* Lower chord */}
      <TrussHeadMember
        start={members.bottomStart}
        end={members.bottomEnd}
        size={chordSize}
        material={rafterMaterial}
      />
      {/* Diagonal web member connecting far end of bottom to near end of top (or similar) */}
      <TrussHeadMember
        start={members.bottomStart}
        end={members.topEnd}
        size={webSize}
        material={bracingMaterial}
      />
      {/* End plate at the far end - vertical in XY plane */}
      <mesh
        material={plateMaterial}
        position={[platePosition.x, platePosition.y, platePosition.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[plateW, plateH, plateT]} />
      </mesh>
    </group>
  );
}

interface TrussHeadMemberProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  size: number;
  material: THREE.Material;
}

function TrussHeadMember({ start, end, size, material }: TrussHeadMemberProps) {
  const { position, rotation, memberLength } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const len = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Align box (Y-axis default) with the direction vector
    const dir = direction.normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
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
      material={material}
    >
      <boxGeometry args={[size, memberLength, size]} />
    </mesh>
  );
}
