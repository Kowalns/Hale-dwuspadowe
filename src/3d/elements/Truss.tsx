import React, { useMemo } from 'react';
import * as THREE from 'three';
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
  columnFlangeOffset: number;
  headLength: number;
  purlinSpacing: number;
}

/**
 * Renders parallel chord trusses for span > 18m.
 * Each frame has a truss spanning the full width.
 * - Top chord follows the roof slope (on both sides)
 * - Bottom chord is PARALLEL to the top chord, offset down by trussHeight
 * - Web members: V-pattern diagonals meeting at bottom midpoints
 */
export const Truss = React.memo(function Truss({
  chordProfile,
  wallHeight,
  span,
  roofAngle,
  trussHeight,
  columnSpacing,
  numberOfFrames,
  columnFlangeOffset,
  headLength,
  purlinSpacing,
}: TrussProps) {
  const framePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < numberOfFrames; i++) {
      positions.push(i * columnSpacing);
    }
    return positions;
  }, [numberOfFrames, columnSpacing]);

  const chordSize = chordProfile.h / 1000;

  return (
    <group name="trusses">
      {framePositions.map((x, i) => (
        <TrussFrame
          key={i}
          x={x}
          wallHeight={wallHeight}
          span={span}
          roofAngle={roofAngle}
          trussHeight={trussHeight}
          chordSize={chordSize}
          columnFlangeOffset={columnFlangeOffset}
          headLength={headLength}
          purlinSpacing={purlinSpacing}
        />
      ))}
    </group>
  );
});

interface TrussFrameProps {
  x: number;
  wallHeight: number;
  span: number;
  roofAngle: number;
  trussHeight: number;
  chordSize: number;
  columnFlangeOffset: number;
  headLength: number;
  purlinSpacing: number;
}

function TrussFrame({
  x,
  wallHeight,
  span,
  roofAngle,
  trussHeight,
  chordSize,
  columnFlangeOffset,
  headLength,
  purlinSpacing,
}: TrussFrameProps) {
  const roofAngleRad = (roofAngle * Math.PI) / 180;
  // Main truss starts after the starters (column heads)
  const spliceGap = 0.030; // 2 x 15mm end plates (starter plate + truss plate)
  const ridgeGap = 0.015; // 15mm ridge plate
  const trussStartOffset = columnFlangeOffset + headLength + spliceGap;
  const effectiveHalfSpan = span / 2 - trussStartOffset - ridgeGap;

  // Web member size: 30x30mm square tube
  const webSize = 0.03;

  // Compute nodes for both slopes
  const { chordSegments, webMembers } = useMemo(() => {
    // Top chord nodes at purlin positions
    const numPanels = Math.max(3, Math.round(effectiveHalfSpan / purlinSpacing));

    // Generate nodes along each slope
    // Left slope: Z goes from trussStartOffset to span/2 (ridge)
    // Right slope: Z goes from span - trussStartOffset to span/2 (ridge)
    const topNodesLeft: THREE.Vector3[] = [];
    const bottomNodesLeft: THREE.Vector3[] = [];
    const topNodesRight: THREE.Vector3[] = [];
    const bottomNodesRight: THREE.Vector3[] = [];

    for (let i = 0; i <= numPanels; i++) {
      const t = i / numPanels;

      // Left slope
      const zLeft = trussStartOffset + t * effectiveHalfSpan;
      const yTopLeft = wallHeight + (zLeft - columnFlangeOffset) * Math.tan(roofAngleRad);
      const yBottomLeft = yTopLeft - trussHeight;
      topNodesLeft.push(new THREE.Vector3(x, yTopLeft, zLeft));
      bottomNodesLeft.push(new THREE.Vector3(x, yBottomLeft, zLeft));

      // Right slope
      const zRight = (span - trussStartOffset) - t * effectiveHalfSpan;
      const yTopRight = wallHeight + ((span - columnFlangeOffset) - zRight) * Math.tan(roofAngleRad);
      const yBottomRight = yTopRight - trussHeight;
      topNodesRight.push(new THREE.Vector3(x, yTopRight, zRight));
      bottomNodesRight.push(new THREE.Vector3(x, yBottomRight, zRight));
    }

    // Generate chord segments (connecting consecutive nodes)
    const segments: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Top chord segments
    for (let i = 0; i < topNodesLeft.length - 1; i++) {
      segments.push({ start: topNodesLeft[i], end: topNodesLeft[i + 1] });
    }
    for (let i = 0; i < topNodesRight.length - 1; i++) {
      segments.push({ start: topNodesRight[i], end: topNodesRight[i + 1] });
    }

    // Bottom chord: single segment from start to end on each side
    segments.push({ start: bottomNodesLeft[0], end: bottomNodesLeft[bottomNodesLeft.length - 1] });
    segments.push({ start: bottomNodesRight[0], end: bottomNodesRight[bottomNodesRight.length - 1] });

    // Web members: V-pattern meeting at bottom midpoints
    const webs: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Left slope web members
    for (let i = 0; i < numPanels; i++) {
      // Bottom midpoint between top[i] and top[i+1]
      const midZ = (topNodesLeft[i].z + topNodesLeft[i + 1].z) / 2;
      const midYTop = (topNodesLeft[i].y + topNodesLeft[i + 1].y) / 2;
      const midYBottom = midYTop - trussHeight;
      const bottomMid = new THREE.Vector3(x, midYBottom, midZ);

      webs.push({ start: topNodesLeft[i], end: bottomMid });
      webs.push({ start: topNodesLeft[i + 1], end: bottomMid });
    }

    // Right slope web members
    for (let i = 0; i < numPanels; i++) {
      // Bottom midpoint between top[i] and top[i+1]
      const midZ = (topNodesRight[i].z + topNodesRight[i + 1].z) / 2;
      const midYTop = (topNodesRight[i].y + topNodesRight[i + 1].y) / 2;
      const midYBottom = midYTop - trussHeight;
      const bottomMid = new THREE.Vector3(x, midYBottom, midZ);

      webs.push({ start: topNodesRight[i], end: bottomMid });
      webs.push({ start: topNodesRight[i + 1], end: bottomMid });
    }

    return {
      chordSegments: segments,
      webMembers: webs,
    };
  }, [x, wallHeight, span, effectiveHalfSpan, trussStartOffset, columnFlangeOffset, roofAngleRad, trussHeight, purlinSpacing]);

  return (
    <group>
      {/* Chord segments (top and bottom) */}
      {chordSegments.map((seg, i) => (
        <TrussMember
          key={`chord-${i}`}
          start={seg.start}
          end={seg.end}
          size={chordSize}
          material={rafterMaterial}
        />
      ))}
      {/* Web members (diagonals + verticals) */}
      {webMembers.map((member, i) => (
        <TrussMember
          key={`web-${i}`}
          start={member.start}
          end={member.end}
          size={webSize}
          material={bracingMaterial}
        />
      ))}
    </group>
  );
}

interface TrussMemberProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  size: number;
  material: THREE.Material;
}

function TrussMember({ start, end, size, material }: TrussMemberProps) {
  const { position, rotation, memberLength } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const len = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Align box (Y-axis default) with the direction
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
