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
}

/**
 * Renders parallel chord trusses for span > 18m.
 * Each frame has a truss spanning the full width.
 * - Top chord follows the roof slope (on both sides)
 * - Bottom chord is PARALLEL to the top chord, offset down by trussHeight
 * - Web members: V-pattern diagonals with vertical members (Pratt/Warren style)
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
    // Panel size: approximately 2m along slope
    const panelTargetSize = 2.0;
    const slopeLength = effectiveHalfSpan / Math.cos(roofAngleRad);
    const numPanelsPerSlope = Math.max(3, Math.round(slopeLength / panelTargetSize));

    // Generate nodes along each slope
    // Left slope: Z goes from trussStartOffset (after starters) to span/2 (ridge)
    // Right slope: Z goes from span - trussStartOffset (after starters) to span/2 (ridge)
    const topNodesLeft: THREE.Vector3[] = [];
    const bottomNodesLeft: THREE.Vector3[] = [];
    const topNodesRight: THREE.Vector3[] = [];
    const bottomNodesRight: THREE.Vector3[] = [];

    for (let i = 0; i <= numPanelsPerSlope; i++) {
      const t = i / numPanelsPerSlope;

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

    // Bottom chord segments
    for (let i = 0; i < bottomNodesLeft.length - 1; i++) {
      segments.push({ start: bottomNodesLeft[i], end: bottomNodesLeft[i + 1] });
    }
    for (let i = 0; i < bottomNodesRight.length - 1; i++) {
      segments.push({ start: bottomNodesRight[i], end: bottomNodesRight[i + 1] });
    }

    // Web members - V pattern with vertical members
    const webs: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Left slope web members - alternating V pattern
    for (let i = 0; i < numPanelsPerSlope; i++) {
      if (i % 2 === 0) {
        // Even panel: diagonal from bottom-left to top-right (/)
        webs.push({ start: bottomNodesLeft[i], end: topNodesLeft[i + 1] });
      } else {
        // Odd panel: diagonal from top-left to bottom-right (\)
        webs.push({ start: topNodesLeft[i], end: bottomNodesLeft[i + 1] });
      }
    }

    // Left slope vertical members (interior nodes only)
    for (let i = 1; i < numPanelsPerSlope; i++) {
      webs.push({ start: bottomNodesLeft[i], end: topNodesLeft[i] });
    }

    // Right slope web members - alternating V pattern
    for (let i = 0; i < numPanelsPerSlope; i++) {
      if (i % 2 === 0) {
        // Even panel: diagonal from bottom-left to top-right (/)
        webs.push({ start: bottomNodesRight[i], end: topNodesRight[i + 1] });
      } else {
        // Odd panel: diagonal from top-left to bottom-right (\)
        webs.push({ start: topNodesRight[i], end: bottomNodesRight[i + 1] });
      }
    }

    // Right slope vertical members (interior nodes only)
    for (let i = 1; i < numPanelsPerSlope; i++) {
      webs.push({ start: bottomNodesRight[i], end: topNodesRight[i] });
    }

    return {
      chordSegments: segments,
      webMembers: webs,
    };
  }, [x, wallHeight, span, effectiveHalfSpan, trussStartOffset, columnFlangeOffset, roofAngleRad, trussHeight]);

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
