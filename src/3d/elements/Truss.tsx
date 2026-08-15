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
  const { chordSegments, webMembers, topNodesLeft, topNodesRight } = useMemo(() => {
    // Top chord nodes at purlin positions (numPanels+1 nodes)
    const numPanels = Math.max(3, Math.round(effectiveHalfSpan / purlinSpacing));

    const topNL: THREE.Vector3[] = [];
    const topNR: THREE.Vector3[] = [];

    for (let i = 0; i <= numPanels; i++) {
      const t = i / numPanels;

      // Left slope
      const zLeft = trussStartOffset + t * effectiveHalfSpan;
      const yTopLeft = wallHeight + (zLeft - columnFlangeOffset) * Math.tan(roofAngleRad);
      topNL.push(new THREE.Vector3(x, yTopLeft, zLeft));

      // Right slope
      const zRight = (span - trussStartOffset) - t * effectiveHalfSpan;
      const yTopRight = wallHeight + ((span - columnFlangeOffset) - zRight) * Math.tan(roofAngleRad);
      topNR.push(new THREE.Vector3(x, yTopRight, zRight));
    }

    // Bottom chord nodes OFFSET by half panel (between top nodes)
    // numPanels bottom nodes (one between each pair of top nodes)
    const bottomNL: THREE.Vector3[] = [];
    const bottomNR: THREE.Vector3[] = [];

    for (let i = 0; i < numPanels; i++) {
      const t = (i + 0.5) / numPanels;

      // Left slope
      const zLeft = trussStartOffset + t * effectiveHalfSpan;
      const yTopLeft = wallHeight + (zLeft - columnFlangeOffset) * Math.tan(roofAngleRad);
      const yBottomLeft = yTopLeft - trussHeight;
      bottomNL.push(new THREE.Vector3(x, yBottomLeft, zLeft));

      // Right slope
      const zRight = (span - trussStartOffset) - t * effectiveHalfSpan;
      const yTopRight = wallHeight + ((span - columnFlangeOffset) - zRight) * Math.tan(roofAngleRad);
      const yBottomRight = yTopRight - trussHeight;
      bottomNR.push(new THREE.Vector3(x, yBottomRight, zRight));
    }

    // Chord segments
    const segments: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Top chord segments (consecutive top nodes)
    for (let i = 0; i < topNL.length - 1; i++) {
      segments.push({ start: topNL[i], end: topNL[i + 1] });
    }
    for (let i = 0; i < topNR.length - 1; i++) {
      segments.push({ start: topNR[i], end: topNR[i + 1] });
    }

    // Bottom chord: single segment from first to last bottom node
    if (bottomNL.length > 1) {
      segments.push({ start: bottomNL[0], end: bottomNL[bottomNL.length - 1] });
    }
    if (bottomNR.length > 1) {
      segments.push({ start: bottomNR[0], end: bottomNR[bottomNR.length - 1] });
    }

    // Web members: /\ pattern meeting at top nodes (under purlins)
    const webs: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Left slope
    // First: from top[0] down to bottom[0]
    webs.push({ start: topNL[0], end: bottomNL[0] });
    // Pairs meeting at top nodes
    for (let i = 1; i <= numPanels; i++) {
      // bottom[i-1] goes UP to top[i]
      webs.push({ start: bottomNL[i - 1], end: topNL[i] });
      // bottom[i] goes UP to top[i] (if exists)
      if (i < numPanels) {
        webs.push({ start: bottomNL[i], end: topNL[i] });
      }
    }
    // Last: bottom[last] up to top[last]
    webs.push({ start: bottomNL[bottomNL.length - 1], end: topNL[topNL.length - 1] });

    // Right slope
    webs.push({ start: topNR[0], end: bottomNR[0] });
    for (let i = 1; i <= numPanels; i++) {
      webs.push({ start: bottomNR[i - 1], end: topNR[i] });
      if (i < numPanels) {
        webs.push({ start: bottomNR[i], end: topNR[i] });
      }
    }
    webs.push({ start: bottomNR[bottomNR.length - 1], end: topNR[topNR.length - 1] });

    return {
      chordSegments: segments,
      webMembers: webs,
      topNodesLeft: topNL,
      bottomNodesLeft: bottomNL,
      topNodesRight: topNR,
      bottomNodesRight: bottomNR,
    };
  }, [x, wallHeight, span, effectiveHalfSpan, trussStartOffset, columnFlangeOffset, roofAngleRad, trussHeight, purlinSpacing]);

  const bottomStartLeft = new THREE.Vector3(topNodesLeft[0].x, topNodesLeft[0].y - trussHeight, topNodesLeft[0].z);
  const bottomEndLeft = new THREE.Vector3(topNodesLeft[topNodesLeft.length-1].x, topNodesLeft[topNodesLeft.length-1].y - trussHeight, topNodesLeft[topNodesLeft.length-1].z);
  const bottomStartRight = new THREE.Vector3(topNodesRight[0].x, topNodesRight[0].y - trussHeight, topNodesRight[0].z);
  const bottomEndRight = new THREE.Vector3(topNodesRight[topNodesRight.length-1].x, topNodesRight[topNodesRight.length-1].y - trussHeight, topNodesRight[topNodesRight.length-1].z);

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
      <mesh position={[bottomStartLeft.x, bottomStartLeft.y, bottomStartLeft.z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[topNodesRight[0].x, topNodesRight[0].y, topNodesRight[0].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomStartRight.x, bottomStartRight.y, bottomStartRight.z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      {/* Plates at truss end (ridge) */}
      <mesh position={[topNodesLeft[topNodesLeft.length - 1].x, topNodesLeft[topNodesLeft.length - 1].y, topNodesLeft[topNodesLeft.length - 1].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomEndLeft.x, bottomEndLeft.y, bottomEndLeft.z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[topNodesRight[topNodesRight.length - 1].x, topNodesRight[topNodesRight.length - 1].y, topNodesRight[topNodesRight.length - 1].z]} castShadow receiveShadow material={plateMaterial}>
        <boxGeometry args={[plateSize, plateSize, 0.015]} />
      </mesh>
      <mesh position={[bottomEndRight.x, bottomEndRight.y, bottomEndRight.z]} castShadow receiveShadow material={plateMaterial}>
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
