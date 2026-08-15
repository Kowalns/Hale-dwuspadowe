import React, { useMemo } from 'react';
import * as THREE from 'three';
import { rafterMaterial, bracingMaterial, plateMaterial } from '../materials';
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
  const { chordSegments, webMembers, topNodesLeft, bottomNodesLeft, topNodesRight, bottomNodesRight } = useMemo(() => {
    // Top chord nodes at purlin positions
    const numPanels = Math.max(3, Math.round(effectiveHalfSpan / purlinSpacing));

    // Generate nodes along each slope
    // Left slope: Z goes from trussStartOffset to span/2 (ridge)
    // Right slope: Z goes from span - trussStartOffset to span/2 (ridge)
    const topNL: THREE.Vector3[] = [];
    const bottomNL: THREE.Vector3[] = [];
    const topNR: THREE.Vector3[] = [];
    const bottomNR: THREE.Vector3[] = [];

    for (let i = 0; i <= numPanels; i++) {
      const t = i / numPanels;

      // Left slope
      const zLeft = trussStartOffset + t * effectiveHalfSpan;
      const yTopLeft = wallHeight + (zLeft - columnFlangeOffset) * Math.tan(roofAngleRad);
      const yBottomLeft = yTopLeft - trussHeight;
      topNL.push(new THREE.Vector3(x, yTopLeft, zLeft));
      bottomNL.push(new THREE.Vector3(x, yBottomLeft, zLeft));

      // Right slope
      const zRight = (span - trussStartOffset) - t * effectiveHalfSpan;
      const yTopRight = wallHeight + ((span - columnFlangeOffset) - zRight) * Math.tan(roofAngleRad);
      const yBottomRight = yTopRight - trussHeight;
      topNR.push(new THREE.Vector3(x, yTopRight, zRight));
      bottomNR.push(new THREE.Vector3(x, yBottomRight, zRight));
    }

    // Generate chord segments (connecting consecutive nodes)
    const segments: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Top chord segments
    for (let i = 0; i < topNL.length - 1; i++) {
      segments.push({ start: topNL[i], end: topNL[i + 1] });
    }
    for (let i = 0; i < topNR.length - 1; i++) {
      segments.push({ start: topNR[i], end: topNR[i + 1] });
    }

    // Bottom chord: single segment from start to end on each side
    segments.push({ start: bottomNL[0], end: bottomNL[bottomNL.length - 1] });
    segments.push({ start: bottomNR[0], end: bottomNR[bottomNR.length - 1] });

    // Web members: zigzag starting from bottom
    const webs: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Left slope web members
    // First: from bottom start to top[0]
    webs.push({ start: bottomNL[0], end: topNL[0] });

    for (let i = 0; i < numPanels; i++) {
      // Mid-bottom point between top[i] and top[i+1]
      const midZ = (topNL[i].z + topNL[i + 1].z) / 2;
      const midYTop = (topNL[i].y + topNL[i + 1].y) / 2;
      const midYBottom = midYTop - trussHeight;
      const bottomMid = new THREE.Vector3(x, midYBottom, midZ);

      // From top[i] down to bottomMid
      webs.push({ start: topNL[i], end: bottomMid });
      // From bottomMid up to top[i+1]
      webs.push({ start: bottomMid, end: topNL[i + 1] });
    }

    // Last: from top[last] to bottom end
    webs.push({ start: topNL[numPanels], end: bottomNL[bottomNL.length - 1] });

    // Right slope web members
    // First: from bottom start to top[0]
    webs.push({ start: bottomNR[0], end: topNR[0] });

    for (let i = 0; i < numPanels; i++) {
      // Mid-bottom point between top[i] and top[i+1]
      const midZ = (topNR[i].z + topNR[i + 1].z) / 2;
      const midYTop = (topNR[i].y + topNR[i + 1].y) / 2;
      const midYBottom = midYTop - trussHeight;
      const bottomMid = new THREE.Vector3(x, midYBottom, midZ);

      // From top[i] down to bottomMid
      webs.push({ start: topNR[i], end: bottomMid });
      // From bottomMid up to top[i+1]
      webs.push({ start: bottomMid, end: topNR[i + 1] });
    }

    // Last: from top[last] to bottom end
    webs.push({ start: topNR[numPanels], end: bottomNR[bottomNR.length - 1] });

    return {
      chordSegments: segments,
      webMembers: webs,
      topNodesLeft: topNL,
      bottomNodesLeft: bottomNL,
      topNodesRight: topNR,
      bottomNodesRight: bottomNR,
    };
  }, [x, wallHeight, span, effectiveHalfSpan, trussStartOffset, columnFlangeOffset, roofAngleRad, trussHeight, purlinSpacing]);

  const plateSize = chordSize + 0.04;

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
      {/* Web members (diagonals) */}
      {webMembers.map((member, i) => (
        <TrussMember
          key={`web-${i}`}
          start={member.start}
          end={member.end}
          size={webSize}
          material={bracingMaterial}
        />
      ))}
      {/* Plates at truss start (splice with starters) */}
      <mesh position={[topNodesLeft[0].x, topNodesLeft[0].y, topNodesLeft[0].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomNodesLeft[0].x, bottomNodesLeft[0].y, bottomNodesLeft[0].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[topNodesRight[0].x, topNodesRight[0].y, topNodesRight[0].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomNodesRight[0].x, bottomNodesRight[0].y, bottomNodesRight[0].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      {/* Plates at truss end (ridge) */}
      <mesh position={[topNodesLeft[topNodesLeft.length - 1].x, topNodesLeft[topNodesLeft.length - 1].y, topNodesLeft[topNodesLeft.length - 1].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomNodesLeft[bottomNodesLeft.length - 1].x, bottomNodesLeft[bottomNodesLeft.length - 1].y, bottomNodesLeft[bottomNodesLeft.length - 1].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[topNodesRight[topNodesRight.length - 1].x, topNodesRight[topNodesRight.length - 1].y, topNodesRight[topNodesRight.length - 1].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomNodesRight[bottomNodesRight.length - 1].x, bottomNodesRight[bottomNodesRight.length - 1].y, bottomNodesRight[bottomNodesRight.length - 1].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
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
