import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bracingMaterial } from '../materials';

interface CrossBracingProps {
  wallHeight: number;
  span: number;
  roofAngle: number;
  ridgeHeight: number;
  columnSpacing: number;
  numberOfFrames: number;
  hallLength: number;
  bracingDiameter: number; // mm
}

/**
 * Diagonal X-bracing with round bars in first and last bay
 * on both roof slopes and side walls.
 */
export const CrossBracing = React.memo(function CrossBracing({
  wallHeight,
  span,
  roofAngle,
  ridgeHeight,
  columnSpacing,
  numberOfFrames,
  hallLength,
  bracingDiameter,
}: CrossBracingProps) {
  const radius = (bracingDiameter / 1000) / 2;

  const braces = useMemo(() => {
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    const firstBayStart = 0;
    const firstBayEnd = columnSpacing;
    const lastBayStart = hallLength - columnSpacing;
    const lastBayEnd = hallLength;

    const bays = [
      [firstBayStart, firstBayEnd],
      [lastBayStart, lastBayEnd],
    ];

    // Wall bracing - both side walls, split at wallHeight/2 (girt level)
    const girtLevel = wallHeight / 2;
    for (const [bayX0, bayX1] of bays) {
      // Z=0 side wall - bottom half (0 to girtLevel)
      result.push({
        start: new THREE.Vector3(bayX0, 0, 0),
        end: new THREE.Vector3(bayX1, girtLevel, 0),
      });
      result.push({
        start: new THREE.Vector3(bayX1, 0, 0),
        end: new THREE.Vector3(bayX0, girtLevel, 0),
      });
      // Z=0 side wall - top half (girtLevel to wallHeight)
      result.push({
        start: new THREE.Vector3(bayX0, girtLevel, 0),
        end: new THREE.Vector3(bayX1, wallHeight, 0),
      });
      result.push({
        start: new THREE.Vector3(bayX1, girtLevel, 0),
        end: new THREE.Vector3(bayX0, wallHeight, 0),
      });
      // Z=span side wall - bottom half (0 to girtLevel)
      result.push({
        start: new THREE.Vector3(bayX0, 0, span),
        end: new THREE.Vector3(bayX1, girtLevel, span),
      });
      result.push({
        start: new THREE.Vector3(bayX1, 0, span),
        end: new THREE.Vector3(bayX0, girtLevel, span),
      });
      // Z=span side wall - top half (girtLevel to wallHeight)
      result.push({
        start: new THREE.Vector3(bayX0, girtLevel, span),
        end: new THREE.Vector3(bayX1, wallHeight, span),
      });
      result.push({
        start: new THREE.Vector3(bayX1, girtLevel, span),
        end: new THREE.Vector3(bayX0, wallHeight, span),
      });
    }

    // Roof bracing - both slopes, first and last bay
    const halfSpan = span / 2;

    for (const [bayX0, bayX1] of bays) {
      // Left roof slope - bracing along the slope
      const leftZ0 = 0;
      const leftZ1 = halfSpan;
      const leftY0 = wallHeight;
      const leftY1 = ridgeHeight;
      // Approximate: brace corners on left slope
      result.push({
        start: new THREE.Vector3(bayX0, leftY0, leftZ0),
        end: new THREE.Vector3(bayX1, (leftY0 + leftY1) / 2, (leftZ0 + leftZ1) / 2),
      });
      result.push({
        start: new THREE.Vector3(bayX1, leftY0, leftZ0),
        end: new THREE.Vector3(bayX0, (leftY0 + leftY1) / 2, (leftZ0 + leftZ1) / 2),
      });

      // Right roof slope
      const rightZ0 = span;
      const rightZ1 = halfSpan;
      const rightY0 = wallHeight;
      const rightY1 = ridgeHeight;
      result.push({
        start: new THREE.Vector3(bayX0, rightY0, rightZ0),
        end: new THREE.Vector3(bayX1, (rightY0 + rightY1) / 2, (rightZ0 + rightZ1) / 2),
      });
      result.push({
        start: new THREE.Vector3(bayX1, rightY0, rightZ0),
        end: new THREE.Vector3(bayX0, (rightY0 + rightY1) / 2, (rightZ0 + rightZ1) / 2),
      });
    }

    return result;
  }, [wallHeight, span, roofAngle, ridgeHeight, columnSpacing, numberOfFrames, hallLength]);

  return (
    <group name="cross-bracing">
      {braces.map((brace, i) => (
        <BracingRod
          key={i}
          start={brace.start}
          end={brace.end}
          radius={radius}
        />
      ))}
    </group>
  );
});

interface BracingRodProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

function BracingRod({ start, end, radius }: BracingRodProps) {
  const { position, rotation, rodLength } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const len = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Align cylinder (Y-axis default) with the direction
    const dir = direction.normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      rodLength: len,
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
      <cylinderGeometry args={[radius, radius, rodLength, 8]} />
    </mesh>
  );
}
